const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification: ElectronNotification } = require('electron');
const path = require('path');
const os = require('os');
const { startVpnServer, stopVpnServer, convertToVpnUrl, addHost, removeHost, getHosts, setHosts } = require('../modules/vpn-door');
const { DrcomClient } = require('../modules/drcom');
const { ScheduleStore } = require('../modules/schedule');
const { StudyAtJluClient } = require('../modules/study-at-jlu');
const { CourseGrabClient } = require('../modules/course-grab');
const { LibSeatClient } = require('../modules/libseat');
const { NotificationCrawler } = require('../modules/notification');
const { AutoStartManager } = require('../modules/autostart');
const { CampusCardClient } = require('../modules/campus-card');
const { CafeteriaClient } = require('../modules/cafeteria');
const { ShuttleBusClient } = require('../modules/shuttle-bus');
const { GradeClient } = require('../modules/grade');
const { ExamClient } = require('../modules/exam');
const { GraduationTracker } = require('../modules/graduation');
const { CampusMapClient } = require('../modules/campus-map');
const { EmptyClassroomClient } = require('../modules/empty-classroom');
const { DeliveryClient } = require('../modules/delivery');
const { CourseReviewClient } = require('../modules/course-review');
const { WeatherClient } = require('../modules/weather');
const { PomodoroTimer } = require('../modules/pomodoro');
const { ScheduleShareClient } = require('../modules/schedule-share');
const { CalendarSyncClient } = require('../modules/calendar-sync');
const { EduSystemAdapter } = require('../modules/edu-system');
const { CredentialManager } = require('../modules/credentials');
const { ThemeManager } = require('../modules/theme');

let mainWindow;
let tray;
let drcomClient = null;
let vpnServerRunning = false;
let scheduleStore;

// Simple JSON store for persistent settings
const settingsStore = {
  _data: {},
  _loaded: false,
  _load() {
    if (this._loaded) return;
    try {
      const fs = require('fs');
      const p = path.join(app.getPath('userData'), 'jlu-lifekit', 'settings.json');
      if (fs.existsSync(p)) {
        this._data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (e) { /* ignore */ }
    this._loaded = true;
  },
  get(key) {
    this._load();
    return this._data[key];
  },
  set(key, value) {
    this._load();
    this._data[key] = value;
    try {
      const fs = require('fs');
      const p = path.join(app.getPath('userData'), 'jlu-lifekit', 'settings.json');
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(this._data, null, 2));
    } catch (e) { /* ignore */ }
  }
};

let notificationCrawler;
let autoStartManager;
let campusCardClient;
let cafeteriaClient;
let shuttleBusClient;
let gradeClient;
let examClient;
let graduationTracker;
let campusMapClient;
let emptyClassroomClient;
let deliveryClient;
let courseReviewClient;
let weatherClient;
let pomodoroTimer;
let scheduleShareClient;
let calendarSyncClient;
let eduAdapter;
let credManager;
let themeManager;

let _lastNotifData = null; // stores the last notification for click handling

// ─── Windows Toast Notification ───────────────────────────────
function sendToast(title, body, tag, notifData) {
  if (!ElectronNotification.isSupported()) return;
  const notif = new ElectronNotification({
    title,
    body: body?.substring(0, 200) || '',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    silent: false,
    timeoutType: 'default',
    tag: tag || 'jlu-lifekit',
  });
  if (notifData) _lastNotifData = notifData;
  notif.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
    // Navigate to notification page
    mainWindow?.webContents.send('navigate', 'notification');
    // Send the notification data to show detail popup
    if (_lastNotifData) {
      mainWindow?.webContents.send('notification:showDetail', _lastNotifData);
    }
  });
  notif.show();
}

