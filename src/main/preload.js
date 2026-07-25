const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jlu', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // VPN Door
  vpn: {
    start: (port, mode) => ipcRenderer.invoke('vpn:start', { port, mode }),
    stop: () => ipcRenderer.invoke('vpn:stop'),
    convert: (url) => ipcRenderer.invoke('vpn:convert', { url }),
    addHost: (domain) => ipcRenderer.invoke('vpn:addHost', domain),
    removeHost: (domain) => ipcRenderer.invoke('vpn:removeHost', domain),
    getHosts: () => ipcRenderer.invoke('vpn:getHosts'),
  },

  // DrCOM
  drcom: {
    login: (config) => ipcRenderer.invoke('drcom:login', config),
    logout: () => ipcRenderer.invoke('drcom:logout'),
    status: () => ipcRenderer.invoke('drcom:status'),
  },

  // Schedule
  schedule: {
    getAll: () => ipcRenderer.invoke('schedule:getAll'),
    getCurrent: () => ipcRenderer.invoke('schedule:getCurrent'),
    setCurrent: (id) => ipcRenderer.invoke('schedule:setCurrent', id),
    create: (data) => ipcRenderer.invoke('schedule:create', data),
    update: (id, data) => ipcRenderer.invoke('schedule:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('schedule:delete', id),
    importFromWeb: (data) => ipcRenderer.invoke('schedule:importFromWeb', data),
  },

  // StudyAtJlu
  study: {
    getCourses: (config) => ipcRenderer.invoke('study:getCourses', config),
    getVideos: (config) => ipcRenderer.invoke('study:getVideos', config),
    download: (url, savePath) => ipcRenderer.invoke('study:download', { url, savePath }),
  },

  // CourseGrab
  course: {
    start: (config) => ipcRenderer.invoke('course:start', config),
    stop: () => ipcRenderer.invoke('course:stop'),
  },

  // LibSeat
  libseat: {
    getSeats: (config) => ipcRenderer.invoke('libseat:getSeats', config),
    reserve: (config) => ipcRenderer.invoke('libseat:reserve', config),
    autoReserve: (config) => ipcRenderer.invoke('libseat:autoReserve', config),
  },

  // Notifications (Reachee-style OA crawler)
  notification: {
    start: () => ipcRenderer.invoke('notification:start'),
    stop: () => ipcRenderer.invoke('notification:stop'),
    checkNow: () => ipcRenderer.invoke('notification:checkNow'),
    getConfig: () => ipcRenderer.invoke('notification:getConfig'),
    updateConfig: (config) => ipcRenderer.invoke('notification:updateConfig', config),
    test: () => ipcRenderer.invoke('notification:test'),
    onNew: (callback) => {
      const handler = (_event, notif) => callback(notif);
      ipcRenderer.on('notification:new', handler);
      return () => ipcRenderer.removeListener('notification:new', handler);
    },
    onShowDetail: (callback) => {
      const handler = (_event, notif) => callback(notif);
      ipcRenderer.on('notification:showDetail', handler);
      return () => ipcRenderer.removeListener('notification:showDetail', handler);
    },
  },

  // AutoStart
  autostart: {
    getConfig: () => ipcRenderer.invoke('autostart:getConfig'),
    setEnabled: (enabled) => ipcRenderer.invoke('autostart:setEnabled', enabled),
    setHiddenStart: (hidden) => ipcRenderer.invoke('autostart:setHiddenStart', hidden),
  },

  // Campus Card
  card: {
    getBalance: (config) => ipcRenderer.invoke('card:getBalance', config),
    getTransactions: (config) => ipcRenderer.invoke('card:getTransactions', config),
    getDemo: () => ipcRenderer.invoke('card:getDemo'),
  },

  // Cafeteria
  cafeteria: {
    getList: () => ipcRenderer.invoke('cafeteria:getList'),
    getCrowd: (id) => ipcRenderer.invoke('cafeteria:getCrowd', id),
    getMenu: (id) => ipcRenderer.invoke('cafeteria:getMenu', id),
  },

  // Shuttle Bus
  bus: {
    getRoutes: () => ipcRenderer.invoke('bus:getRoutes'),
    getSchedule: (routeId) => ipcRenderer.invoke('bus:getSchedule', routeId),
    getNext: (routeId) => ipcRenderer.invoke('bus:getNext', routeId),
  },

  // Grades
  grade: {
    get: (config) => ipcRenderer.invoke('grade:get', config),
    calcGPA: (courses) => ipcRenderer.invoke('grade:calcGPA', courses),
    getDemo: () => ipcRenderer.invoke('grade:getDemo'),
    getDistribution: (courses) => ipcRenderer.invoke('grade:getDistribution', courses),
  },

  // Exams
  exam: {
    get: (config) => ipcRenderer.invoke('exam:get', config),
    getDemo: () => ipcRenderer.invoke('exam:getDemo'),
    getCountdowns: (exams) => ipcRenderer.invoke('exam:getCountdowns', exams),
  },

  // Graduation
  grad: {
    getTemplates: () => ipcRenderer.invoke('grad:getTemplates'),
    analyze: (templateId, courses) => ipcRenderer.invoke('grad:analyze', { templateId, courses }),
    getDemo: () => ipcRenderer.invoke('grad:getDemo'),
  },

  // Campus Map
  map: {
    getCampuses: () => ipcRenderer.invoke('map:getCampuses'),
    getPlaces: (campusId) => ipcRenderer.invoke('map:getPlaces', campusId),
    search: (keyword) => ipcRenderer.invoke('map:search', keyword),
    getCategories: () => ipcRenderer.invoke('map:getCategories'),
  },

  // Empty Classroom
  classroom: {
    get: (config) => ipcRenderer.invoke('classroom:get', config),
    getDemo: (config) => ipcRenderer.invoke('classroom:getDemo', config),
  },

  // Delivery
  delivery: {
    getPoints: () => ipcRenderer.invoke('delivery:getPoints'),
    track: (config) => ipcRenderer.invoke('delivery:track', config),
    getCarriers: () => ipcRenderer.invoke('delivery:getCarriers'),
  },

  // Course Review
  review: {
    search: (keyword) => ipcRenderer.invoke('review:search', keyword),
    get: (courseId) => ipcRenderer.invoke('review:get', courseId),
    add: (review) => ipcRenderer.invoke('review:add', review),
  },

  // Weather
  weather: {
    get: (campus) => ipcRenderer.invoke('weather:get', campus),
  },

  // Pomodoro + Todo
  pomo: {
    getStatus: () => ipcRenderer.invoke('pomo:getStatus'),
    start: (type, todoId) => ipcRenderer.invoke('pomo:start', type, todoId),
    pause: () => ipcRenderer.invoke('pomo:pause'),
    resume: () => ipcRenderer.invoke('pomo:resume'),
    stop: () => ipcRenderer.invoke('pomo:stop'),
    updateConfig: (config) => ipcRenderer.invoke('pomo:updateConfig', config),
    addTodo: (data) => ipcRenderer.invoke('pomo:addTodo', data),
    updateTodo: (id, updates) => ipcRenderer.invoke('pomo:updateTodo', { id, updates }),
    deleteTodo: (id) => ipcRenderer.invoke('pomo:deleteTodo', id),
    toggleTodo: (id) => ipcRenderer.invoke('pomo:toggleTodo', id),
    reorderTodo: (from, to) => ipcRenderer.invoke('pomo:reorderTodo', { from, to }),
  },

  // Schedule Share
  share: {
    generate: (courses, options) => ipcRenderer.invoke('share:generate', { courses, options }),
  },

  // Calendar Sync
  cal: {
    exportCourses: (courses, semesterStart, weeks) => ipcRenderer.invoke('cal:exportCourses', { courses, semesterStart, weeks }),
    exportExams: (exams) => ipcRenderer.invoke('cal:exportExams', exams),
    showInFolder: (filePath) => ipcRenderer.invoke('cal:showInFolder', filePath),
  },

  // Edu System Sync (official JLU academic system)
  edu: {
    login: (config) => ipcRenderer.invoke('edu:login', config),
    fetchGrades: () => ipcRenderer.invoke('edu:fetchGrades'),
    fetchSchedule: (config) => ipcRenderer.invoke('edu:fetchSchedule', config),
    fetchExams: () => ipcRenderer.invoke('edu:fetchExams'),
    checkAvailability: () => ipcRenderer.invoke('edu:checkAvailability'),
  },

  // Credentials
  cred: {
    get: (system) => ipcRenderer.invoke('cred:get', system),
    set: (system, username, password, extra) => ipcRenderer.invoke('cred:set', { system, username, password, extra }),
    delete: (system) => ipcRenderer.invoke('cred:delete', system),
    getAll: () => ipcRenderer.invoke('cred:getAll'),
    getSystems: () => ipcRenderer.invoke('cred:getSystems'),
    has: (system) => ipcRenderer.invoke('cred:has', system),
  },

  // Theme & Personalization
  theme: {
    getConfig: () => ipcRenderer.invoke('theme:getConfig'),
    getBackgroundDataUrl: (bgId) => ipcRenderer.invoke('theme:getBackgroundDataUrl', bgId),
    setMica: (enabled) => ipcRenderer.invoke('theme:setMica', enabled),
    updateConfig: (patch) => ipcRenderer.invoke('theme:updateConfig', patch),
    isDark: () => ipcRenderer.invoke('theme:isDark'),
    getBackgrounds: () => ipcRenderer.invoke('theme:getBackgrounds'),
    pickCustomBg: () => ipcRenderer.invoke('theme:pickCustomBg'),
    onChanged: (callback) => {
      const handler = (_event, config) => callback(config);
      ipcRenderer.on('theme:changed', handler);
      return () => ipcRenderer.removeListener('theme:changed', handler);
    },
  },

  // PC Toolbox
  pc: {
    getMemInfo: () => ipcRenderer.invoke('pc:getMemInfo'),
    optimizeMemory: () => ipcRenderer.invoke('pc:optimizeMemory'),
  },

  // App-wide Settings Store
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
  },

  // App Info
  app: {
    getCredits: () => ipcRenderer.invoke('app:getCredits'),
  },

  // Navigation events from main process
  onNavigate: (callback) => {
    const handler = (_event, page) => callback(page);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
});