// ─── System Tray ────────────────────────────────────────────
function createTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
    const nImage = nativeImage.createFromPath(iconPath);
    // Resize to 16x16 for tray
    const trayImage = nImage.resize({ width: 16, height: 16 });
    tray = new Tray(trayImage);
    tray.setToolTip('吉大生活+');
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示窗口', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: 'separator' },
      {
        label: '退出', click: () => {
          const eb = settingsStore.get('exitBehavior');
          if (eb === 'quit') app.quit();
          else { app.isQuitting = true; app.quit(); }
        }
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (e) {
    console.error('Tray creation failed:', e.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1923',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Start system theme sync
  themeManager.startSystemSync(mainWindow);
}

// ─── IPC: Window Controls ───────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => {
  const exitBehavior = settingsStore.get('exitBehavior');
  if (exitBehavior === 'quit') {
    app.quit();
  } else {
    mainWindow?.hide();
  }
});

// ─── IPC: VPN Door ──────────────────────────────────────────────────
ipcMain.handle('vpn:start', async (_e, { port, mode }) => {
  try {
    const result = await startVpnServer(port || 8080, mode || 'redirect');
    vpnServerRunning = true;
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('vpn:stop', async () => {
  try {
    await stopVpnServer();
    vpnServerRunning = false;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('vpn:convert', (_e, { url }) => {
  if (!url) return { ok: false, error: 'URL is required' };
  return { ok: true, vpnUrl: convertToVpnUrl(url) };
});

ipcMain.handle('vpn:addHost', (_e, domain) => { addHost(domain); return { ok: true, hosts: getHosts() }; });
ipcMain.handle('vpn:removeHost', (_e, domain) => { removeHost(domain); return { ok: true, hosts: getHosts() }; });
ipcMain.handle('vpn:getHosts', () => getHosts());

// ─── IPC: DrCOM ─────────────────────────────────────────────────────
ipcMain.handle('drcom:login', async (_e, { server, username, password, mac }) => {
  try {
    if (!drcomClient) drcomClient = new DrcomClient();
    const result = await drcomClient.login({ server, username, password, mac });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('drcom:logout', async () => {
  try {
    if (drcomClient) {
      await drcomClient.logout();
      drcomClient = null;
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('drcom:status', async () => {
  return { loggedIn: drcomClient?.loggedIn || false, info: drcomClient?.info || null };
});

// ─── IPC: Schedule ──────────────────────────────────────────────────
ipcMain.handle('schedule:getAll', () => scheduleStore.getAll());
ipcMain.handle('schedule:getCurrent', () => scheduleStore.getCurrent());
ipcMain.handle('schedule:setCurrent', (_e, id) => scheduleStore.setCurrent(id));
ipcMain.handle('schedule:create', (_e, data) => scheduleStore.create(data));
ipcMain.handle('schedule:update', (_e, { id, data }) => scheduleStore.update(id, data));
ipcMain.handle('schedule:delete', (_e, id) => scheduleStore.delete(id));
ipcMain.handle('schedule:importFromWeb', async (_e, { semesterStart, courses }) => {
  return scheduleStore.importFromParsed(semesterStart, courses);
});

// ─── IPC: StudyAtJlu ────────────────────────────────────────────────
ipcMain.handle('study:getCourses', async (_e, { username, password }) => {
  try {
    const client = new StudyAtJluClient();
    const courses = await client.getCourses({ username, password });
    return { ok: true, courses };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('study:getVideos', async (_e, { username, password, courseId }) => {
  try {
    const client = new StudyAtJluClient();
    const videos = await client.getVideos({ username, password, courseId });
    return { ok: true, videos };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('study:download', async (_e, { url, savePath }) => {
  shell.openExternal(url);
  return { ok: true, message: '已在浏览器中打开下载链接' };
});

// ─── IPC: CourseGrab ────────────────────────────────────────────────
ipcMain.handle('course:start', async (_e, config) => {
  try {
    const client = new CourseGrabClient();
    const result = await client.start(config);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('course:stop', async () => {
  try {
    CourseGrabClient.stopAll();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ─── IPC: LibSeat ───────────────────────────────────────────────────
ipcMain.handle('libseat:getSeats', async (_e, { floor, date, timeSlot }) => {
  try {
    const client = new LibSeatClient();
    const seats = await client.getSeats({ floor, date, timeSlot });
    return { ok: true, seats };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('libseat:reserve', async (_e, config) => {
  try {
    const client = new LibSeatClient();
    const result = await client.reserve(config);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('libseat:autoReserve', async (_e, config) => {
  try {
    const client = new LibSeatClient();
    const result = await client.autoReserve(config);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ─── IPC: Notifications (Reachee-style) ───────────────────────────
ipcMain.handle('notification:start', async () => {
  try {
    await notificationCrawler.start();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('notification:stop', async () => {
  notificationCrawler.stop();
  return { ok: true };
});

ipcMain.handle('notification:checkNow', async () => {
  return await notificationCrawler.checkNow();
});

ipcMain.handle('notification:getConfig', () => {
  return notificationCrawler.getConfig();
});

ipcMain.handle('notification:updateConfig', (_e, config) => {
  notificationCrawler.updateConfig(config);
  return { ok: true };
});

ipcMain.handle('notification:test', () => {
  sendToast('JLU LifeKit 测试通知', '这是一条测试通知，点击可打开主窗口。', 'test');
  return { ok: true };
});

// ─── IPC: AutoStart ────────────────────────────────────────────────
ipcMain.handle('autostart:getConfig', () => {
  return autoStartManager.getConfig();
});

ipcMain.handle('autostart:setEnabled', (_e, enabled) => {
  return autoStartManager.setEnabled(enabled);
});

ipcMain.handle('autostart:setHiddenStart', (_e, hidden) => {
  autoStartManager.setHiddenStart(hidden);
  return { ok: true, hidden };
});

// ─── IPC: Campus Card ─────────────────────────────────────────────
ipcMain.handle('card:getBalance', async (_e, config) => {
  try { return { ok: true, ...await campusCardClient.getBalance(config) }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('card:getTransactions', async (_e, config) => {
  try { return { ok: true, transactions: await campusCardClient.getTransactions(config) }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// ─── IPC: Cafeteria ───────────────────────────────────────────────
ipcMain.handle('cafeteria:getList', () => cafeteriaClient.getCafeterias());
ipcMain.handle('cafeteria:getCrowd', (_e, id) => cafeteriaClient.getCrowdLevel(id));
ipcMain.handle('cafeteria:getMenu', (_e, id) => cafeteriaClient.getMenu(id));

// ─── IPC: Shuttle Bus ────────────────────────────────────────────
ipcMain.handle('bus:getRoutes', () => shuttleBusClient.getRoutes());
ipcMain.handle('bus:getSchedule', (_e, routeId) => shuttleBusClient.getSchedule(routeId));
ipcMain.handle('bus:getNext', (_e, routeId) => shuttleBusClient.getNextBus(routeId));

// ─── IPC: Grades ─────────────────────────────────────────────────
ipcMain.handle('grade:get', async (_e, config) => {
  try { return { ok: true, grades: await gradeClient.getGrades(config) }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('grade:calcGPA', (_e, courses) => gradeClient.calculateGPA(courses));
ipcMain.handle('grade:getDistribution', (_e, courses) => gradeClient.getDistribution(courses));

// ─── IPC: Exams ──────────────────────────────────────────────────
ipcMain.handle('exam:get', async (_e, config) => {
  try { return { ok: true, exams: await examClient.getExams(config) }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('exam:getCountdowns', (_e, exams) => examClient.getCountdowns(exams));

// ─── IPC: Graduation ─────────────────────────────────────────────
ipcMain.handle('grad:getTemplates', () => graduationTracker.getTemplates());
ipcMain.handle('grad:analyze', (_e, { templateId, courses }) => graduationTracker.analyze(templateId, courses));

// ─── IPC: Campus Map ─────────────────────────────────────────────
ipcMain.handle('map:getCampuses', () => campusMapClient.getCampuses());
ipcMain.handle('map:getPlaces', (_e, campusId) => campusMapClient.getPlaces(campusId));
ipcMain.handle('map:search', (_e, keyword) => campusMapClient.search(keyword));
ipcMain.handle('map:getCategories', () => campusMapClient.getCategories());

// ─── IPC: Empty Classroom ────────────────────────────────────────
ipcMain.handle('classroom:get', async (_e, config) => {
  try { return { ok: true, classrooms: await emptyClassroomClient.getClassrooms(config) }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// ─── IPC: Delivery ───────────────────────────────────────────────
ipcMain.handle('delivery:getPoints', () => deliveryClient.getExpressPoints());
ipcMain.handle('delivery:track', async (_e, config) => {
  try { return { ok: true, ...await deliveryClient.track(config) }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('delivery:getCarriers', () => deliveryClient.getCarrierList());

// ─── IPC: Course Review ──────────────────────────────────────────
ipcMain.handle('review:search', (_e, keyword) => courseReviewClient.searchCourses(keyword));
ipcMain.handle('review:get', (_e, courseId) => courseReviewClient.getReviews(courseId));
ipcMain.handle('review:add', (_e, review) => { courseReviewClient.addReview(review); return { ok: true }; });

// ─── IPC: Weather ────────────────────────────────────────────────
ipcMain.handle('weather:get', async (_e, campus) => {
  try { return { ok: true, ...await weatherClient.getWeather(campus) }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// ─── IPC: Pomodoro ───────────────────────────────────────────────
ipcMain.handle('pomo:getStatus', () => pomodoroTimer.getStatus());
ipcMain.handle('pomo:start', (_e, type) => pomodoroTimer.start(type));
ipcMain.handle('pomo:pause', () => pomodoroTimer.pause());
ipcMain.handle('pomo:resume', () => pomodoroTimer.resume());
ipcMain.handle('pomo:stop', () => pomodoroTimer.stop());
ipcMain.handle('pomo:updateConfig', (_e, config) => pomodoroTimer.updateConfig(config));
ipcMain.handle('pomo:addTodo', (_e, data) => pomodoroTimer.addTodo(data));
ipcMain.handle('pomo:updateTodo', (_e, { id, updates }) => pomodoroTimer.updateTodo(id, updates));
ipcMain.handle('pomo:deleteTodo', (_e, id) => { pomodoroTimer.deleteTodo(id); return { ok: true }; });
ipcMain.handle('pomo:toggleTodo', (_e, id) => pomodoroTimer.toggleTodo(id));
ipcMain.handle('pomo:reorderTodo', (_e, { from, to }) => { pomodoroTimer.reorderTodos(from, to); return { ok: true }; });

// ─── IPC: Schedule Share ─────────────────────────────────────────
ipcMain.handle('share:generate', (_e, { courses, options }) => {
  return scheduleShareClient.generateHTML(courses, options);
});

// ─── IPC: Calendar Sync ──────────────────────────────────────────
ipcMain.handle('cal:exportCourses', (_e, { courses, semesterStart, weeks }) => {
  const events = calendarSyncClient.coursesToEvents(courses, semesterStart, weeks);
  const ics = calendarSyncClient.generateICS(events, 'JLU 课程表');
  const filePath = calendarSyncClient.saveICS(ics, 'jlu_courses.ics');
  return { ok: true, filePath, count: events.length };
});
ipcMain.handle('cal:exportExams', (_e, exams) => {
  const events = calendarSyncClient.examsToEvents(exams);
  const ics = calendarSyncClient.generateICS(events, 'JLU 考试安排');
  const filePath = calendarSyncClient.saveICS(ics, 'jlu_exams.ics');
  return { ok: true, filePath, count: events.length };
});
ipcMain.handle('cal:showInFolder', (_e, filePath) => shell.showItemInFolder(filePath));

// ─── IPC: Edu System Sync ─────────────────────────────────────────
ipcMain.handle('edu:login', async (_e, config) => {
  try { return await eduAdapter.login(config); }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('edu:fetchGrades', async () => {
  try { return await eduAdapter.fetchGrades(); }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('edu:fetchSchedule', async (_e, config) => {
  try { return await eduAdapter.fetchSchedule(config || {}); }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('edu:fetchExams', async () => {
  try { return await eduAdapter.fetchExams(); }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('edu:checkAvailability', async () => {
  try { return { ok: true, ...(await eduAdapter.checkAvailability()) }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// ─── IPC: Credentials ────────────────────────────────────────────
ipcMain.handle('cred:get', (_e, system) => credManager.get(system));
ipcMain.handle('cred:set', (_e, { system, username, password, extra }) => {
  credManager.set(system, { username, password, extra });
  return { ok: true };
});
ipcMain.handle('cred:delete', (_e, system) => { credManager.delete(system); return { ok: true }; });
ipcMain.handle('cred:getAll', () => credManager.getAll());
ipcMain.handle('cred:getSystems', () => credManager.getSystems());
ipcMain.handle('cred:has', (_e, system) => credManager.has(system));

// ─── IPC: Theme & Personalization ────────────────────────────────
// ─── Windows Mica / Acrylic Background ─────────────────────────
function isWin11() { return process.platform === 'win32' && parseFloat(os.release()) >= 10.0 && parseFloat(os.release().substring(os.release().lastIndexOf('.') + 1)) >= 22000; }

ipcMain.handle('theme:setMica', async (_e, enabled) => {
  try {
    if (mainWindow && typeof mainWindow.setBackgroundMaterial === 'function') {
      if (enabled && isWin11()) {
        mainWindow.setBackgroundMaterial('mica');
        // Remove fixed background color to let Mica show
        mainWindow.setBackgroundColor('#00000000');
      } else {
        mainWindow.setBackgroundMaterial('none');
        mainWindow.setBackgroundColor('#0f1923');
      }
      return { ok: true };
    }
    return { ok: false, error: 'Unsupported' };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('theme:getBackgroundDataUrl', async (_e, bgId) => {
  try {
    const bgFiles = {
      bg1: 'bg1.png', bg2: 'bg2.jpg', bg3: 'bg3.jpg', bg4: 'bg4.jpg',
      bg5: 'bg5.jpg', bg6: 'bg6.jpeg', bg7: 'bg7.png',
    };
    const file = bgFiles[bgId] || `${bgId}.jpg`;
    const bgPath = path.join(__dirname, '..', 'renderer', 'backgrounds', file);
    const data = await fs.promises.readFile(bgPath);
    const ext = file.split('.').pop();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return { ok: true, dataUrl: `data:${mime};base64,${data.toString('base64')}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('theme:getConfig', () => themeManager ? themeManager.getConfig() : {
  mode: 'system', background: 'none', bgOpacity: 0.15, bgBlur: 20, bgDim: 0.4
});
ipcMain.handle('theme:updateConfig', (_e, patch) => {
  if (themeManager) {
    themeManager.updateConfig(patch);
    // Broadcast change to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('theme:changed', themeManager.getConfig());
    });
  }
});
ipcMain.handle('theme:isDark', () => themeManager ? themeManager.isDark() : false);
ipcMain.handle('theme:getBackgrounds', () => themeManager ? themeManager.getBackgrounds() : []);
ipcMain.handle('theme:pickCustomBg', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  return { ok: true, path: result.filePaths[0] };
});

// ─── IPC: Open Source Credits ────────────────────────────────────
ipcMain.handle('app:getCredits', () => [
  { name: 'jlu-vpns-dokodemo-door', author: 'MerlynAllen', url: 'https://github.com/MerlynAllen/jlu-vpns-dokodemo-door', desc: 'VPN URL 转换', license: 'MIT' },
  { name: 'drcom-jlu-qt', author: 'code4lala', url: 'https://github.com/code4lala/drcom-jlu-qt', desc: 'DrCOM 校园网认证', license: 'GPL-3.0' },
  { name: 'JLU_schedule', author: 'JFyuhong', url: 'https://github.com/JFyuhong/JLU_schedule', desc: '吉林大学课表', license: 'MIT' },
  { name: 'StudyAtJLU_Desktop', author: 'RikaCelery', url: 'https://github.com/RikaCelery/StudyAtJLU_Desktop', desc: '学在吉大桌面客户端', license: 'MIT' },
  { name: 'JLUiCourse', author: 'wzyyyyyyy', url: 'https://github.com/wzyyyyyyy/JLUiCourse', desc: '自动抢课助手', license: 'MIT' },
  { name: 'JLU LibSeat PC Wide', author: 'flash122u', url: 'https://github.com/flash122u/jlu-libseat-pc-wide', desc: '图书馆座位预约增强', license: 'MIT' },
  { name: 'Reachee', author: 'TechCiel', url: 'https://github.com/TechCiel/Reachee', desc: 'OA 通知爬虫', license: 'WTFPL' },
  { name: 'Open-JLU', author: 'userElaina', url: 'https://github.com/userElaina/Open-JLU', desc: 'JLU 开源项目汇总', license: 'MIT' },
  { name: 'IconPark', author: 'ByteDance', url: 'https://github.com/bytedance/IconPark', desc: '2600+ 高质量 SVG 图标库', license: 'Apache-2.0' },
  { name: 'Open-Meteo', author: 'Open-Meteo', url: 'https://open-meteo.com', desc: '开源天气 API', license: 'CC-BY-4.0' },
  { name: 'Electron', author: 'OpenJS Foundation', url: 'https://www.electronjs.org', desc: '跨平台桌面应用框架', license: 'MIT' },
  { name: 'Node.js', author: 'OpenJS Foundation', url: 'https://nodejs.org', desc: 'JavaScript 运行时', license: 'MIT' },
]);

// ─── IPC: Dev Log (main → renderer) ─────────────────────────────
ipcMain.on('log:info', (_e, { mod, msg, data }) => { if (mainWindow) mainWindow.webContents.send('log:entry', { level: 1, module: mod, message: msg, data, time: new Date() }); });
ipcMain.on('log:warn', (_e, { mod, msg, data }) => { if (mainWindow) mainWindow.webContents.send('log:entry', { level: 2, module: mod, message: msg, data, time: new Date() }); });
ipcMain.on('log:error', (_e, { mod, msg, data }) => { if (mainWindow) mainWindow.webContents.send('log:entry', { level: 3, module: mod, message: msg, data, time: new Date() }); });

// ─── IPC: App Settings Store (devMode, exitBehavior, etc.) ───────
ipcMain.handle('settings:get', (_e, key) => settingsStore.get(key));
ipcMain.handle('settings:set', (_e, { key, value }) => { settingsStore.set(key, value); });

// ─── IPC: PC Toolbox (Memory info + Optimization) ──────────────
ipcMain.handle('pc:getMemInfo', () => {
  const info = process.getSystemMemoryInfo();
  return { total: info.total * 1024, free: info.free * 1024 };
});

// ─── IPC: PC Toolbox (Memory Optimization via EmptyWorkingSet) ──
const { execFile } = require('child_process');
ipcMain.handle('pc:optimizeMemory', async () => {
  try {
    // Get memory before
    const before = process.getSystemMemoryInfo();
    const usedBefore = before.total - before.free;

    // PowerShell one-liner: call SetProcessWorkingSetSize(-1,-1) on all user processes
    const psScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WinMem {
    [DllImport("kernel32.dll")]
    public static extern int SetProcessWorkingSetSize(IntPtr hProcess, int min, int max);
}
'@;
Get-Process | Where-Object { $_.SessionId -gt 0 -and $_.Id -ne ${"$"}pid } | ForEach-Object {
    try { [WinMem]::SetProcessWorkingSetSize($_.Handle, -1, -1) | Out-Null } catch {}
}
`;
    const psPath = process.env.WINDIR + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    await new Promise((resolve, reject) => {
      const child = execFile(psPath, ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 15000, windowsHide: true },
        (err) => { if (err && !err.killed) reject(err); else resolve(); }
      );
    });

    // Get memory after
    const after = process.getSystemMemoryInfo();
    const usedAfter = after.total - after.free;
    const freedKB = usedBefore - usedAfter;
    const freeKB = after.free;

    // Send Windows notification
    const freedMB = (freedKB / 1024).toFixed(1);
    const freeMB = (freeKB / 1024).toFixed(1);
    sendToast(
      '内存优化完成',
      `释放了 ${freedMB} MB · 当前可用 ${freeMB} MB`,
      'jlu-memopt',
      { title: '内存优化完成', content: `释放了 ${freedMB} MB，当前可用 ${freeMB} MB`, time: new Date().toLocaleString('zh-CN'), dept: 'PC 百宝箱' }
    );

    return {
      ok: true,
      before: usedBefore * 1024,
      after: usedAfter * 1024,
      freed: freedKB * 1024,
      remaining: freeKB * 1024,
      total: before.total * 1024
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─── App Lifecycle ──────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // ─── Initialize all modules (after app is ready) ──────────
    notificationCrawler = new NotificationCrawler(settingsStore);
    autoStartManager = new AutoStartManager(settingsStore);
    campusCardClient = new CampusCardClient();
    cafeteriaClient = new CafeteriaClient();
    shuttleBusClient = new ShuttleBusClient();
    gradeClient = new GradeClient();
    examClient = new ExamClient();
    graduationTracker = new GraduationTracker();
    campusMapClient = new CampusMapClient();
    emptyClassroomClient = new EmptyClassroomClient();
    deliveryClient = new DeliveryClient();
    courseReviewClient = new CourseReviewClient();
    weatherClient = new WeatherClient();
    pomodoroTimer = new PomodoroTimer(settingsStore);
    pomodoroTimer._onComplete = pomodoroTimer._onComplete.bind(pomodoroTimer);
    scheduleShareClient = new ScheduleShareClient();
    calendarSyncClient = new CalendarSyncClient();
    eduAdapter = new EduSystemAdapter();
    credManager = new CredentialManager();
    themeManager = new ThemeManager();
    scheduleStore = new ScheduleStore();

    // Wire up notification crawler to send toasts + push to renderer
    notificationCrawler.onNotification((notif) => {
      sendToast(notif.title, `${notif.dept} · ${notif.time}`, `jlu-notif-${notif.id}`, notif);
      mainWindow?.webContents.send('notification:new', notif);
    });

    createWindow();
    createTray();

    // If launched with --hidden (auto-start), don't show window
    if (process.argv.includes('--hidden')) {
      mainWindow?.hide();
    }

    // Auto-start DrCOM login
    const drcomAutoLogin = settingsStore.get('drcomAutoLogin');
    if (drcomAutoLogin === true) {
      (async () => {
        try {
          const cred = credManager.get('drcom');
          if (cred && cred.username && cred.password) {
            console.log('[AutoLogin] DrCOM 自动登录中...');
            console.log('[AutoLogin] 用户名:', cred.username);
            if (!drcomClient) drcomClient = new DrcomClient();
            const result = await drcomClient.login({
              server: cred.server || '10.10.10.10',
              username: cred.username,
              password: cred.password,
              mac: cred.mac || '',
            });
            if (result && result.info) {
              console.log('[AutoLogin] DrCOM 登录成功:', result.info.username);
              sendToast('校园网自动登录', `已自动登录 ${result.info.username}`, 'jlu-drcom-auto');
            }
          } else {
            console.warn('[AutoLogin] DrCOM 自动登录跳过：未保存凭据');
          }
        } catch (e) {
          console.error('[AutoLogin] DrCOM 自动登录失败:', e.message);
        }
      })();
    }

    // Auto-start notification crawler if it was enabled (legacy) or notifMonitor setting is on
    const notifMonitorSetting = settingsStore.get('notifMonitor');
    if (notificationCrawler.config.enabled || notifMonitorSetting === true) {
      // Also update the crawler config to match
      if (notifMonitorSetting === true && !notificationCrawler.config.enabled) {
        notificationCrawler.updateConfig({ enabled: true });
      }
      notificationCrawler.start().catch(e =>
        console.error('[AutoStart] Notification crawler failed:', e.message)
      );
      console.log('[AutoStart] Notification monitor started automatically');
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else mainWindow?.show();
    });
  });
}

app.on('window-all-closed', (e) => {
  // Keep running in tray on Windows/Linux unless exit behavior is 'quit'
  if (process.platform !== 'darwin') {
    const exitBehavior = settingsStore.get('exitBehavior');
    if (exitBehavior === 'quit') {
      app.quit();
    } else {
      e.preventDefault?.();
      mainWindow?.hide();
    }
  }
});

app.on('before-quit', () => {
  notificationCrawler?.stop();
  if (drcomClient) drcomClient.logout().catch(() => {});
  stopVpnServer().catch(() => {});
});
