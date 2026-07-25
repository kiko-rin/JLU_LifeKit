/**
 * 吉大生活+ – Main Renderer (v2.0)
 * Win11 Fluent UI · 18 pages · IconPark SVG icons
 */

// ─── Icon Initialization ────────────────────────────────────────
function initIcons() {
  // Render all [data-icon] elements with SVG
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    const size = parseInt(el.dataset.iconSize) || (
      el.classList.contains('nav-icon') ? 18 :
      el.classList.contains('tb-icon') ? 12 :
      el.classList.contains('btn-icon') ? 14 : 20
    );
    const color = el.dataset.iconColor || 'currentColor';
    el.innerHTML = getIcon(name, size, color);
  });
}

// ─── Toast ───────────────────────────────────────────────────────
const Toast = (() => {
  let c;
  function ensure() { if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); } }
  function show(msg, type = 'info', dur = 3000) {
    ensure();
    const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.style.animation = `toastOut var(--dur-300) var(--ease-accel) forwards`; setTimeout(() => el.remove(), 300); }, dur);
  }
  return { show, success: m => show(m, 'success'), error: m => show(m, 'error'), warn: m => show(m, 'warn'), info: m => show(m, 'info') };
})();

// ─── Theme Engine ───────────────────────────────────────────────
const ThemeEngine = {
  config: null,

  async init() {
    Log.info('ThemeEngine', '初始化主题');
    if (!isDemo()) {
      this.config = await window.jlu.theme.getConfig();
      window.jlu.theme.onChanged?.((cfg) => { this.config = cfg; this.apply(); });
    } else {
      this.config = { mode: 'system', background: 'none', bgOpacity: 0.15, bgBlur: 20, bgDim: 0.4 };
      Log.debug('ThemeEngine', '使用默认主题配置');
    }
    this.apply();
    this.initSettingsUI();
  },

  async apply() {
    if (!this.config) return;
    Log.info('ThemeEngine', '应用主题', { mode: this.config.mode, background: this.config.background });
    const root = document.documentElement;
    let isDark = this.config.mode === 'dark' || (this.config.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Apply card transparency and blur via CSS variables
    const cardAlphaLight = this.config.cardOpacityLight ?? 0.65;
    const cardAlphaDark = this.config.cardOpacityDark ?? 0.85;
    const cardBlur = this.config.cardBlur ?? 20;
    root.style.setProperty('--card-alpha-light', cardAlphaLight);
    root.style.setProperty('--card-alpha-dark', cardAlphaDark);
    root.style.setProperty('--card-blur', cardBlur + 'px');

    const hasBg = this.config.background && this.config.background !== 'none';

    // ─── Toggle Windows Mica vs custom bg layer ──────────────
    if (!isDemo()) {
      try { await window.jlu.theme.setMica(!hasBg); } catch {}
    }
    // Add/remove CSS class for Mica mode
    document.body.classList.toggle('mica-mode', !hasBg);

    const bgLayer = document.getElementById('bg-layer');
    const bgDim = document.getElementById('bg-dim');
    if (bgLayer) {
      if (hasBg) {
        let imageUrl = '';
        if (!isDemo()) {
          Log.info('ThemeEngine', '获取背景图', { id: this.config.background });
          try {
            const result = await window.jlu.theme.getBackgroundDataUrl(this.config.background);
            if (result.ok) imageUrl = result.dataUrl;
          } catch {}
        }
        if (!imageUrl) {
          const base = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
          const bg = ThemeEngine._bgList.find(b => b.id === this.config.background);
          const file = bg ? bg.file : this.config.background + '.jpg';
          imageUrl = base + '/backgrounds/' + file;
        }
        bgLayer.style.backgroundImage = "url('" + imageUrl + "')";
        bgLayer.style.backgroundSize = 'cover';
        bgLayer.style.backgroundPosition = 'center';
        bgLayer.style.backgroundRepeat = 'no-repeat';
        bgLayer.style.opacity = this.config.bgOpacity ?? 0.5;
        bgLayer.style.filter = 'blur(' + (this.config.bgBlur ?? 20) + 'px)';
      } else {
        bgLayer.style.backgroundImage = 'none';
        bgLayer.style.opacity = '0';
      }
    }
    if (bgDim && !hasBg) {
      bgDim.style.backgroundColor = 'transparent';
    } else if (bgDim) {
      const dim = this.config.bgDim ?? 0.4;
      bgDim.style.backgroundColor = isDark ? 'rgba(0,0,0,' + dim + ')' : 'rgba(255,255,255,' + (1 - dim) + ')';
    }
  },

  async update(patch) {
    Log.info('ThemeEngine', '更新主题配置', patch);
    Object.assign(this.config, patch);
    if (!isDemo()) await window.jlu.theme.updateConfig(patch);
    this.apply();
    this.updateSettingsUI();
    Log.info('ThemeEngine', '主题配置已应用');
  },

  initSettingsUI() {
    // Set initial active state for theme mode buttons
    document.querySelectorAll('.theme-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.config.mode);
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        document.querySelectorAll('.theme-mode-btn').forEach(b => b.classList.remove('active'));
        newBtn.classList.add('active');
        ThemeEngine.update({ mode: newBtn.dataset.mode });
      });
    });

    this.renderBgPicker();

    const os = document.getElementById('bg-opacity');
    const bs = document.getElementById('bg-blur');
    const ds = document.getElementById('bg-dim');
    const cl = document.getElementById('card-opacity-light');
    const cd = document.getElementById('card-opacity-dark');
    const cb = document.getElementById('card-blur');
    if (os) {
      os.value = Math.round((this.config.bgOpacity ?? 0.15) * 100);
      document.getElementById('bg-opacity-val').textContent = os.value + '%';
      os.addEventListener('input', () => { document.getElementById('bg-opacity-val').textContent = os.value + '%'; ThemeEngine.update({ bgOpacity: os.value / 100 }); });
    }
    if (bs) {
      bs.value = this.config.bgBlur ?? 20;
      document.getElementById('bg-blur-val').textContent = bs.value + 'px';
      bs.addEventListener('input', () => { document.getElementById('bg-blur-val').textContent = bs.value + 'px'; ThemeEngine.update({ bgBlur: parseInt(bs.value) }); });
    }
    if (ds) {
      ds.value = Math.round((this.config.bgDim ?? 0.4) * 100);
      document.getElementById('bg-dim-val').textContent = ds.value + '%';
      ds.addEventListener('input', () => { document.getElementById('bg-dim-val').textContent = ds.value + '%'; ThemeEngine.update({ bgDim: ds.value / 100 }); });
    }
    if (cl) {
      cl.value = Math.round((this.config.cardOpacityLight ?? 0.65) * 100);
      document.getElementById('card-opacity-light-val').textContent = cl.value + '%';
      cl.addEventListener('input', () => {
        document.getElementById('card-opacity-light-val').textContent = cl.value + '%';
        ThemeEngine.update({ cardOpacityLight: cl.value / 100 });
      });
    }
    if (cd) {
      cd.value = Math.round((this.config.cardOpacityDark ?? 0.85) * 100);
      document.getElementById('card-opacity-dark-val').textContent = cd.value + '%';
      cd.addEventListener('input', () => {
        document.getElementById('card-opacity-dark-val').textContent = cd.value + '%';
        ThemeEngine.update({ cardOpacityDark: cd.value / 100 });
      });
    }
    if (cb) {
      cb.value = this.config.cardBlur ?? 20;
      document.getElementById('card-blur-val').textContent = cb.value + 'px';
      cb.addEventListener('input', () => {
        document.getElementById('card-blur-val').textContent = cb.value + 'px';
        ThemeEngine.update({ cardBlur: parseInt(cb.value) });
      });
    }
    this.updateSettingsUI();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ThemeEngine.config.mode === 'system') ThemeEngine.apply(); });
  },

  // Background file list: id → filename
  _bgList: [
    { id: 'bg1', file: 'bg1.png' },
    { id: 'bg2', file: 'bg2.jpg' },
    { id: 'bg3', file: 'bg3.jpg' },
    { id: 'bg4', file: 'bg4.jpg' },
    { id: 'bg5', file: 'bg5.jpg' },
    { id: 'bg6', file: 'bg6.jpeg' },
    { id: 'bg7', file: 'bg7.png' },
  ],

  renderBgPicker() {
    const picker = document.getElementById('bg-picker');
    if (!picker) return;
    picker.innerHTML = '';
    const noneEl = document.createElement('div');
    noneEl.className = 'bg-thumb' + (this.config.background === 'none' || !this.config.background ? ' active' : '');
    noneEl.textContent = '无';
    noneEl.addEventListener('click', () => {
      picker.querySelectorAll('.bg-thumb').forEach(t => t.classList.remove('active'));
      noneEl.classList.add('active');
      ThemeEngine.update({ background: 'none' });
    });
    picker.appendChild(noneEl);
    ThemeEngine._bgList.forEach(bg => {
      const el = document.createElement('div');
      el.className = 'bg-thumb' + (this.config.background === bg.id ? ' active' : '');
      el.innerHTML = '<img src="backgrounds/' + bg.file + '" draggable="false">';
      el.addEventListener('click', () => {
        picker.querySelectorAll('.bg-thumb').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        ThemeEngine.update({ background: bg.id });
      });
      picker.appendChild(el);
    });
    if (!isDemo()) {
      const c = document.createElement('div');
      c.className = 'bg-thumb' + (this.config.background === 'custom' ? ' active' : '');
      c.textContent = '自定义';
      c.addEventListener('click', async () => {
        picker.querySelectorAll('.bg-thumb').forEach(t => t.classList.remove('active'));
        c.classList.add('active');
        const r = await window.jlu.theme.pickCustomBg();
        if (r.ok) ThemeEngine.update({ background: 'custom', customBgPath: r.path });
      });
      picker.appendChild(c);
    }
  },

  updateSettingsUI() {
    const controls = document.getElementById('bg-controls');
    if (controls) controls.style.display = this.config.background !== 'none' ? '' : 'none';
  },
};

// ─── Navigation ──────────────────────────────────────────────────
const nav = {
  init() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => nav.switchTo(item.dataset.page));
      // Right-click context menu to add to home favorites
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        const label = item.dataset.label || item.querySelector('.nav-label')?.textContent || page;
        homePage.addFavorite(page, label);
      });
    });
  },
  switchTo(page) {
    Log.info('Nav', '页面切换', { page });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`page-${page}`);
    if (el) { el.classList.add('active'); el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; }
  }
};

// ─── Home Page (Dashboard) ──────────────────────────────────────
const homePage = {
  favorites: [],
  init() {
    homePage.loadFavorites();
    homePage.renderWeather();
    homePage.renderNotifications();
    homePage.renderFavorites();
    // Set greeting
    const h = new Date().getHours();
    const greet = h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    $('home-greeting').textContent = `${greet}，欢迎使用 吉大生活+`;
    // Periodic refresh
    setInterval(() => homePage.renderWeather(), 60000);
    setInterval(() => homePage.renderNotifications(), 10000);
  },

  async renderWeather() {
    try {
      const campus = 'south';
      let data;
      if (!isDemo()) {
        data = await window.jlu.weather.get(campus);
      }
      if (!data || data.error) {
        data = { current: { temp: 26, desc: '局部多云' } };
      }
      $('home-weather-temp').textContent = (data.current?.temp ?? '—') + '°C';
      $('home-weather-desc').textContent = data.current?.desc || '—';
    } catch { /* ignore */ }
  },

  renderNotifications() {
    const notifs = notifPage.notifications || [];
    const list = $('home-notif-list');
    if (!list) return;
    $('home-notif-count').textContent = notifs.length;
    if (notifs.length === 0) {
      list.innerHTML = '<div class="notif-empty" style="padding:16px 0;text-align:center">暂无通知</div>';
      return;
    }
    list.innerHTML = '';
    notifs.slice(0, 5).forEach(n => {
      const el = document.createElement('div');
      el.className = 'notif-item ' + (n.read ? '' : 'unread');
      el.style.padding = '8px 0';
      el.style.borderBottom = '1px solid var(--divider)';
      el.innerHTML = `<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.title}</div><div style="font-size:11px;color:var(--text-tertiary)">${n.dept || ''} · ${n.time || ''}</div>`;
      el.addEventListener('click', () => { if (notifPage.showDetail) notifPage.showDetail(n); });
      list.appendChild(el);
    });
  },

  addFavorite(page, label) {
    if (homePage.favorites.some(f => f.page === page)) {
      Toast.info(`"${label}" 已在常用功能中`);
      return;
    }
    homePage.favorites.push({ page, label });
    homePage.saveFavorites();
    homePage.renderFavorites();
    Toast.success(`已添加 "${label}" 到首页`);
  },

  removeFavorite(page) {
    homePage.favorites = homePage.favorites.filter(f => f.page !== page);
    homePage.saveFavorites();
    homePage.renderFavorites();
  },

  saveFavorites() {
    try {
      localStorage.setItem('jlu-home-favs', JSON.stringify(homePage.favorites));
    } catch {}
  },

  loadFavorites() {
    try {
      const saved = localStorage.getItem('jlu-home-favs');
      if (saved) homePage.favorites = JSON.parse(saved);
    } catch { homePage.favorites = []; }
  },

  renderFavorites() {
    const container = $('home-favs');
    if (!container) return;
    $('home-fav-count').textContent = homePage.favorites.length;
    if (homePage.favorites.length === 0) {
      container.innerHTML = '<div class="notif-empty" style="color:var(--text-tertiary)">在侧边栏右键点击功能添加到首页</div>';
      return;
    }
    container.innerHTML = '';
    homePage.favorites.forEach(f => {
      const el = document.createElement('div');
      el.className = 'fav-tile';
      const iconName = ['vpn','drcom','settings'].includes(f.page) ? f.page : 
                       (Icons[f.page] ? f.page : 'star');
      el.innerHTML = `<div class="fav-tile-icon" data-icon="${iconName}" data-icon-size="28"></div><div class="fav-tile-label">${f.label}</div>`;
      el.addEventListener('click', () => nav.switchTo(f.page));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        homePage.removeFavorite(f.page);
        Toast.info(`已从首页移除 "${f.label}"`);
      });
      container.appendChild(el);
    });
    // Re-render icons in fav tiles
    container.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.dataset.icon;
      const fn = Icons[name];
      if (fn) el.innerHTML = fn({ size: parseInt(el.dataset.iconSize) || 28, color: 'currentColor' });
    });
  }
};

// ─── Window Controls ─────────────────────────────────────────────
function initWinCtrl() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.jlu?.window.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.jlu?.window.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.jlu?.window.close());
}

// ─── Helpers ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const isDemo = () => !window.jlu;
let isDevMode = false;

// ═════════════════════════════════════════════════════════════════
// Developer Logger (分级 LOG 系统)
// ═════════════════════════════════════════════════════════════════
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LOG_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const Log = {
  _entries: [],
  _max: 2000,
  _enabled: () => isDevMode,

  debug(mod, msg, data) { this._log(0, mod, msg, data); },
  info(mod, msg, data)  { this._log(1, mod, msg, data); },
  warn(mod, msg, data)  { this._log(2, mod, msg, data); },
  error(mod, msg, data) { this._log(3, mod, msg, data); },

  _log(level, module, message, data) {
    if (!this._enabled() && level < 2) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const entry = {
      time: now,
      timeStr,
      level,
      levelName: LOG_NAMES[level],
      module,
      message,
      data: data || null,
    };
    this._entries.push(entry);
    if (this._entries.length > this._max) this._entries.shift();
    // Console output for dev tools
    const prefix = `[${timeStr}][${entry.levelName}][${module}]`;
    if (level >= 2) console.warn(prefix, message, data || '');
    else console.log(prefix, message, data || '');
    this._notify(entry);
  },

  _listeners: [],
  onEntry(cb) { this._listeners.push(cb); return () => this._listeners = this._listeners.filter(l => l !== cb); },
  _notify(entry) { this._listeners.forEach(l => { try { l(entry); } catch {} }); },

  getEntries(minLevel = 0, filter = '') {
    let entries = this._entries;
    if (minLevel > 0) entries = entries.filter(e => e.level >= minLevel);
    if (filter) { const f = filter.toLowerCase(); entries = entries.filter(e => e.module.toLowerCase().includes(f) || e.message.toLowerCase().includes(f)); }
    return entries;
  },

  clear() { this._entries = []; this._notify(null); },
};

// Start listening for main process logs
if (!isDemo()) {
  window.jlu?.log?.onLog?.((entry) => {
    Log._log(entry.level, entry.module, entry.message, entry.data);
  });
}

// ─── Modal Helper ──────────────────────────────────────────────
const Modal = {
  _activeCallback: null,
  show(title, { username = '', password = '', showExtra = false } = {}) {
    $('cred-modal-title').textContent = title;
    $('cred-modal-username').value = username;
    $('cred-modal-password').value = password;
    $('cred-modal-extra-group').style.display = showExtra ? '' : 'none';
    $('cred-modal').style.display = '';
    $('cred-modal-username').focus();
    return new Promise((resolve) => {
      this._activeCallback = resolve;
    });
  },
  hide() { $('cred-modal').style.display = 'none'; this._activeCallback = null; },
  _resolve(value) {
    if (this._activeCallback) {
      const cb = this._activeCallback;
      this.hide();
      cb(value);
    }
  }
};

document.addEventListener('click', (e) => {
  if (e.target === $('cred-modal')) Modal.hide();
});
$('cred-modal-close')?.addEventListener('click', () => { Modal._resolve(null); });
$('cred-modal-cancel')?.addEventListener('click', () => { Modal._resolve(null); });
$('cred-modal-save')?.addEventListener('click', () => {
  const username = $('cred-modal-username').value.trim();
  const password = $('cred-modal-password').value;
  if (!username) { Toast.warn('请输入用户名'); return; }
  Modal._resolve({ username, password });
});
$('cred-modal-password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('cred-modal-save')?.click();
});
function genOptions(selectId, from, to) {
  const sel = $(selectId); if (!sel) return;
  sel.innerHTML = '';
  for (let i = from; i <= to; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; sel.appendChild(o); }
}

// ═════════════════════════════════════════════════════════════════
// PAGE: VPN
// ═════════════════════════════════════════════════════════════════
const vpnPage = {
  selectedMode: 'redirect',

  init() {
    // Mode selection
    document.querySelectorAll('.vpn-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.vpn-mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        vpnPage.selectedMode = card.dataset.mode;
        // Show/hide host card
        $('vpn-host-card').style.display = card.dataset.mode === 'host' ? '' : 'none';
      });
    });

    // Start
    $('vpn-start')?.addEventListener('click', async () => {
      const port = parseInt($('vpn-port').value) || 8080;
      const mode = vpnPage.selectedMode;
      Log.info('VPN', '启动代理', { port, mode });
      let result;
      if (!isDemo()) result = await window.jlu.vpn.start(port, mode);
      else result = { ok: true, port, mode };
      if (result.ok) {
        Log.info('VPN', '代理已启动', { result: result });
        const modeNames = { redirect: '302 跳转', system: '系统代理', host: 'Host 映射' };
        $('vpn-status-badge').textContent = `${modeNames[mode]} :${port}`;
        $('vpn-status-badge').className = 'badge badge-success';
        $('vpn-start').disabled = true; $('vpn-stop').disabled = false;
        Toast.success(`VPN 已启动：${modeNames[mode]} 模式，端口 ${port}`);
      } else { Log.error('VPN', '启动失败', { error: result.error }); Toast.error(result.error); }
    });

    // Stop
    $('vpn-stop')?.addEventListener('click', async () => {
      Log.info('VPN', '停止代理');
      if (!isDemo()) await window.jlu.vpn.stop();
      Log.info('VPN', '代理已停止');
      $('vpn-status-badge').textContent = '未运行'; $('vpn-status-badge').className = 'badge';
      $('vpn-start').disabled = false; $('vpn-stop').disabled = true;
      Toast.info('VPN 已停止');
    });

    // Host management
    $('vpn-host-add')?.addEventListener('click', async () => {
      const domain = $('vpn-host-input').value.trim();
      if (!domain) return Toast.warn('请输入域名');
      if (!isDemo()) { const r = await window.jlu.vpn.addHost(domain); vpnPage.renderHosts(r.hosts); }
      else vpnPage.renderHosts([...(vpnPage._hosts || []), { domain, enabled: true }]);
      $('vpn-host-input').value = '';
      Toast.success(`已添加 ${domain}`);
    });

    // URL convert
    $('vpn-convert')?.addEventListener('click', async () => {
      const url = $('vpn-url')?.value.trim(); if (!url) return Toast.warn('请输入网址');
      Log.info('VPN', 'URL 转换', { url });
      let vpnUrl;
      if (!isDemo()) { const r = await window.jlu.vpn.convert(url); vpnUrl = r.ok ? r.vpnUrl : null; Log.info('VPN', 'URL 转换结果', { ok: !!r?.ok }); }
      else vpnUrl = `https://vpn.jlu.edu.cn/${url.replace(/^https?:\/\//, '')}`;
      if (vpnUrl) { $('vpn-result-url').value = vpnUrl; $('vpn-result').style.display = ''; Toast.success('转换成功'); }
    });
    $('vpn-copy')?.addEventListener('click', () => { navigator.clipboard?.writeText($('vpn-result-url').value); Toast.success('已复制'); });
    $('vpn-open')?.addEventListener('click', () => { const u = $('vpn-result-url').value; if (u) window.open(u); });

    // Load hosts
    vpnPage.loadHosts();
  },

  async loadHosts() {
    let hosts;
    if (!isDemo()) hosts = await window.jlu.vpn.getHosts();
    else hosts = [
      { domain: 'scholar.google.com', enabled: true },
      { domain: 'dl.acm.org', enabled: true },
      { domain: 'ieeexplore.ieee.org', enabled: true },
      { domain: 'springer.com', enabled: true },
      { domain: 'github.com', enabled: true },
    ];
    vpnPage._hosts = hosts;
    vpnPage.renderHosts(hosts);
  },

  renderHosts(hosts) {
    vpnPage._hosts = hosts;
    const list = $('vpn-host-list'); if (!list) return;
    list.innerHTML = '';
    hosts.forEach(h => {
      const el = document.createElement('div'); el.className = 'host-item';
      el.innerHTML = `<span class="host-domain">${h.domain}</span><button class="btn btn-ghost host-remove" data-domain="${h.domain}">✕</button>`;
      el.querySelector('.host-remove').addEventListener('click', async () => {
        if (!isDemo()) { const r = await window.jlu.vpn.removeHost(h.domain); vpnPage.renderHosts(r.hosts); }
        else vpnPage.renderHosts(hosts.filter(x => x.domain !== h.domain));
        Toast.info(`已移除 ${h.domain}`);
      });
      list.appendChild(el);
    });
  },
};

// ═════════════════════════════════════════════════════════════════
// PAGE: DrCOM
// ═════════════════════════════════════════════════════════════════
const drcomPage = {
  init() {
    $('drcom-login')?.addEventListener('click', async () => {
      const u = $('drcom-username').value.trim(), p = $('drcom-password').value;
      if (!u || !p) return Toast.warn('请填写账号密码');
      Log.info('DrCOM', '校园网登录');
      $('drcom-login').disabled = true; $('drcom-login').textContent = '连接中...';
      if (!isDemo()) {
        const config = { server: $('drcom-server').value, username: u, password: p, mac: $('drcom-mac').value };
        const r = await window.jlu.drcom.login(config);
        if (r.ok) {
          Log.info('DrCOM', '登录成功');
          // Save credentials for auto-login
          window.jlu.cred.set('drcom', u, p, { server: config.server, mac: config.mac });
          drcomPage.show(r.info);
        } else {
          Log.error('DrCOM', '登录失败', r.error);
          Toast.error(r.error || '登录失败');
        }
      }
      else { Log.debug('DrCOM', '使用演示数据'); setTimeout(() => drcomPage.show({ username: u, ip: '10.10.10.123', loginTime: new Date().toLocaleString('zh-CN') }), 800); }
      $('drcom-login').disabled = false; $('drcom-login').textContent = '登录';
    });
    $('drcom-logout')?.addEventListener('click', async () => { Log.info('DrCOM', '注销'); if (!isDemo()) await window.jlu.drcom.logout(); drcomPage.hide(); Toast.info('已注销'); });
  },
  show(info) {
    $('drcom-status-badge').textContent = '已连接'; $('drcom-status-badge').className = 'badge badge-success';
    $('drcom-login').disabled = true; $('drcom-logout').disabled = false; $('drcom-info').style.display = '';
    $('drcom-info-status').textContent = '已连接 ✅'; $('drcom-info-user').textContent = info?.username || '—';
    $('drcom-info-ip').textContent = info?.ip || '—'; $('drcom-info-time').textContent = info?.loginTime || '—';
    Toast.success('登录成功');
  },
  hide() { $('drcom-status-badge').textContent = '未连接'; $('drcom-status-badge').className = 'badge'; $('drcom-login').disabled = false; $('drcom-logout').disabled = true; $('drcom-info').style.display = 'none'; }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Schedule
// ═════════════════════════════════════════════════════════════════
const schedulePage = {
  week: 1,
  init() {
    schedulePage.renderGrid();
    schedulePage.renderCourses();
    schedulePage.updateWeek();
    $('schedule-prev')?.addEventListener('click', () => { if (schedulePage.week > 1) { schedulePage.week--; schedulePage.updateWeek(); schedulePage.renderCourses(); } });
    $('schedule-next')?.addEventListener('click', () => { if (schedulePage.week < 20) { schedulePage.week++; schedulePage.updateWeek(); schedulePage.renderCourses(); } });
    $('schedule-import')?.addEventListener('click', async () => {
      Toast.info('正在导入课表...');
      Log.info('Schedule', '导入课表');
      if (!isDemo()) {
        try {
          const result = await window.jlu.schedule.importFromWeb({ semesterStart: '2026-09-01', courses: [] });
          if (result.ok) { Log.info('Schedule', '课表导入成功'); Toast.success('导入成功'); schedulePage.renderCourses(); }
          else { Log.error('Schedule', '课表导入失败', { error: result.error }); Toast.error(result.error || '导入失败'); }
        } catch (e) { Log.error('Schedule', '课表导入异常', e); Toast.error('导入失败：' + e.message); }
      } else { Log.debug('Schedule', '使用演示数据导入'); Toast.success('导入成功（演示）'); }
    });
    $('schedule-add')?.addEventListener('click', async () => {
      const name = prompt('课程名称：'); if (!name) return;
      const dayOfWeek = parseInt(prompt('星期(1-7)：') || '1');
      const startSlot = parseInt(prompt('开始节次(1-12)：') || '1');
      const endSlot = parseInt(prompt('结束节次(1-12)：') || '2');
      const data = { name, dayOfWeek, startSlot, endSlot, location: prompt('地点：') || '', teacher: prompt('教师：') || '', color: '#4FC3F7' };
      Log.info('Schedule', '添加课程', data);
      if (!isDemo()) {
        try {
          const result = await window.jlu.schedule.create(data);
          if (result.ok) { Log.info('Schedule', '课程添加成功'); Toast.success('已添加课程'); schedulePage.renderCourses(); }
          else { Log.error('Schedule', '课程添加失败', { error: result.error }); Toast.error(result.error || '添加失败'); }
        } catch (e) { Log.error('Schedule', '课程添加异常', e); Toast.error('添加失败：' + e.message); }
      } else { Log.debug('Schedule', '使用演示数据添加课程'); Toast.success('已添加课程（演示）'); }
    });
  },
  updateWeek() {
    $('schedule-week-display').textContent = `第 ${schedulePage.week} 周`;
    $('schedule-week').textContent = `第 ${schedulePage.week} 周`;
    const now = new Date(), dow = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate() - dow + 1 + (schedulePage.week - 1) * 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    $('schedule-date').textContent = `${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()}`;
  },
  renderGrid() {
    const body = $('timetable-body'); if (!body) return; body.innerHTML = '';
    for (let s = 1; s <= 12; s++) {
      const lbl = document.createElement('div'); lbl.className = 'time-slot-label'; lbl.textContent = s; body.appendChild(lbl);
      for (let d = 1; d <= 7; d++) { const cell = document.createElement('div'); cell.className = 'timetable-cell'; cell.dataset.day = d; cell.dataset.slot = s; body.appendChild(cell); }
    }
  },
  async renderCourses() {
    document.querySelectorAll('.course-block').forEach(b => b.remove());
    let courses;
    if (!isDemo()) {
      Log.info('Schedule', '获取课程列表');
      try {
        const result = await window.jlu.schedule.getAll();
        if (result.ok) { courses = result.courses; Log.info('Schedule', '课程列表获取成功', { count: courses.length }); }
        else { Log.error('Schedule', '获取课表失败', { error: result.error }); Toast.error('获取课表失败：' + (result.error || '')); return; }
      } catch (e) { Log.error('Schedule', '获取课表异常', e); Toast.error('获取课表失败：' + e.message); return; }
    } else if (isDevMode) {
      courses = [
        { name: '高等数学', teacher: '张三', location: '逸夫楼301', dayOfWeek: 1, startSlot: 1, endSlot: 2, color: '#4FC3F7', weeks: Array.from({ length: 16 }, (_, i) => i + 1) },
        { name: '大学英语', teacher: '李四', location: '外语楼205', dayOfWeek: 1, startSlot: 5, endSlot: 6, color: '#81C784', weeks: Array.from({ length: 16 }, (_, i) => i + 1) },
        { name: '程序设计', teacher: '王五', location: '计算机楼401', dayOfWeek: 2, startSlot: 3, endSlot: 4, color: '#FFB74D', weeks: Array.from({ length: 16 }, (_, i) => i + 1) },
        { name: '数据结构', teacher: '赵六', location: '计算机楼302', dayOfWeek: 3, startSlot: 1, endSlot: 2, color: '#E57373', weeks: Array.from({ length: 16 }, (_, i) => i + 1) },
        { name: '线性代数', teacher: '孙七', location: '数学楼101', dayOfWeek: 3, startSlot: 5, endSlot: 6, color: '#BA68C8', weeks: Array.from({ length: 16 }, (_, i) => i + 1) },
        { name: '体育', teacher: '周八', location: '体育馆', dayOfWeek: 4, startSlot: 3, endSlot: 4, color: '#4DB6AC' },
        { name: '思政', teacher: '吴九', location: '文科楼201', dayOfWeek: 5, startSlot: 1, endSlot: 2, color: '#FFD54F' },
        { name: '物理实验', teacher: '郑十', location: '物理楼实验室', dayOfWeek: 5, startSlot: 7, endSlot: 8, color: '#7986CB', weeks: [1, 3, 5, 7, 9, 11, 13, 15] },
      ];
    } else { return; }
    courses.forEach(c => {
      if (c.weeks && !c.weeks.includes(schedulePage.week)) return;
      const cells = document.querySelectorAll(`.timetable-cell[data-day="${c.dayOfWeek}"]`);
      const start = cells[c.startSlot - 1]; if (!start) return;
      const blk = document.createElement('div'); blk.className = 'course-block';
      const span = c.endSlot - c.startSlot + 1;
      blk.style.cssText = `top:2px;height:calc(${span * 100}% + ${span - 1}px);background:${c.color}`;
      blk.innerHTML = `<span class="course-name">${c.name}</span><span class="course-info">${c.location}</span><span class="course-info">${c.teacher}</span>`;
      start.appendChild(blk);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Study
// ═════════════════════════════════════════════════════════════════
const studyPage = {
  init() {
    $('study-login')?.addEventListener('click', async () => {
      const u = $('study-username').value.trim(), p = $('study-password').value;
      if (!u || !p) return Toast.warn('请填写账号密码');
      Toast.info('获取课程...');
      Log.info('Study', '获取课程列表');
      let courses;
      if (!isDemo()) { const r = await window.jlu.study.getCourses({ username: u, password: p }); courses = r.ok ? r.courses : []; Log.info('Study', '课程列表获取完成', { count: courses.length }); }
      else { Log.debug('Study', '使用演示数据'); courses = [{ id: 1, name: '高等数学A', term: '2025-1', teacher: '张三' }, { id: 2, name: '大学物理', term: '2025-1', teacher: '李四' }, { id: 3, name: '程序设计', term: '2025-1', teacher: '王五' }]; }
      studyPage.renderCourses(courses); Toast.success(`获取到 ${courses.length} 门课程`);
    });
  },
  renderCourses(courses) {
    $('study-courses-card').style.display = '';
    const g = $('study-courses'); g.innerHTML = '';
    courses.forEach(c => {
      const el = document.createElement('div'); el.className = 'course-card';
      el.innerHTML = `<div class="course-card-title">${c.name}</div><div class="course-card-meta">${c.teacher || ''} · ${c.term || ''}</div>`;
      el.addEventListener('click', () => studyPage.showVideos(c)); g.appendChild(el);
    });
  },
  showVideos(c) {
    $('study-videos-card').style.display = ''; $('study-course-name').textContent = c.name;
    const l = $('study-videos'); l.innerHTML = '';
    [{ t: '第1讲 绪论', d: '2025-09-01' }, { t: '第2讲 基础概念', d: '2025-09-08' }, { t: '第3讲 进阶', d: '2025-09-15' }].forEach(v => {
      const el = document.createElement('div'); el.className = 'video-item';
      el.innerHTML = `<span class="video-icon">🎬</span><span class="video-title">${v.t}</span><span class="video-meta">${v.d}</span><span class="video-download">⬇️</span>`;
      l.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: CourseGrab
// ═════════════════════════════════════════════════════════════════
const coursePage = {
  init() {
    $('course-start')?.addEventListener('click', async () => {
      const ids = $('course-ids').value.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean);
      const username = $('course-username').value.trim(), password = $('course-password').value;
      if (!username || !password) return Toast.warn('请填写账号密码');
      if (!ids.length) return Toast.warn('请输入课程ID');
      Log.info('CourseGrab', '开始抢课', { ids });
      coursePage.log(`开始抢课：${ids.join(', ')}`, 'info');
      $('course-start').disabled = true; $('course-stop').disabled = false;
      if (!isDemo()) {
        try {
          const result = await window.jlu.course.start({ username, password, courseIds: ids, interval: parseInt($('course-interval')?.value) || 2000, baseUrl: $('course-base-url')?.value || '' });
          if (result.ok) { Log.info('CourseGrab', '抢课已启动'); Toast.success('抢课已启动'); }
          else { Log.error('CourseGrab', '抢课启动失败', { error: result.error }); Toast.error(result.error || '启动失败'); $('course-start').disabled = false; $('course-stop').disabled = true; }
        } catch (e) { Log.error('CourseGrab', '抢课启动异常', e); Toast.error('启动失败：' + e.message); $('course-start').disabled = false; $('course-stop').disabled = true; }
      } else { Log.debug('CourseGrab', '使用演示数据启动抢课'); Toast.success('抢课已启动（演示）'); }
    });
    $('course-stop')?.addEventListener('click', async () => {
      Log.info('CourseGrab', '停止抢课');
      if (!isDemo()) {
        try { await window.jlu.course.stop(); Log.info('CourseGrab', '抢课已停止'); Toast.info('抢课已停止'); }
        catch (e) { Log.error('CourseGrab', '停止失败', e); Toast.error('停止失败：' + e.message); }
      } else { Log.debug('CourseGrab', '演示停止抢课'); Toast.info('抢课已停止（演示）'); }
      $('course-start').disabled = false; $('course-stop').disabled = true; coursePage.log('已停止', 'warn');
    });
  },
  log(t, type = '') { const p = $('course-log'); const l = document.createElement('div'); l.className = `log-line ${type}`; l.textContent = `[${new Date().toLocaleTimeString()}] ${t}`; p.appendChild(l); p.scrollTop = p.scrollHeight; }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Grade
// ═════════════════════════════════════════════════════════════════
const gradePage = {
  init() {
    $('grade-load-demo')?.addEventListener('click', () => {
      if (!isDevMode) return Toast.info('请先开启开发者模式');
      Log.debug('Grade', '使用演示数据');
      gradePage.render(gradePage.demoGrades());
    });
    $('grade-sync-edu')?.addEventListener('click', async () => {
      if (isDemo()) return Toast.warn('演示模式下无法同步');
      Log.info('Grade', '开始同步成绩');
      Toast.info('正在登录教务系统...');
      const username = $('drcom-username')?.value || prompt('请输入学号：');
      const password = $('drcom-password')?.value || prompt('请输入密码：');
      if (!username || !password) return;
      const loginRes = await window.jlu.edu.login({ username, password });
      if (!loginRes.ok) { Log.error('Grade', '教务登录失败', { error: loginRes.error }); return Toast.error(loginRes.error); }
      Log.info('Grade', '教务登录成功');
      Toast.info('正在获取成绩...');
      const gradeRes = await window.jlu.edu.fetchGrades();
      if (gradeRes.ok) { Log.info('Grade', '成绩同步成功', { count: gradeRes.grades.length }); gradePage.render(gradeRes.grades); Toast.success(`同步成功，获取 ${gradeRes.grades.length} 条成绩`); }
      else { Log.error('Grade', '成绩同步失败', { error: gradeRes.error }); Toast.error(gradeRes.error); }
    });
  },
  demoGrades() {
    return [
      { semester: '2025-1', name: '高等数学A', credit: 5, score: 92 }, { semester: '2025-1', name: '大学物理', credit: 4, score: 85 },
      { semester: '2025-1', name: '程序设计', credit: 3, score: 96 }, { semester: '2025-1', name: '线性代数', credit: 3, score: 78 },
      { semester: '2025-1', name: '大学英语', credit: 2, score: 88 }, { semester: '2025-1', name: '体育', credit: 1, score: 90 },
      { semester: '2024-2', name: '概率论', credit: 3, score: 73 }, { semester: '2024-2', name: '离散数学', credit: 3, score: 88 },
      { semester: '2024-2', name: '数据结构', credit: 4, score: 91 }, { semester: '2024-2', name: '数字电路', credit: 3, score: 76 },
    ];
  },
  render(grades) {
    // JLU official GPA scale (校教字〔2016〕102号)
    // | <60 | 60-63 | 64-66 | 67-69 | 70-73 | 74-76 | 77-79 | 80-83 | 84-86 | 87-89 | 90-94 | 95-100 |
    // | 0   | 1.0   | 1.3   | 1.7   | 2.0   | 2.3   | 2.7   | 3.0   | 3.3   | 3.7   | 4.0   | 4.0   |
    const toGPA = s => s >= 95 ? 4.0 : s >= 90 ? 4.0 : s >= 87 ? 3.7 : s >= 84 ? 3.3 : s >= 80 ? 3.0 : s >= 77 ? 2.7 : s >= 74 ? 2.3 : s >= 70 ? 2.0 : s >= 67 ? 1.7 : s >= 64 ? 1.3 : s >= 60 ? 1.0 : 0;
    const toGrade = s => s >= 95 ? 'A+' : s >= 90 ? 'A' : s >= 87 ? 'A-' : s >= 84 ? 'B+' : s >= 80 ? 'B' : s >= 77 ? 'B-' : s >= 74 ? 'C+' : s >= 70 ? 'C' : s >= 67 ? 'C-' : s >= 64 ? 'D+' : s >= 60 ? 'D' : 'F';
    let tw = 0, tc = 0, ts = 0;
    grades.forEach(g => { const gp = toGPA(g.score); tw += gp * g.credit; tc += g.credit; ts += g.score; });
    $('gpa-weighted').textContent = tc ? (tw / tc).toFixed(3) : '—';
    $('gpa-avg').textContent = grades.length ? (ts / grades.length).toFixed(1) : '—';
    $('gpa-credits').textContent = tc.toFixed(1);
    $('gpa-count').textContent = grades.length;
    const tbody = $('grade-tbody'); tbody.innerHTML = '';
    grades.forEach(g => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${g.semester}</td><td>${g.name}</td><td>${g.credit}</td><td>${g.score} (${toGrade(g.score)})</td><td>${toGPA(g.score).toFixed(1)}</td>`;
      tbody.appendChild(tr);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Exam
// ═════════════════════════════════════════════════════════════════
const examPage = {
  async init() {
    if (!isDemo()) {
      Log.info('Exam', '获取考试安排');
      try {
        const result = await window.jlu.exam.get({});
        if (result.ok) { examPage.render(result.exams); Log.info('Exam', '考试安排获取成功', { count: result.exams?.length }); }
        else if (result.error) Log.warn('Exam', '获取考试安排失败', { error: result.error });
      } catch (e) { Log.error('Exam', '获取考试安排异常', e); /* ignore on init */ }
    }
    $('exam-load-demo')?.addEventListener('click', () => {
      if (!isDevMode) return Toast.info('请先开启开发者模式');
      Log.debug('Exam', '使用演示数据');
      const y = new Date().getFullYear();
      examPage.render([
        { name: '高等数学A', type: '期末', date: `${y}-08-25`, time: '09:00', location: '逸夫楼301', seat: '15' },
        { name: '大学物理', type: '期末', date: `${y}-08-27`, time: '14:00', location: '数学楼201', seat: '22' },
        { name: '程序设计', type: '期末', date: `${y}-08-29`, time: '09:00', location: '计算机楼401', seat: '08' },
        { name: '线性代数', type: '期末', date: `${y}-09-01`, time: '14:00', location: '逸夫楼102', seat: '31' },
        { name: '体育', type: '考查', date: `${y}-07-28`, time: '10:00', location: '体育馆', seat: '—' },
      ]);
    });
  },
  render(exams) {
    const now = Date.now(), list = $('exam-list'); list.innerHTML = '';
    exams.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
      const diff = new Date(`${e.date} ${e.time}`).getTime() - now;
      const days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000);
      const cd = diff > 0 ? (days > 0 ? `${days}天${hours}h` : `${hours}h`) : '已结束';
      const urgent = diff > 0 && diff <= 86400000 * 3, passed = diff <= 0;
      const el = document.createElement('div');
      el.className = `exam-item${urgent ? ' urgent' : ''}${passed ? ' passed' : ''}`;
      el.innerHTML = `<div class="exam-countdown ${urgent ? 'urgent' : ''}">${cd}</div><div class="exam-info"><div class="exam-name">${e.name} (${e.type})</div><div class="exam-meta">${e.date} ${e.time} · ${e.location} · 座位${e.seat}</div></div>`;
      list.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Graduation
// ═════════════════════════════════════════════════════════════════
const gradPage = {
  async init() {
    if (!isDemo()) {
      Log.info('Graduation', '获取培养方案');
      try {
        const templates = await window.jlu.grad.getTemplates();
        if (templates && templates.ok && templates.templates && templates.templates.length) {
          Log.info('Graduation', '分析学分进度', { templateId: templates.templates[0].id });
          const result = await window.jlu.grad.analyze(templates.templates[0].id, []);
          if (result.ok) { gradPage.render(result.data); Log.info('Graduation', '学分分析完成'); }
        }
      } catch (e) { Log.error('Graduation', '培养方案获取异常', e); /* ignore on init */ }
    }
    $('grad-load-demo')?.addEventListener('click', () => {
      if (!isDevMode) return Toast.info('请先开启开发者模式');
      Log.debug('Graduation', '使用演示数据');
      gradPage.render({
        totalRequired: 170, totalCompleted: 88, overallPercentage: 52,
        categories: [
          { name: '公共基础课', required: 40, completed: 28, percentage: 70, missingCourses: ['军事理论'], done: false },
          { name: '学科基础课', required: 35, completed: 24, percentage: 69, missingCourses: ['编译原理', '操作系统'], done: false },
          { name: '专业核心课', required: 30, completed: 8, percentage: 27, missingCourses: ['计算机网络', '数据库', '软件工程', '算法设计', 'AI'], done: false },
          { name: '专业选修课', required: 25, completed: 4, percentage: 16, missingCourses: ['机器学习', '图形学', '信安', '嵌入式'], done: false },
          { name: '通识选修课', required: 16, completed: 12, percentage: 75, missingCourses: [], done: false },
          { name: '实践环节', required: 24, completed: 12, percentage: 50, missingCourses: ['生产实习', '毕设'], done: false },
        ]
      });
    });
  },
  render(data) {
    $('grad-progress').style.width = data.overallPercentage + '%';
    $('grad-progress-text').textContent = data.overallPercentage + '%';
    $('grad-summary').textContent = `已修 ${data.totalCompleted} / ${data.totalRequired} 学分`;
    const cats = $('grad-categories'); cats.innerHTML = '';
    data.categories.forEach(c => {
      const el = document.createElement('div'); el.className = `grad-cat-item${c.done ? ' grad-cat-done' : ''}`;
      el.innerHTML = `<div class="grad-cat-header"><span class="grad-cat-name">${c.name}</span><span class="grad-cat-credits">${c.completed}/${c.required} 学分</span></div><div class="grad-cat-bar"><div class="grad-cat-fill" style="width:${c.percentage}%"></div></div>${c.missingCourses.length ? `<div class="grad-cat-missing">未修：${c.missingCourses.join('、')}</div>` : ''}`;
      cats.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Classroom
// ═════════════════════════════════════════════════════════════════
const classroomPage = {
  init() {
    $('classroom-date').value = new Date().toISOString().split('T')[0];
    genOptions('classroom-start', 1, 12); genOptions('classroom-end', 1, 12); $('classroom-end').value = 4;
    $('classroom-search')?.addEventListener('click', async () => {
      const bld = $('classroom-building').value;
      const date = $('classroom-date').value;
      const startSlot = parseInt($('classroom-start').value);
      const endSlot = parseInt($('classroom-end').value);
      if (!isDemo()) {
        Log.info('Classroom', '查询空教室', { date, building: bld, startSlot, endSlot });
        Toast.info('正在查询空教室...');
        try {
          const result = await window.jlu.classroom.get({ date, building: bld, startSlot, endSlot });
          const rooms = result.classrooms || result.rooms || [];
          if (result.ok) { Log.info('Classroom', '查询成功', { count: rooms.length }); Toast.success(`找到 ${rooms.length} 间空教室`); classroomPage.render(rooms); }
          else { Log.error('Classroom', '查询失败', { error: result.error }); Toast.error(result.error || '查询失败'); }
        } catch (e) { Log.error('Classroom', '查询异常', e); Toast.error('查询失败：' + e.message); }
      } else {
        Log.debug('Classroom', '使用演示数据');
        const rooms = [];
        const blds = bld === 'all' ? ['逸夫楼', '计算机楼', '数学楼', '外语楼'] : [bld];
        blds.forEach(b => { for (let r = 1; r <= 5; r++) { if (Math.random() > 0.4) rooms.push({ building: b, room: `${r}0${Math.ceil(Math.random() * 9)}`, capacity: 60 + Math.floor(Math.random() * 100) }); } });
        classroomPage.render(rooms);
      }
    });
  },
  render(rooms) {
    const list = $('classroom-list'); list.innerHTML = '';
    if (!rooms.length) { list.innerHTML = '<div class="notif-empty">没有空教室</div>'; return; }
    rooms.forEach(r => {
      const el = document.createElement('div'); el.className = 'classroom-item';
      el.innerHTML = `<div class="cr-name">${r.building} ${r.room}</div><div class="cr-capacity">容纳 ${r.capacity} 人</div><div class="cr-status available">空闲 ✅</div>`;
      list.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Course Review
// ═════════════════════════════════════════════════════════════════
const reviewPage = {
  _currentCourse: null,
  _starRating: 0,

  init() {
    $('review-search-btn')?.addEventListener('click', async () => {
      const kw = $('review-search').value.trim().toLowerCase(); if (!kw) return Toast.warn('请输入关键词');
      Log.info('Review', '搜索课程', { keyword: kw });
      if (!isDemo()) {
        Toast.info('正在搜索...');
        try {
          const result = await window.jlu.review.search(kw);
          const courses = result.courses || result || [];
          if (courses.length) Toast.success(`找到 ${courses.length} 门课程`);
          Log.info('Review', '搜索结果', { count: courses.length });
          reviewPage.renderResults(courses);
        } catch (e) { Log.error('Review', '搜索失败', e); Toast.error('搜索失败：' + e.message); }
      } else {
        Log.debug('Review', '使用演示数据');
        const results = reviewPage.demoCourses().filter(c =>
          c.name.toLowerCase().includes(kw) || c.teacher.toLowerCase().includes(kw)
        );
        reviewPage.renderResults(results);
      }
    });
    $('review-back-btn')?.addEventListener('click', () => {
      $('review-detail-card').style.display = 'none';
      $('review-results-card').style.display = '';
    });
    $('review-submit-btn')?.addEventListener('click', () => reviewPage.submitReview());
    // Star picker
    document.querySelectorAll('.star-opt').forEach(el => {
      el.addEventListener('click', () => {
        reviewPage._starRating = parseInt(el.dataset.val);
        document.querySelectorAll('.star-opt').forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= reviewPage._starRating));
      });
      el.addEventListener('mouseenter', () => {
        const v = parseInt(el.dataset.val);
        document.querySelectorAll('.star-opt').forEach(s => s.classList.toggle('hover', parseInt(s.dataset.val) <= v));
      });
      el.addEventListener('mouseleave', () => {
        document.querySelectorAll('.star-opt').forEach(s => s.classList.remove('hover'));
      });
    });
    // Search on Enter
    $('review-search')?.addEventListener('keydown', e => { if (e.key === 'Enter') $('review-search-btn')?.click(); });
  },

  demoCourses() {
    return [
      { id: 'c1', name: '高等数学A', teacher: '张三', department: '数学学院', rating: 4.5, difficulty: 4, workload: 4, reviews: 128 },
      { id: 'c2', name: '程序设计基础', teacher: '王五', department: '计算机学院', rating: 4.8, difficulty: 3, workload: 3, reviews: 95 },
      { id: 'c3', name: '大学物理', teacher: '李四', department: '物理学院', rating: 4.2, difficulty: 4, workload: 3, reviews: 87 },
      { id: 'c4', name: '数据结构', teacher: '赵六', department: '计算机学院', rating: 4.6, difficulty: 4, workload: 4, reviews: 76 },
      { id: 'c5', name: '线性代数', teacher: '孙七', department: '数学学院', rating: 4.0, difficulty: 3, workload: 3, reviews: 104 },
      { id: 'c6', name: '大学英语', teacher: '周八', department: '外语学院', rating: 3.8, difficulty: 2, workload: 2, reviews: 156 },
    ];
  },

  renderResults(courses) {
    $('review-results-card').style.display = '';
    $('review-detail-card').style.display = 'none';
    const list = $('review-results'); list.innerHTML = '';
    if (!courses.length) { list.innerHTML = '<div class="notif-empty">未找到匹配课程</div>'; return; }
    courses.forEach(c => {
      const el = document.createElement('div'); el.className = 'review-course-card';
      const stars = '★'.repeat(Math.round(c.rating)) + '☆'.repeat(5 - Math.round(c.rating));
      el.innerHTML = `<div><div class="rc-name">${c.name}</div><div class="rc-teacher">${c.teacher} · ${c.department}</div></div><div style="text-align:right"><div class="rc-rating" style="color:#f59e0b">${stars}</div><div class="rc-stats">${c.rating.toFixed(1)} · ${c.reviews || 0} 条</div></div>`;
      el.addEventListener('click', () => reviewPage.showDetail(c)); list.appendChild(el);
    });
  },

  async showDetail(c) {
    reviewPage._currentCourse = c;
    $('review-detail-card').style.display = '';
    $('review-detail-title').textContent = `${c.name} - ${c.teacher}`;
    // Course info bar
    const infoBar = $('review-course-info');
    const avgStars = '★'.repeat(Math.round(c.rating)) + '☆'.repeat(5 - Math.round(c.rating));
    infoBar.innerHTML = `
      <div class="rci-item"><div class="rci-value" style="color:#f59e0b;font-size:16px">${avgStars}</div><div class="rci-label">评分 ${c.rating.toFixed(1)}</div></div>
      <div class="rci-item"><div class="rci-value">${c.difficulty || '—'}</div><div class="rci-label">难度 /5</div></div>
      <div class="rci-item"><div class="rci-value">${c.workload || '—'}</div><div class="rci-label">作业量 /5</div></div>
      <div class="rci-item"><div class="rci-value">${c.reviews || 0}</div><div class="rci-label">评价数</div></div>
    `;
    // Reviews
    const list = $('review-detail'); list.innerHTML = '';
    let reviews;
    if (!isDemo()) {
      Log.info('Review', '获取评价', { courseId: c.id });
      try {
        const result = await window.jlu.review.get(c.id);
        if (result && result.reviews) { reviews = result.reviews; Log.info('Review', '评价获取成功', { count: reviews.length }); }
      } catch {}
    }
    if (!reviews || !reviews.length) {
      // Use combined demo reviews from backend
      const client = { getDemoReviews: () => [
        { courseId: 'c1', author: '匿名', rating: 5, content: '老师讲得很好，深入浅出，考试不难但需要认真复习。', semester: '2025-1', helpful: 42, difficulty: 4, workload: 4 },
        { courseId: 'c1', author: '匿名', rating: 4, content: '作业比较多，但能学到东西。建议多做课后题。', semester: '2025-1', helpful: 28, difficulty: 4, workload: 4 },
        { courseId: 'c2', author: '匿名', rating: 5, content: 'C语言入门首选，老师很有耐心，实验课很有趣。', semester: '2025-1', helpful: 35, difficulty: 3, workload: 3 },
        { courseId: 'c2', author: '匿名', rating: 5, content: '给分很好，认真学能拿高分。', semester: '2024-2', helpful: 21, difficulty: 3, workload: 3 },
        { courseId: 'c4', author: '匿名', rating: 4, content: '课程内容扎实，需要花时间理解。实验报告有点多。', semester: '2025-1', helpful: 33, difficulty: 4, workload: 4 },
      ]};
      reviews = client.getDemoReviews().filter(r => r.courseId === c.id);
    }
    if (!reviews.length) {
      list.innerHTML = '<div class="notif-empty">暂无评价，来写第一条吧</div>';
    } else {
      reviews.forEach(r => {
        const el = document.createElement('div'); el.className = 'review-item';
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const tags = [];
        if (r.difficulty) tags.push(`<span class="review-tag difficulty">难度 ${r.difficulty}/5</span>`);
        if (r.workload) tags.push(`<span class="review-tag workload">作业 ${r.workload}/5</span>`);
        el.innerHTML = `
          <div class="review-header">
            <span class="review-stars">${stars}</span>
            <span class="review-semester">${r.semester || ''}${r.author ? ' · ' + r.author : ''}</span>
          </div>
          <div class="review-meta-tags">${tags.join('')}</div>
          <div class="review-content">${r.content}</div>
          <div class="review-helpful">${r.helpful || 0} 人觉得有用</div>
        `;
        list.appendChild(el);
      });
    }
    // Reset submit form
    reviewPage._starRating = 0;
    document.querySelectorAll('.star-opt').forEach(s => s.classList.remove('active'));
    $('review-content').value = '';
    $('review-semester').value = '2026-1';
  },

  async submitReview() {
    const c = reviewPage._currentCourse;
    if (!c) return Toast.warn('请先选择课程');
    const rating = reviewPage._starRating;
    if (!rating) return Toast.warn('请选择评分');
    const content = $('review-content').value.trim();
    if (!content) return Toast.warn('请输入评价内容');
    const review = {
      courseId: c.id,
      rating,
      content,
      semester: $('review-semester').value.trim() || '2026-1',
      difficulty: parseInt($('review-difficulty').value),
      workload: parseInt($('review-workload').value),
      author: '匿名',
      helpful: 0,
    };
    Log.info('Review', '提交评价', { courseId: c.id, rating });
    if (!isDemo()) {
      try {
        const result = await window.jlu.review.add(review);
        if (!result.ok) { Log.error('Review', '评价提交失败', { error: result.error }); return Toast.error(result.error || '提交失败'); }
      } catch (e) { Log.error('Review', '评价提交异常', e); return Toast.error('提交失败：' + e.message); }
    } else { Log.debug('Review', '使用演示数据提交'); }
    Log.info('Review', '评价已提交');
    Toast.success('评价已提交');
    reviewPage.showDetail(c); // refresh
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Campus Card
// ═════════════════════════════════════════════════════════════════
const cardPage = {
  async init() {
    if (!isDemo()) {
      try {
        Log.info('Card', '获取校园卡余额');
        const config = {};
        const balance = await window.jlu.card.getBalance(config);
        if (balance.ok) { Log.info('Card', '余额获取成功', { balance: balance.balance }); $('card-balance').textContent = balance.balance; $('card-id').textContent = '卡号：' + (balance.cardNumber || ''); }
        Log.info('Card', '获取消费流水');
        const txns = await window.jlu.card.getTransactions(config);
        if (txns.ok && txns.transactions) {
          const list = $('card-transactions'); list.innerHTML = '';
          txns.transactions.forEach(t => {
            const el = document.createElement('div'); el.className = 'txn-item';
            el.innerHTML = `<span class="txn-time">${t.time}</span><span class="txn-location">${t.location}</span><span class="txn-amount ${t.amount < 0 ? 'expense' : 'income'}">${t.amount > 0 ? '+' : ''}${t.amount}</span>`;
            list.appendChild(el);
          });
        }
      } catch (e) { /* ignore on init */ }
    }
    $('card-load-demo')?.addEventListener('click', () => {
      if (!isDevMode) return Toast.info('请先开启开发者模式');
      Log.debug('Card', '使用演示数据');
      $('card-balance').textContent = '342.50'; $('card-id').textContent = '卡号：2023****1234';
      const locs = ['前卫南一食堂', '前卫南二食堂', '莘子园', '超市', '打印店', '开水房'];
      const txns = Array.from({ length: 15 }, (_, i) => {
        const amt = -(Math.random() * 30 + 2).toFixed(2);
        return { time: new Date(Date.now() - i * 3600000 * (Math.random() * 4 + 1)).toLocaleString('zh-CN'), location: locs[Math.floor(Math.random() * locs.length)], amount: parseFloat(amt) };
      });
      const list = $('card-transactions'); list.innerHTML = '';
      txns.forEach(t => {
        const el = document.createElement('div'); el.className = 'txn-item';
        el.innerHTML = `<span class="txn-time">${t.time}</span><span class="txn-location">${t.location}</span><span class="txn-amount ${t.amount < 0 ? 'expense' : 'income'}">${t.amount > 0 ? '+' : ''}${t.amount}</span>`;
        list.appendChild(el);
      });
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Cafeteria
// ═════════════════════════════════════════════════════════════════
const cafePage = {
  cafes: [
    { id: 'south1', name: '前卫南一食堂', location: '中心校区', menu: { breakfast: ['豆浆油条', '小米粥', '煎饼果子'], lunch: ['红烧肉套餐', '麻辣香锅', '鸡公煲'], dinner: ['黄焖鸡', '烤肉饭', '砂锅米线'] } },
    { id: 'south2', name: '前卫南二食堂', location: '中心校区', menu: { breakfast: ['豆腐脑', '肉夹馍'], lunch: ['水煮鱼', '麻辣烫', '盖浇饭'], dinner: ['炸鸡汉堡', '酸辣粉'] } },
    { id: 'shenzi', name: '莘子园', location: '中心校区', menu: { breakfast: ['八宝粥', '烧饼'], lunch: ['回锅肉', '鱼香肉丝', '凉皮'], dinner: ['刀削面', '炸酱面'] } },
    { id: 'nanling1', name: '南岭一食堂', location: '南岭校区', menu: { lunch: ['套餐A', '套餐B'], dinner: ['面食'] } },
  ],
  async init() {
    if (!isDemo()) {
      Log.info('Cafe', '获取食堂列表');
      try {
        const result = await window.jlu.cafeteria.getList();
        if (result.ok && result.cafeterias) { cafePage.cafes = result.cafeterias; Log.info('Cafe', '食堂列表获取成功', { count: cafePage.cafes.length }); }
      } catch (e) { Log.error('Cafe', '获取食堂列表异常', e); /* ignore on init */ }
    }
    const grid = $('cafeteria-list'); grid.innerHTML = '';
    const h = new Date().getHours();
    const crowd = h >= 11 && h <= 12.5 ? '🔴 高峰' : h >= 18 && h <= 19.5 ? '🔴 高峰' : h >= 12.5 && h <= 13.5 ? '🟡 较忙' : '🟢 空闲';
    cafePage.cafes.forEach(c => {
      const el = document.createElement('div'); el.className = 'cafe-card';
      el.innerHTML = `<div class="cafe-name">${c.name}</div><div class="cafe-loc">${c.location}</div><div class="cafe-crowd">${crowd}</div>`;
      el.addEventListener('click', () => cafePage.showDetail(c, crowd)); grid.appendChild(el);
    });
  },
  async showDetail(c, crowd) {
    $('cafeteria-detail').style.display = '';
    $('cafeteria-name').textContent = c.name;
    let crowdDisplay = crowd;
    if (!isDemo()) {
      Log.info('Cafe', '获取食堂详情', { id: c.id });
      try {
        const [crowdResult, menuResult] = await Promise.all([
          window.jlu.cafeteria.getCrowd(c.id),
          window.jlu.cafeteria.getMenu(c.id)
        ]);
        if (crowdResult.ok) crowdDisplay = crowdResult.crowd || crowd;
        if (menuResult.ok && menuResult.menu) c.menu = menuResult.menu;
        Log.info('Cafe', '食堂详情获取成功');
      } catch (e) { Log.error('Cafe', '获取食堂详情异常', e); /* ignore */ }
    }
    $('cafeteria-crowd').textContent = crowdDisplay;
    const body = $('cafeteria-menu'); body.innerHTML = '';
    Object.entries(c.menu).forEach(([meal, items]) => {
      const labels = { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐' };
      const el = document.createElement('div'); el.className = 'cafe-menu-section';
      el.innerHTML = `<div class="cafe-menu-title">${labels[meal] || meal}</div><div class="cafe-menu-items">${items.map(i => `<span class="cafe-menu-tag">${i}</span>`).join('')}</div>`;
      body.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Bus
// ═════════════════════════════════════════════════════════════════
const busPage = {
  routes: [
    { id: 'sn', name: '前卫南 ↔ 南岭', duration: '约40分钟', times: ['7:00', '7:30', '8:00', '9:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '17:30'] },
    { id: 'sc', name: '前卫南 ↔ 朝阳', duration: '约50分钟', times: ['7:15', '8:15', '9:15', '10:15', '13:15', '14:15', '15:15', '16:15', '17:15'] },
    { id: 'sh', name: '前卫南 ↔ 南湖', duration: '约35分钟', times: ['7:30', '8:30', '10:00', '13:30', '15:00', '17:00'] },
  ],
  async init() {
    if (!isDemo()) {
      Log.info('Bus', '获取校车路线');
      try {
        const result = await window.jlu.bus.getRoutes();
        if (result.ok && result.routes) { busPage.routes = result.routes; Log.info('Bus', '路线获取成功', { count: busPage.routes.length }); }
      } catch (e) { Log.error('Bus', '获取路线异常', e); /* ignore on init */ }
    }
    const routes = $('bus-routes'); routes.innerHTML = '';
    busPage.routes.forEach(r => {
      const el = document.createElement('div'); el.className = 'bus-route-card';
      el.innerHTML = `<div><div class="bus-route-name">${r.name}</div><div class="bus-route-duration">${r.duration}</div></div><div>→</div>`;
      el.addEventListener('click', () => busPage.showSchedule(r)); routes.appendChild(el);
    });
  },
  async showSchedule(r) {
    $('bus-schedule-card').style.display = '';
    $('bus-route-name').textContent = r.name;
    let timesData = r.times;
    if (!isDemo()) {
      Log.info('Bus', '获取时刻表', { routeId: r.id });
      try {
        const [schedResult, nextResult] = await Promise.all([
          window.jlu.bus.getSchedule(r.id),
          window.jlu.bus.getNext(r.id)
        ]);
        if (schedResult.ok && schedResult.times) timesData = schedResult.times;
        if (nextResult.ok && nextResult.next) {
          const nb = $('bus-next');
          nb.innerHTML = `<div class="bus-next-time">${nextResult.next.time}</div><div class="bus-next-countdown">${nextResult.next.countdown || ''}</div>`;
        }
        Log.info('Bus', '时刻表获取成功');
      } catch (e) { Log.error('Bus', '获取时刻表异常', e); /* ignore */ }
    }
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    let nextBus = null;
    const times = $('bus-times'); times.innerHTML = '';
    timesData.forEach(t => {
      const [h, m] = t.split(':').map(Number);
      const diff = h * 60 + m - nowMin;
      const passed = diff < 0;
      const isNext = !passed && !nextBus; if (isNext) nextBus = { time: t, diff };
      const el = document.createElement('div'); el.className = `bus-time-tag${passed ? ' passed' : ''}${isNext ? ' next' : ''}`;
      el.textContent = t; times.appendChild(el);
    });
    const nb = $('bus-next');
    if (!isDemo() && nb && nb.querySelector('.bus-next-time')) return; // already set from IPC
    if (nextBus) {
      const mins = nextBus.diff;
      nb.innerHTML = `<div class="bus-next-time">${nextBus.time}</div><div class="bus-next-countdown ${mins <= 15 ? 'urgent' : ''}">${mins < 60 ? `${mins} 分钟后` : `${Math.floor(mins / 60)}h${mins % 60}m 后`}${mins <= 15 ? ' ⚡ 快到了！' : ''}</div>`;
    } else { nb.innerHTML = '<div class="bus-next-time">已收车</div><div class="bus-next-countdown">明天请早</div>'; }
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Delivery
// ═════════════════════════════════════════════════════════════════
const deliveryPage = {
  points: [
    { name: '菜鸟驿站（前卫南）', location: '东门', hours: '08:00-21:00', carriers: ['菜鸟', '中通', '圆通', '韵达'] },
    { name: '京东快递点', location: '南门', hours: '09:00-19:00', carriers: ['京东'] },
    { name: '顺丰速运', location: '西门', hours: '08:30-20:00', carriers: ['顺丰'] },
    { name: 'EMS 代收点', location: '邮局', hours: '09:00-17:00', carriers: ['EMS', '邮政'] },
  ],
  async init() {
    if (!isDemo()) {
      Log.info('Delivery', '获取快递信息');
      try {
        const [ptsResult, carriersResult] = await Promise.all([
          window.jlu.delivery.getPoints(),
          window.jlu.delivery.getCarriers()
        ]);
        if (ptsResult.ok && ptsResult.points) { deliveryPage.points = ptsResult.points; Log.info('Delivery', '快递点获取成功', { count: deliveryPage.points.length }); }
        if (carriersResult.ok && carriersResult.carriers) {
          const sel = $('delivery-carrier'); sel.innerHTML = '';
          carriersResult.carriers.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
        }
      } catch (e) { /* ignore on init */ }
    }
    // Carriers fallback if not populated by IPC
    const sel = $('delivery-carrier');
    if (sel && !sel.children.length) {
      ['顺丰', '京东', '中通', '圆通', '韵达', '申通', '极兔', 'EMS'].forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    }
    // Points
    const pts = $('delivery-points'); pts.innerHTML = '';
    deliveryPage.points.forEach(p => {
      const el = document.createElement('div'); el.className = 'delivery-point';
      el.innerHTML = `<div class="dp-name">${p.name}</div><div class="dp-info">📍 ${p.location} · 🕐 ${p.hours}</div><div class="dp-carriers">${p.carriers.map(c => `<span class="dp-carrier-tag">${c}</span>`).join('')}</div>`;
      pts.appendChild(el);
    });
    $('delivery-track')?.addEventListener('click', async () => {
      const trackingNo = $('delivery-no').value.trim(); if (!trackingNo) return Toast.warn('请输入运单号');
      const carrier = $('delivery-carrier').value;
      Toast.info('查询中...');
      $('delivery-result-card').style.display = '';
      const tl = $('delivery-timeline'); tl.innerHTML = '';
      if (!isDemo()) {
        Log.info('Delivery', '查询物流', { carrier, trackingNo });
        try {
          const result = await window.jlu.delivery.track({ carrier, trackingNo });
          if (result.ok && result.timeline) {
            Log.info('Delivery', '物流查询成功', { count: result.timeline.length });
            result.timeline.forEach(t => {
              const el = document.createElement('div'); el.className = 'timeline-item';
              el.innerHTML = `<div class="tl-time">${t.time}</div><div class="tl-desc">${t.desc}</div>`;
              tl.appendChild(el);
            });
            Toast.success('查询成功');
          } else { Log.error('Delivery', '物流查询失败', { error: result.error }); Toast.error(result.error || '查询失败'); }
        } catch (e) { Log.error('Delivery', '物流查询异常', e); Toast.error('查询失败：' + e.message); }
      } else {
        Log.debug('Delivery', '使用演示数据');
        [{ time: '2026-07-25 09:30', desc: '已签收，菜鸟驿站代收' }, { time: '2026-07-25 06:15', desc: '派件中' }, { time: '2026-07-24 22:00', desc: '到达长春转运中心' }, { time: '2026-07-23 14:00', desc: '已揽收' }].forEach(t => {
          const el = document.createElement('div'); el.className = 'timeline-item';
          el.innerHTML = `<div class="tl-time">${t.time}</div><div class="tl-desc">${t.desc}</div>`;
          tl.appendChild(el);
        });
      }
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: LibSeat
// ═════════════════════════════════════════════════════════════════
const libseatPage = {
  init() {
    const today = new Date().toISOString().split('T')[0];
    $('libseat-date').value = today; $('libseat-reserve-date').value = today;
    $('libseat-search')?.addEventListener('click', async () => {
      if (!isDemo()) {
        Log.info('LibSeat', '查询座位', { date: $('libseat-date').value, floor: $('libseat-floor').value });
        Toast.info('查询座位...');
        try {
          const result = await window.jlu.libseat.getSeats({
            floor: $('libseat-floor').value || '',
            date: $('libseat-date').value,
            timeSlot: { start: $('libseat-start').value, end: $('libseat-end').value }
          });
          if (result.ok) {
            Log.info('LibSeat', '座位查询成功', { count: result.seats?.length || 0 });
            Toast.success(`找到 ${result.seats?.length || 0} 个可用座位`);
          } else {
            Log.error('LibSeat', '座位查询失败', { error: result.error });
            Toast.error(result.error || '查询失败');
          }
        } catch (e) {
          Log.error('LibSeat', '座位查询异常', e);
          Toast.error('查询失败：' + e.message);
        }
      } else {
        Log.debug('LibSeat', '使用演示数据查询座位');
        Toast.info('查询座位...（演示模式）');
        if (isDevMode) {
          setTimeout(() => Toast.success('找到 15 个可用座位（演示）'), 800);
        }
      }
    });
    $('libseat-reserve')?.addEventListener('click', async () => {
      const s = $('libseat-seat').value.trim();
      if (!s) return Toast.warn('输入座位号');
      if (!isDemo()) {
        Log.info('LibSeat', '预约座位', { seat: s });
        try {
          const result = await window.jlu.libseat.reserve({
            seat: s,
            date: $('libseat-reserve-date').value,
            startTime: $('libseat-reserve-start').value,
            endTime: $('libseat-reserve-end').value
          });
          if (result.ok) { Log.info('LibSeat', '预约成功', { seat: s }); Toast.success(`座位 ${s} 预约成功`); }
          else { Log.error('LibSeat', '预约失败', { error: result.error }); Toast.error(result.error || '预约失败'); }
        } catch (e) {
          Log.error('LibSeat', '预约异常', e);
          Toast.error('预约失败：' + e.message);
        }
      } else {
        Log.debug('LibSeat', '使用演示数据预约');
        Toast.success(`座位 ${s} 预约成功（演示）`);
      }
    });
    $('libseat-auto-start-btn')?.addEventListener('click', async () => {
      const seats = $('libseat-auto-seats').value.trim();
      if (!seats) return Toast.warn('输入候选座位号');
      if (!isDemo()) {
        Log.info('LibSeat', '启动自动预约', { seats });
        try {
          const result = await window.jlu.libseat.autoReserve({
            seats: seats.split(/[,，]+/).map(s => s.trim()).filter(Boolean),
            startTime: $('libseat-auto-start').value,
            endTime: $('libseat-auto-end').value
          });
          if (result.ok) { Log.info('LibSeat', '自动预约已启动'); Toast.success('自动预约已启动'); }
          else { Log.error('LibSeat', '自动预约启动失败', { error: result.error }); Toast.error(result.error || '启动失败'); }
        } catch (e) {
          Log.error('LibSeat', '自动预约异常', e);
          Toast.error('启动失败：' + e.message);
        }
      } else {
        Log.debug('LibSeat', '使用演示数据启动自动预约');
        Toast.success('自动预约已启动（演示）');
      }
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Campus Map
// ═════════════════════════════════════════════════════════════════
const mapPage = {
  places: [
    { name: '逸夫楼', type: 'teaching', campus: '前卫南', desc: '主要教学楼' }, { name: '计算机楼', type: 'teaching', campus: '前卫南', desc: '计算机学院' },
    { name: '图书馆', type: 'library', campus: '前卫南', desc: '中心图书馆' }, { name: '一食堂', type: 'food', campus: '前卫南', desc: '大众餐饮' },
    { name: '莘子园', type: 'food', campus: '前卫南', desc: '清真/快餐' }, { name: '体育馆', type: 'sport', campus: '前卫南', desc: '室内运动' },
    { name: '菜鸟驿站', type: 'delivery', campus: '前卫南', desc: '快递收发' }, { name: '校医院', type: 'hospital', campus: '前卫南', desc: '校内医疗' },
  ],
  categories: [
    { id: 'all', icon: '🏠', name: '全部' }, { id: 'teaching', icon: '🏫', name: '教学楼' }, { id: 'food', icon: '🍜', name: '食堂' }, { id: 'library', icon: '📚', name: '图书馆' }, { id: 'delivery', icon: '📦', name: '快递' },
  ],
  async init() {
    if (!isDemo()) {
      Log.info('Map', '获取地图数据');
      try {
        const [campusResult, placesResult] = await Promise.all([
          window.jlu.map.getCampuses(),
          window.jlu.map.getPlaces()
        ]);
        if (placesResult.ok && placesResult.places) mapPage.places = placesResult.places;
        if (campusResult.ok && campusResult.categories) mapPage.categories = campusResult.categories;
        Log.info('Map', '地图数据获取成功', { places: mapPage.places.length, categories: mapPage.categories.length });
      } catch (e) { Log.error('Map', '获取地图数据异常', e); /* ignore on init */ }
    }
    const cats = $('map-categories'); cats.innerHTML = '';
    mapPage.categories.forEach(c => {
      const btn = document.createElement('button'); btn.className = `map-cat-btn${c.id === 'all' ? ' active' : ''}`; btn.textContent = `${c.icon || ''} ${c.name}`;
      btn.addEventListener('click', async () => {
        cats.querySelectorAll('.map-cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        if (!isDemo() && c.id !== 'all') {
          Log.info('Map', '获取分类地点', { category: c.id });
          try {
            const result = await window.jlu.map.getCategories(c.id);
            if (result.ok && result.places) { Log.info('Map', '分类地点获取成功', { count: result.places.length }); mapPage.render(null, result.places); return; }
          } catch (e) { Log.error('Map', '获取分类地点异常', e); /* fall through */ }
        }
        mapPage.render(c.id === 'all' ? null : c.id);
      });
      cats.appendChild(btn);
    });
    $('map-search-btn')?.addEventListener('click', async () => {
      const kw = $('map-search-input')?.value.trim(); if (!kw) return Toast.warn('请输入搜索关键词');
      Log.info('Map', '搜索地点', { keyword: kw });
      if (!isDemo()) {
        Toast.info('搜索中...');
        try {
          const result = await window.jlu.map.search(kw);
          if (result.ok) { Log.info('Map', '地点搜索成功', { count: result.places?.length || 0 }); Toast.success(`找到 ${result.places?.length || 0} 个地点`); mapPage.render(null, result.places); }
          else { Log.error('Map', '地点搜索失败', { error: result.error }); Toast.error(result.error || '搜索失败'); }
        } catch (e) { Log.error('Map', '地点搜索异常', e); Toast.error('搜索失败：' + e.message); }
      } else {
        Log.debug('Map', '使用演示数据搜索');
        const filtered = mapPage.places.filter(p => p.name.includes(kw) || p.desc.includes(kw));
        mapPage.render(null, filtered);
      }
    });
    mapPage.render();
  },
  render(type, customPlaces) {
    const list = $('map-places'); list.innerHTML = '';
    const source = customPlaces || mapPage.places;
    const filtered = type ? source.filter(p => p.type === type) : source;
    filtered.forEach(p => {
      const el = document.createElement('div'); el.className = 'map-place-card';
      el.innerHTML = `<div class="mp-name">${p.name}</div><div class="mp-type">${p.campus}</div><div class="mp-desc">${p.desc}</div>`;
      list.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Weather
// ═════════════════════════════════════════════════════════════════
const weatherPage = {
  init() {
    weatherPage.load();
    $('weather-campus')?.addEventListener('change', weatherPage.load);
  },
  async load() {
    const campus = $('weather-campus')?.value || 'south';
    let data;
    if (!isDemo()) { Log.info('Weather', '获取天气', { campus }); try { data = await window.jlu.weather.get(campus); Log.info('Weather', '天气获取成功'); } catch { data = null; } }
    if (!data || data.error) {
      Log.debug('Weather', '使用演示数据');
      data = { campus: '前卫南', current: { temp: 26, feelsLike: 28, humidity: 65, windSpeed: 12, desc: '局部多云' }, forecast: Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return { date: d.toISOString().split('T')[0], max: 28 + Math.random() * 4, min: 18 + Math.random() * 3, desc: ['☀️ 晴', '🌤️ 多云', '⛅ 阴', '🌧️ 小雨'][i % 4], rainChance: [0, 10, 30, 60][i % 4] }; }), advice: '🌤️ 微凉，建议穿长袖/薄外套' };
    }
    if (!data || data.error) {
      data = { campus: '前卫南', current: { temp: 26, feelsLike: 28, humidity: 65, windSpeed: 12, desc: '局部多云' }, forecast: Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return { date: d.toISOString().split('T')[0], max: 28 + Math.random() * 4, min: 18 + Math.random() * 3, desc: ['☀️ 晴', '🌤️ 多云', '⛅ 阴', '🌧️ 小雨'][i % 4], rainChance: [0, 10, 30, 60][i % 4] }; }), advice: '🌤️ 微凉，建议穿长袖/薄外套' };
    }
    const c = data.current;
    $('weather-current').innerHTML = `<div class="weather-temp">${c.temp}°C</div><div class="weather-desc">${c.desc}</div><div class="weather-details"><div class="weather-detail"><div class="weather-detail-val">${c.feelsLike}°C</div><div class="weather-detail-label">体感</div></div><div class="weather-detail"><div class="weather-detail-val">${c.humidity}%</div><div class="weather-detail-label">湿度</div></div><div class="weather-detail"><div class="weather-detail-val">${c.windSpeed}km/h</div><div class="weather-detail-label">风速</div></div></div><div class="weather-advice">${data.advice}</div>`;
    const fc = $('weather-forecast'); fc.innerHTML = '';
    data.forecast.forEach(f => {
      const d = new Date(f.date); const day = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      const el = document.createElement('div'); el.className = 'forecast-day';
      el.innerHTML = `<div class="forecast-date">周${day}</div><div class="forecast-icon">${f.desc?.match(/^[^\s]+/)?.[0] || '🌤️'}</div><div class="forecast-temp"><span class="forecast-temp-max">${Math.round(f.max)}°</span> / <span class="forecast-temp-min">${Math.round(f.min)}°</span></div><div class="forecast-rain">💧${f.rainChance}%</div>`;
      fc.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Notification
// ═════════════════════════════════════════════════════════════════
const notifPage = {
  notifications: [],
  init() {
    notifPage.loadConfig();
    window.jlu?.notification?.onNew?.(n => { notifPage.notifications.unshift(n); notifPage.render(); });
    window.jlu?.onNavigate?.(p => { if (p === 'notification') nav.switchTo('notification'); });

    // Listen for notification detail from main process (Windows notification click)
    window.jlu?.notification?.onShowDetail?.(n => { notifPage.showDetail(n); });

    $('notif-start')?.addEventListener('click', async () => { Log.info('Notif', '启动通知监控'); notifPage.saveConfig(); if (!isDemo()) await window.jlu.notification.start(); notifPage.setStatus(true); Log.info('Notif', '监控已启动'); Toast.success('监控已启动'); });
    $('notif-stop')?.addEventListener('click', async () => { Log.info('Notif', '停止通知监控'); if (!isDemo()) await window.jlu.notification.stop(); notifPage.setStatus(false); Log.info('Notif', '监控已停止'); Toast.info('已停止'); });
    $('notif-check')?.addEventListener('click', async () => { Log.info('Notif', '立即检查通知'); Toast.info('检查中...'); notifPage.addDemo(); Log.info('Notif', '检查完成'); Toast.success('检查完成'); $('notif-last-check').textContent = `上次检查：${new Date().toLocaleTimeString('zh-CN')}`; });
    $('notif-test')?.addEventListener('click', () => { Log.info('Notif', '发送测试通知'); if (!isDemo()) window.jlu.notification.test(); Toast.info('测试通知已发送'); });
    $('notif-use-vpn')?.addEventListener('change', e => { $('notif-vpn-fields').style.display = e.target.checked ? '' : 'none'; });

    // Notification detail modal
    $('notif-detail-close')?.addEventListener('click', () => notifPage.hideDetail());
    $('notif-detail-close-btn')?.addEventListener('click', () => notifPage.hideDetail());
    $('notif-detail-open')?.addEventListener('click', () => {
      const url = $('notif-detail-open').dataset.url;
      if (url) window.open(url, '_blank');
    });
    document.addEventListener('click', (e) => {
      if (e.target === $('notif-detail-modal')) notifPage.hideDetail();
    });
  },

  showDetail(n) {
    $('notif-detail-title').textContent = n.title || '通知详情';
    $('notif-detail-content').textContent = n.content || '(无内容)';
    const meta = [];
    if (n.dept) meta.push(n.dept);
    if (n.time) meta.push(n.time);
    if (n.date) meta.push(n.date);
    $('notif-detail-meta').textContent = meta.join(' · ');
    const openBtn = $('notif-detail-open');
    if (n.link && n.link !== '#') {
      openBtn.style.display = '';
      openBtn.dataset.url = n.link;
    } else {
      openBtn.style.display = 'none';
    }
    $('notif-detail-modal').style.display = '';
    // Mark as read
    n.read = true;
    notifPage.render();
  },

  hideDetail() {
    $('notif-detail-modal').style.display = 'none';
  },

  async loadConfig() {
    if (!isDemo()) { Log.info('Notif', '加载通知配置'); const c = await window.jlu.notification.getConfig(); $('notif-interval').value = c.interval; $('notif-channel').value = c.channel; $('notif-use-vpn').checked = c.useVpn; $('notif-skip-keywords').value = (c.skipKeywords || []).join(', '); notifPage.setStatus(c.enabled); }
  },
  saveConfig() { if (!isDemo()) window.jlu.notification.updateConfig({ interval: +$('notif-interval').value, channel: +$('notif-channel').value, useVpn: $('notif-use-vpn').checked, skipKeywords: $('notif-skip-keywords').value.split(/[,，]+/).map(s => s.trim()).filter(Boolean) }); },
  setStatus(r) { $('notif-status-badge').textContent = r ? '监控中' : '未启用'; $('notif-status-badge').className = r ? 'badge badge-success' : 'badge'; $('notif-start').disabled = r; $('notif-stop').disabled = !r; },
  addDemo() { notifPage.notifications.unshift({ id: Date.now(), title: '关于做好2026年暑假工作的通知', time: '2026-07-25', dept: '校长办公室', content: '根据学校安排，2026年暑假从7月27日开始，请各部门做好假期值班和安全工作。', read: false }); notifPage.render(); },
  render() {
    const list = $('notif-list'); list.innerHTML = '';
    if (!notifPage.notifications.length) { list.innerHTML = '<div class="notif-empty">暂无通知</div>'; return; }
    const unread = notifPage.notifications.filter(n => !n.read).length;
    $('notif-unread-count').textContent = `${unread} 条未读`;
    notifPage.notifications.forEach(n => {
      const el = document.createElement('div'); el.className = `notif-item ${n.read ? '' : 'unread'}`;
      el.innerHTML = `<div class="notif-item-header"><span class="notif-item-title">${n.title}</span><span class="notif-item-time">${n.time || ''}</span></div><span class="notif-item-dept">${n.dept || ''}</span><div class="notif-item-content">${(n.content || '').substring(0, 100)}${(n.content || '').length > 100 ? '...' : ''}</div>`;
      el.addEventListener('click', () => notifPage.showDetail(n));
      list.appendChild(el);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Pomodoro
// ═════════════════════════════════════════════════════════════════
const pomoPage = {
  timer: null, remaining: 0, running: false, paused: false,
  sessions: 0, totalMin: 0, activeTodoId: null, filter: 'active',

  init() {
    pomoPage.loadStatus();

    // Timer controls
    $('pomo-start')?.addEventListener('click', () => pomoPage.startFocus());
    $('pomo-pause')?.addEventListener('click', () => {
      if (pomoPage.paused) { pomoPage.paused = false; $('pomo-pause').textContent = '暂停'; }
      else { pomoPage.paused = true; $('pomo-pause').textContent = '继续'; }
    });
    $('pomo-stop')?.addEventListener('click', () => pomoPage.stopTimer());
    $('pomo-break')?.addEventListener('click', () => pomoPage.startBreak());

    // Todo add
    $('pomo-todo-add')?.addEventListener('click', () => pomoPage.addTodo());
    $('pomo-todo-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') pomoPage.addTodo(); });

    // Todo filters
    document.querySelectorAll('.todo-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pomoPage.filter = btn.dataset.filter;
        pomoPage.renderTodos();
      });
    });
  },

  // ─── Timer ────────────────────────────────────────────────
  startFocus(todoId) {
    const id = todoId || pomoPage.activeTodoId;
    if (pomoPage.running && !pomoPage.paused) return;
    if (pomoPage.paused) { pomoPage.paused = false; $('pomo-pause').textContent = '暂停'; return; }

    pomoPage.remaining = 25 * 60;
    pomoPage.running = true;
    pomoPage.paused = false;
    pomoPage.activeTodoId = id || null;
    Log.info('Pomo', '开始专注', { todoId: id });

    $('pomo-type').textContent = '专注中';
    $('pomo-start').style.display = 'none';
    $('pomo-pause').style.display = ''; $('pomo-pause').textContent = '暂停';
    $('pomo-stop').style.display = '';

    // Show focus task
    if (id) {
      const todo = pomoPage._todos?.find(t => t.id === id);
      if (todo) {
        $('pomo-focus-task').style.display = '';
        $('pomo-focus-title').textContent = todo.title;
      }
    } else { $('pomo-focus-task').style.display = 'none'; }

    pomoPage.timer = setInterval(() => {
      if (pomoPage.paused) return;
      pomoPage.remaining--;
      const m = Math.floor(pomoPage.remaining / 60), s = pomoPage.remaining % 60;
      $('pomo-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (pomoPage.remaining <= 0) pomoPage.complete();
    }, 1000);
  },

  startBreak() {
    if (pomoPage.running) return;
    Log.info('Pomo', '开始休息');
    pomoPage.remaining = 5 * 60;
    pomoPage.running = true; pomoPage.paused = false;
    $('pomo-type').textContent = '短休息';
    $('pomo-start').style.display = 'none';
    $('pomo-pause').style.display = ''; $('pomo-stop').style.display = '';
    $('pomo-focus-task').style.display = 'none';
    pomoPage.timer = setInterval(() => {
      if (pomoPage.paused) return;
      pomoPage.remaining--;
      const m = Math.floor(pomoPage.remaining / 60), s = pomoPage.remaining % 60;
      $('pomo-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (pomoPage.remaining <= 0) pomoPage.complete();
    }, 1000);
  },

  complete() {
    clearInterval(pomoPage.timer); pomoPage.running = false;
    pomoPage.sessions++; pomoPage.totalMin += 25;
    Log.info('Pomo', '番茄钟完成', { sessions: pomoPage.sessions, totalMinutes: pomoPage.totalMin });
    $('pomo-sessions').textContent = pomoPage.sessions;
    $('pomo-minutes').textContent = pomoPage.totalMin;
    $('pomo-display').textContent = '00:00'; $('pomo-type').textContent = '完成！';
    $('pomo-start').style.display = ''; $('pomo-pause').style.display = 'none'; $('pomo-stop').style.display = 'none';
    $('pomo-focus-task').style.display = 'none';
    Toast.success('番茄完成！');
    pomoPage.loadStatus(); // refresh stats
  },

  stopTimer() {
    Log.info('Pomo', '停止计时');
    clearInterval(pomoPage.timer); pomoPage.running = false; pomoPage.paused = false;
    $('pomo-display').textContent = '25:00'; $('pomo-type').textContent = '准备开始';
    $('pomo-start').style.display = ''; $('pomo-pause').style.display = 'none'; $('pomo-stop').style.display = 'none';
    $('pomo-focus-task').style.display = 'none';
  },

  // ─── Load status ─────────────────────────────────────────
  async loadStatus() {
    let status;
    if (!isDemo()) { Log.info('Pomo', '获取状态'); status = await window.jlu.pomo.getStatus(); Log.info('Pomo', '状态获取成功', { sessions: status.today?.sessions, todos: status.todos?.length }); }
    else { Log.debug('Pomo', '使用演示数据'); status = { today: { sessions: 3, totalMinutes: 75, history: [{ time: '09:30', duration: 25, todoTitle: '复习高数' }, { time: '10:05', duration: 25, todoTitle: '写实验报告' }, { time: '10:40', duration: 25, todoTitle: '' }] }, todos: pomoPage._demoTodos() }; }

    pomoPage.sessions = status.today?.sessions || 0;
    pomoPage.totalMin = status.today?.totalMinutes || 0;
    $('pomo-sessions').textContent = pomoPage.sessions;
    $('pomo-minutes').textContent = pomoPage.totalMin;

    // Render history
    const hist = $('pomo-history'); if (hist) {
      hist.innerHTML = '';
      (status.today?.history || []).slice(-6).reverse().forEach(h => {
        const el = document.createElement('div'); el.className = 'pomo-history-item';
        el.innerHTML = `<span class="ph-time">${h.time}</span><span class="ph-duration">${h.duration}min</span>${h.todoTitle ? `<span class="ph-task">→ ${h.todoTitle}</span>` : ''}`;
        hist.appendChild(el);
      });
    }

    // Render todos
    pomoPage._todos = status.todos || [];
    pomoPage.renderTodos();
  },

  _demoTodos() {
    return [
      { id: 'd1', title: '复习高等数学第5章', done: false, priority: 'high', pomodoros: 2, totalMinutes: 50 },
      { id: 'd2', title: '写数据结构实验报告', done: false, priority: 'urgent', pomodoros: 1, totalMinutes: 25 },
      { id: 'd3', title: '背英语单词 Unit 8', done: false, priority: 'normal', pomodoros: 0, totalMinutes: 0 },
      { id: 'd4', title: '整理计算机网络笔记', done: true, priority: 'normal', pomodoros: 3, totalMinutes: 75, completedAt: new Date().toISOString() },
    ];
  },

  // ─── Todo CRUD ───────────────────────────────────────────
  async addTodo() {
    const input = $('pomo-todo-input');
    const title = input?.value.trim(); if (!title) return;
    const priority = $('pomo-todo-priority')?.value || 'normal';
    Log.info('Pomo', '添加待办', { title, priority });

    if (!isDemo()) await window.jlu.pomo.addTodo({ title, priority });
    else { Log.debug('Pomo', '使用演示数据添加待办'); if (!pomoPage._todos) pomoPage._todos = []; pomoPage._todos.unshift({ id: Date.now().toString(), title, done: false, priority, pomodoros: 0, totalMinutes: 0 }); }

    input.value = '';
    pomoPage.renderTodos();
    Toast.success('已添加');
  },

  async toggleTodo(id) {
    if (!isDemo()) await window.jlu.pomo.toggleTodo(id);
    else { const t = pomoPage._todos?.find(x => x.id === id); if (t) t.done = !t.done; }
    pomoPage.renderTodos();
  },

  async deleteTodo(id) {
    if (!isDemo()) await window.jlu.pomo.deleteTodo(id);
    else { pomoPage._todos = pomoPage._todos?.filter(x => x.id !== id); }
    pomoPage.renderTodos();
  },

  focusTodo(id) {
    pomoPage.activeTodoId = id;
    pomoPage.startFocus(id);
  },

  // ─── Render Todos ────────────────────────────────────────
  renderTodos() {
    const list = $('pomo-todo-list'); if (!list) return;
    let todos = pomoPage._todos || [];

    // Filter
    if (pomoPage.filter === 'active') todos = todos.filter(t => !t.done);
    else if (pomoPage.filter === 'done') todos = todos.filter(t => t.done);

    // Sort: urgent > high > normal > low, then by pomodoros desc
    const prio = { urgent: 0, high: 1, normal: 2, low: 3 };
    todos.sort((a, b) => (prio[a.priority] || 2) - (prio[b.priority] || 2) || (b.pomodoros || 0) - (a.pomodoros || 0));

    // Count
    const active = (pomoPage._todos || []).filter(t => !t.done).length;
    $('pomo-todo-count').textContent = `${active} 项待完成`;

    list.innerHTML = '';
    todos.forEach(t => {
      const el = document.createElement('div');
      el.className = `todo-item ${t.done ? 'done' : ''} priority-${t.priority || 'normal'}`;
      el.innerHTML = `
        <button class="todo-check ${t.done ? 'checked' : ''}" data-id="${t.id}">
          ${t.done ? '<svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 6,11 12,3" stroke="#fff" stroke-width="2" fill="none"/></svg>' : ''}
        </button>
        <div class="todo-content">
          <span class="todo-title">${t.title}</span>
          <span class="todo-meta">
            ${t.pomodoros ? `${t.pomodoros} 个番茄 · ${t.totalMinutes || 0}min` : ''}
            ${t.priority === 'urgent' ? ' · 紧急' : t.priority === 'high' ? ' · 重要' : ''}
          </span>
        </div>
        <div class="todo-actions">
          ${!t.done ? `<button class="todo-focus-btn" data-id="${t.id}" title="为此任务开始专注">▶</button>` : ''}
          <button class="todo-delete-btn" data-id="${t.id}" title="删除">✕</button>
        </div>
      `;

      // Events
      el.querySelector('.todo-check')?.addEventListener('click', () => pomoPage.toggleTodo(t.id));
      el.querySelector('.todo-focus-btn')?.addEventListener('click', () => pomoPage.focusTodo(t.id));
      el.querySelector('.todo-delete-btn')?.addEventListener('click', () => pomoPage.deleteTodo(t.id));

      list.appendChild(el);
    });

    if (todos.length === 0) {
      list.innerHTML = `<div class="notif-empty">${pomoPage.filter === 'done' ? '暂无已完成任务' : pomoPage.filter === 'active' ? '所有任务已完成！' : '暂无待办'}</div>`;
    }
  },
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Calendar Export
// ═════════════════════════════════════════════════════════════════
const calPage = {
  init() {
    $('cal-export-courses')?.addEventListener('click', async () => {
      Log.info('Cal', '导出课程表');
      if (!isDemo()) {
        Toast.info('正在导出课程表...');
        try {
          const result = await window.jlu.cal.exportCourses({ courses: [], semesterStart: '2026-09-01', weeks: 20 });
          if (result.ok) {
            Log.info('Cal', '课程表导出成功', { path: result.path });
            Toast.success('课程表已导出为 .ics 文件');
            if (result.path) window.jlu?.shell?.showItemInFolder(result.path);
          } else { Log.error('Cal', '课程表导出失败', { error: result.error }); Toast.error(result.error || '导出失败'); }
        } catch (e) { Log.error('Cal', '课程表导出异常', e); Toast.error('导出失败：' + e.message); }
      } else { Log.debug('Cal', '使用演示数据导出课程表'); Toast.success('课程表已导出为 .ics 文件（演示）'); }
    });
    $('cal-export-exams')?.addEventListener('click', async () => {
      Log.info('Cal', '导出考试安排');
      if (!isDemo()) {
        Toast.info('正在导出考试安排...');
        try {
          const result = await window.jlu.cal.exportExams([]);
          if (result.ok) {
            Log.info('Cal', '考试安排导出成功', { path: result.path });
            Toast.success('考试安排已导出为 .ics 文件');
            if (result.path) window.jlu?.shell?.showItemInFolder(result.path);
          } else { Log.error('Cal', '考试安排导出失败', { error: result.error }); Toast.error(result.error || '导出失败'); }
        } catch (e) { Log.error('Cal', '考试安排导出异常', e); Toast.error('导出失败：' + e.message); }
      } else { Log.debug('Cal', '使用演示数据导出考试安排'); Toast.success('考试安排已导出为 .ics 文件（演示）'); }
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Settings
// ═════════════════════════════════════════════════════════════════
const settingsPage = {
  init() {
    settingsPage.loadAutoStart();
    settingsPage.loadDevMode();
    settingsPage.loadExitBehavior();
    settingsPage.loadCredentials();
    settingsPage.loadCredits();

    // Auto-start toggle
    $('autostart-toggle')?.addEventListener('change', async e => {
      const on = e.target.checked;
      Log.info('Settings', '切换开机自启', { enabled: on });
      if (!isDemo()) await window.jlu.autostart.setEnabled(on);
      $('autostart-badge').textContent = on ? '已启用' : '未启用'; $('autostart-badge').className = on ? 'badge badge-success' : 'badge';
      Toast.success(on ? '已启用开机自启' : '已禁用开机自启');
    });
    $('autostart-hidden')?.addEventListener('change', async e => { if (!isDemo()) await window.jlu.autostart.setHiddenStart(e.target.checked); });

    // Auto-start notification monitor
    $('autostart-notifmonitor')?.addEventListener('change', async (e) => {
      const on = e.target.checked;
      try { await window.jlu.settings.set('notifMonitor', on); } catch {}
      Toast.info(on ? '已开启自动通知监控' : '已关闭自动通知监控');
    });
    (async () => {
      try { const v = await window.jlu.settings.get('notifMonitor'); if ($('autostart-notifmonitor')) $('autostart-notifmonitor').checked = v === true; } catch {}
    })();

    // Auto-start DrCOM login
    $('autostart-drcom')?.addEventListener('change', async (e) => {
      const on = e.target.checked;
      try { await window.jlu.settings.set('drcomAutoLogin', on); } catch {}
      Toast.info(on ? '已开启自动登录校园网' : '已关闭自动登录校园网');
      if (on && !isDemo()) {
        // Check if DrCOM credentials are saved
        try {
          const hasCred = await window.jlu.cred.has('drcom');
          if (!hasCred) Toast.warn('请先在 DrCOM 页面保存账号密码');
        } catch {}
      }
    });
    (async () => {
      try { const v = await window.jlu.settings.get('drcomAutoLogin'); if ($('autostart-drcom')) $('autostart-drcom').checked = v === true; } catch {}
    })();

    // Developer Mode
    $('devmode-toggle')?.addEventListener('change', async (e) => {
      isDevMode = e.target.checked;
      Log.info('Settings', '切换开发者模式', { enabled: isDevMode });
      try { await window.jlu.settings.set('devMode', isDevMode); } catch {}
      $('devmode-badge').textContent = isDevMode ? '已开启' : '已关闭';
      $('devmode-badge').className = isDevMode ? 'badge badge-warn' : 'badge';
      document.body.classList.toggle('is-dev', isDevMode);
      Toast.info(isDevMode ? '开发者模式已开启' : '开发者模式已关闭');
      // Refresh all pages to reflect dev mode
      settingsPage.reloadPageData();
    });

    // Exit Behavior
    document.querySelectorAll('input[name="exit-behavior"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        if (radio.checked) {
          try { await window.jlu.settings.set('exitBehavior', radio.value); } catch {}
          Toast.info(`退出行为已设置为：${radio.value === 'tray' ? '最小化到托盘' : '彻底退出'}`);
        }
      });
    });

    $('about-platform').textContent = `${navigator.platform} · Chrome ${navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] || ''}`;
  },

  reloadPageData() {
    // Re-initialize pages that show demo data based on dev mode
    schedulePage.renderCourses();
    if (isDevMode) {
      gradePage.init();
      examPage.init();
      gradPage.init();
      cardPage.init();
    }
  },

  async loadAutoStart() {
    if (!isDemo()) { Log.info('Settings', '加载自启配置'); const c = await window.jlu.autostart.getConfig(); $('autostart-toggle').checked = c.enabled; $('autostart-hidden').checked = c.openAsHidden; $('autostart-badge').textContent = c.enabled ? '已启用' : '未启用'; $('autostart-badge').className = c.enabled ? 'badge badge-success' : 'badge'; }
  },

  async loadDevMode() {
    try {
      const v = await window.jlu.settings.get('devMode');
      isDevMode = v === true;
    } catch { isDevMode = false; }
    $('devmode-toggle').checked = isDevMode;
    $('devmode-badge').textContent = isDevMode ? '已开启' : '已关闭';
    $('devmode-badge').className = isDevMode ? 'badge badge-warn' : 'badge';
    document.body.classList.toggle('is-dev', isDevMode);
  },

  async loadExitBehavior() {
    try {
      const v = await window.jlu.settings.get('exitBehavior');
      if (v === 'tray' || v === 'quit') {
        document.querySelector(`input[name="exit-behavior"][value="${v}"]`).checked = true;
      }
    } catch {}
  },

  // ─── Credentials ──────────────────────────────────────────
  async loadCredentials() {
    let systems, saved;
    if (!isDemo()) {
      Log.info('Settings', '加载凭据列表');
      systems = await window.jlu.cred.getSystems();
      saved = await window.jlu.cred.getAll();
    } else {
      systems = [
        { id: 'edu', name: '教务系统', desc: 'icourses.jlu.edu.cn，成绩/课表/选课/考试', icon: 'book' },
        { id: 'study', name: '学在吉大', desc: 'study.jlu.edu.cn，视频课程', icon: 'book' },
        { id: 'drcom', name: 'DrCOM 校园网', desc: '校园网认证登录', icon: 'network' },
        { id: 'campuscard', name: '校园一卡通', desc: '余额/消费查询', icon: 'bankCard' },
        { id: 'vpn', name: 'VPN', desc: 'Web VPN 登录（校外访问）', icon: 'globe' },
        { id: 'libseat', name: '图书馆座位', desc: 'libseat.jlu.edu.cn，座位预约', icon: 'seat' },
      ];
      saved = { edu: { username: '2023****', hasPassword: true, maskedPassword: '••••••••' } };
    }
    settingsPage.renderCredentials(systems, saved);
  },

  renderCredentials(systems, saved) {
    const list = $('cred-list'); if (!list) return; list.innerHTML = '';
    systems.forEach(sys => {
      const cred = saved[sys.id];
      const hasCred = cred && cred.hasPassword;
      const el = document.createElement('div');
      el.className = `cred-item ${hasCred ? 'cred-active' : ''}`;
      el.innerHTML = `
        <div class="cred-info">
          <span class="cred-icon" data-icon="${sys.icon}" data-icon-size="20"></span>
          <div class="cred-text">
            <span class="cred-name">${sys.name}</span>
            <span class="cred-desc">${sys.desc}</span>
            ${hasCred ? `<span class="cred-user">${cred.username} · ${cred.maskedPassword}</span>` : '<span class="cred-user cred-empty">未配置</span>'}
          </div>
        </div>
        <div class="cred-actions">
          ${hasCred ? `<button class="btn btn-ghost cred-edit" data-system="${sys.id}">编辑</button><button class="btn btn-ghost cred-del" data-system="${sys.id}">清除</button>` : `<button class="btn btn-primary cred-edit" data-system="${sys.id}">配置</button>`}
        </div>
      `;

      el.querySelector('.cred-edit')?.addEventListener('click', () => settingsPage.editCredential(sys));
      el.querySelector('.cred-del')?.addEventListener('click', async () => {
        Log.info('Settings', '清除凭据', { system: sys.id });
        if (!isDemo()) await window.jlu.cred.delete(sys.id);
        Toast.info(`已清除 ${sys.name} 凭据`);
        settingsPage.loadCredentials();
      });

      list.appendChild(el);
    });
    // Render icons in cred items
    list.querySelectorAll('[data-icon]').forEach(el => {
      el.innerHTML = getIcon(el.dataset.icon, parseInt(el.dataset.iconSize) || 20);
    });
  },

  editCredential(sys) {
    Modal.show(`${sys.name} - 配置账号`).then(async (result) => {
      if (!result) return; // cancelled
      Log.info('Settings', '保存凭据', { system: sys.id });
      if (!isDemo()) await window.jlu.cred.set(sys.id, result.username, result.password);
      Toast.success(`${sys.name} 凭据已保存`);
      settingsPage.loadCredentials();
    });
  },

  // ─── Open Source Credits ──────────────────────────────────
  async loadCredits() {
    let credits;
    if (!isDemo()) credits = await window.jlu.app.getCredits();
    else credits = [
      { name: 'jlu-vpns-dokodemo-door', author: 'MerlynAllen', url: 'https://github.com/MerlynAllen/jlu-vpns-dokodemo-door', desc: 'VPN URL 转换', license: 'MIT' },
      { name: 'drcom-jlu-qt', author: 'code4lala', url: 'https://github.com/code4lala/drcom-jlu-qt', desc: 'DrCOM 校园网认证', license: 'GPL-3.0' },
      { name: 'JLU_schedule', author: 'JFyuhong', url: 'https://github.com/JFyuhong/JLU_schedule', desc: '吉林大学课表', license: 'MIT' },
      { name: 'StudyAtJLU_Desktop', author: 'RikaCelery', url: 'https://github.com/RikaCelery/StudyAtJLU_Desktop', desc: '学在吉大桌面客户端', license: 'MIT' },
      { name: 'JLUiCourse', author: 'wzyyyyyyy', url: 'https://github.com/wzyyyyyyy/JLUiCourse', desc: '自动抢课助手', license: 'MIT' },
      { name: 'JLU LibSeat PC Wide', author: 'flash122u', url: 'https://github.com/flash122u/jlu-libseat-pc-wide', desc: '图书馆座位预约增强', license: 'MIT' },
      { name: 'Reachee', author: 'TechCiel', url: 'https://github.com/TechCiel/Reachee', desc: 'OA 通知爬虫', license: 'WTFPL' },
      { name: 'IconPark', author: 'ByteDance', url: 'https://github.com/bytedance/IconPark', desc: '2600+ SVG 图标库', license: 'Apache-2.0' },
      { name: 'Open-Meteo', author: 'Open-Meteo', url: 'https://open-meteo.com', desc: '开源天气 API', license: 'CC-BY-4.0' },
      { name: 'Electron', author: 'OpenJS Foundation', url: 'https://www.electronjs.org', desc: '跨平台桌面应用框架', license: 'MIT' },
    ];
    settingsPage.renderCredits(credits);
  },

  renderCredits(credits) {
    const grid = $('credits-grid'); if (!grid) return; grid.innerHTML = '';
    credits.forEach(c => {
      const el = document.createElement('div'); el.className = 'credit-card';
      el.innerHTML = `
        <div class="credit-name"><a href="#" class="credit-link" data-url="${c.url}">${c.name}</a></div>
        <div class="credit-author">${c.author}</div>
        <div class="credit-desc">${c.desc}</div>
        <span class="credit-license">${c.license}</span>
      `;
      el.querySelector('.credit-link')?.addEventListener('click', e => {
        e.preventDefault();
        if (c.url) window.open(c.url, '_blank');
      });
      grid.appendChild(el);
    });
  },
};

// ═════════════════════════════════════════════════════════════════
// PAGE: PC Toolbox
// ═════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════
// PAGE: PC Toolbox (Memory Optimization)
// ═════════════════════════════════════════════════════════════════
const pctoolboxPage = {
  init() {
    // Load initial memory stats
    pctoolboxPage.loadStats();

    $('pctoolbox-optimize')?.addEventListener('click', async () => {
      Log.info('PCToolbox', '开始内存优化');
      $('pctoolbox-optimize').disabled = true;
      $('pctoolbox-optimize').textContent = '优化中...';
      try {
        let result;
        if (!isDemo()) {
          result = await window.jlu.pc.optimizeMemory();
        } else {
          Log.debug('PCToolbox', '使用演示数据');
          result = await pctoolboxPage._simulateOptimize();
        }
        if (result.ok) {
          Log.info('PCToolbox', '内存优化完成', { freed: result.freed });
          pctoolboxPage._showResult(result);
          Toast.success(`内存优化完成！释放了 ${pctoolboxPage._formatBytes(result.freed)}`);
        } else {
          Log.error('PCToolbox', '内存优化失败', { error: result.error });
          Toast.error('优化失败：' + (result.error || '未知错误'));
        }
      } catch (e) {
        Log.error('PCToolbox', '内存优化异常', e);
        Toast.error('优化失败：' + e.message);
      }
      $('pctoolbox-optimize').disabled = false;
      $('pctoolbox-optimize').textContent = '开始优化';
    });
  },

  async loadStats() {
    try {
      let mem;
      if (!isDemo()) {
        Log.info('PCToolbox', '获取内存信息');
        mem = await window.jlu.pc.getMemInfo();
      } else {
        Log.debug('PCToolbox', '使用演示内存数据');
        mem = { total: 16*1073741824, free: 4*1073741824 };
      }
      $('pctoolbox-remaining').textContent = pctoolboxPage._formatBytes(mem.free);
    } catch {
      $('pctoolbox-remaining').textContent = '—';
    }
  },

  _showResult(r) {
    $('pctoolbox-freed').textContent = pctoolboxPage._formatBytes(r.freed);
    $('pctoolbox-remaining').textContent = pctoolboxPage._formatBytes(r.remaining);
    $('pctoolbox-before').textContent = pctoolboxPage._formatBytes(r.before);
    $('pctoolbox-after').textContent = pctoolboxPage._formatBytes(r.after);
    $('pctoolbox-freed-detail').textContent = pctoolboxPage._formatBytes(r.freed);
    $('pctoolbox-remaining-detail').textContent = pctoolboxPage._formatBytes(r.remaining);
    $('pctoolbox-result').style.display = '';
  },

  _simulateOptimize() {
    const totalMem = 16 * 1073741824;
    const usedBefore = Math.floor(totalMem * (0.6 + Math.random() * 0.15));
    const freed = Math.floor(usedBefore * (0.12 + Math.random() * 0.1));
    const usedAfter = usedBefore - freed;
    const remaining = totalMem - usedAfter;
    return Promise.resolve({
      ok: true,
      before: usedBefore,
      after: usedAfter,
      freed: freed,
      remaining: remaining,
      total: totalMem
    });
  },

  _formatBytes(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }
};

// ─── System Memory Helper (approximate) ──────────────────────────
function osTotalMem() {
  try {
    // Use Electron's process.getSystemMemoryInfo if available
    if (typeof process !== 'undefined' && process.getSystemMemoryInfo) {
      const info = process.getSystemMemoryInfo();
      return info.total * 1024; // convert KB to bytes
    }
  } catch {}
  // Fallback: assume 8GB - 32GB RAM based on rough heuristic
  return 16 * 1073741824; // 16 GB as default
}

// ═════════════════════════════════════════════════════════════════
// PAGE: Dev CLI (dev mode only)
// ═════════════════════════════════════════════════════════════════
const devcliPage = {
  _ipcList: [],
  _history: [],
  _historyIdx: -1,
  _inactivityTimer: null,
  _refHideTimer: null,
  _refInteracting: false,

  // ─── Complete API documentation ─────────────────────────────
  _apiDocs: {},

  init() {
    devcliPage._buildIpcList();
    devcliPage._buildDocs();
    devcliPage._setupTerminal();
    devcliPage._setupRefPanel();
    devcliPage._setupHint();
    devcliPage._setupGlobalKeys();
  },

  // ─── Build API tree from window.jlu ─────────────────────────
  _buildIpcList() {
    const apis = [];
    if (!window.jlu) return;
    const walk = (obj, prefix) => {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = prefix ? prefix + '.' + key : key;
        if (typeof val === 'function') apis.push({ channel: path, name: key, fn: val });
        else if (typeof val === 'object' && val !== null && key !== 'onNavigate' && key !== 'onChanged' && !key.startsWith('on')) { walk(val, path); }
      }
    };
    walk(window.jlu, '');
    this._ipcList = apis;
  },

  // ─── Full documentation for ALL IPC endpoints ─────────────
  _buildDocs() {
    this._apiDocs = {
      // Window
      'window.minimize': { desc: '最小化窗口', example: 'window.minimize', params: [] },
      'window.maximize': { desc: '切换最大化/还原', example: 'window.maximize', params: [] },
      'window.close': { desc: '关闭窗口（根据退出行为设置）', example: 'window.close', params: [] },
      // VPN
      'vpn.start': { desc: '启动 VPN 代理服务', example: 'vpn.start { port: 8080, mode: "redirect" }', params: ['config: { port: number, mode: "redirect"|"proxy"|"host" }'] },
      'vpn.stop': { desc: '停止 VPN 代理服务', example: 'vpn.stop', params: [] },
      'vpn.convert': { desc: '将 URL 转换为 VPN 地址', example: 'vpn.convert "https://www.example.com"', params: ['url: string'] },
      'vpn.addHost': { desc: '添加 Host 映射域名', example: 'vpn.addHost "example.com"', params: ['domain: string'] },
      'vpn.removeHost': { desc: '移除 Host 映射域名', example: 'vpn.removeHost "example.com"', params: ['domain: string'] },
      'vpn.getHosts': { desc: '获取所有 Host 映射', example: 'vpn.getHosts', params: [] },
      // DrCOM
      'drcom.login': { desc: 'DrCOM 校园网登录', example: 'drcom.login { server: "10.6.8.1", username: "...", password: "..." }', params: ['config: { server, username, password, mac? }'] },
      'drcom.logout': { desc: '校园网登出', example: 'drcom.logout', params: [] },
      'drcom.status': { desc: '获取认证状态', example: 'drcom.status', params: [] },
      // Schedule
      'schedule.getAll': { desc: '获取所有课程', example: 'schedule.getAll', params: [] },
      'schedule.getCurrent': { desc: '获取当前学期', example: 'schedule.getCurrent', params: [] },
      'schedule.setCurrent': { desc: '设置当前学期', example: 'schedule.setCurrent "2025-1"', params: ['id: string'] },
      'schedule.create': { desc: '添加课程', example: 'schedule.create { name: "高数", dayOfWeek: 1, startSlot: 1, endSlot: 2 }', params: ['data: object'] },
      'schedule.update': { desc: '更新课程', example: 'schedule.update "courseId" { name: "新名称" }', params: ['id: string', 'data: object'] },
      'schedule.delete': { desc: '删除课程', example: 'schedule.delete "courseId"', params: ['id: string'] },
      'schedule.importFromWeb': { desc: '从教务导入课表', example: 'schedule.importFromWeb { semesterStart: "2025-09-01", courses: [...] }', params: ['data: { semesterStart, courses }'] },
      // Study
      'study.getCourses': { desc: '获取学在吉大课程列表', example: 'study.getCourses { username: "...", password: "..." }', params: ['config: { username, password }'] },
      'study.getVideos': { desc: '获取课程视频列表', example: 'study.getVideos { username: "...", password: "...", courseId: "..." }', params: ['config: { username, password, courseId }'] },
      'study.download': { desc: '下载视频', example: 'study.download "https://..." "D:/video.mp4"', params: ['url: string', 'savePath: string'] },
      // CourseGrab
      'course.start': { desc: '启动自动抢课', example: 'course.start { courseIds: [...], interval: 1000 }', params: ['config: object'] },
      'course.stop': { desc: '停止抢课', example: 'course.stop', params: [] },
      // LibSeat
      'libseat.getSeats': { desc: '查询图书馆可用座位', example: 'libseat.getSeats { floor: "2", date: "2026-09-01", timeSlot: {...} }', params: ['config: { floor?, date, timeSlot }'] },
      'libseat.reserve': { desc: '预约座位', example: 'libseat.reserve { seat: "62", date: "2026-09-01", startTime: "08:00", endTime: "22:00" }', params: ['config: object'] },
      'libseat.autoReserve': { desc: '启动自动抢座位', example: 'libseat.autoReserve { seats: ["62","63"], startTime: "08:00", endTime: "22:00" }', params: ['config: object'] },
      // Notification
      'notification.start': { desc: '启动 OA 通知监控', example: 'notification.start', params: [] },
      'notification.stop': { desc: '停止通知监控', example: 'notification.stop', params: [] },
      'notification.checkNow': { desc: '立即检查新通知', example: 'notification.checkNow', params: [] },
      'notification.getConfig': { desc: '获取通知爬虫配置', example: 'notification.getConfig', params: [] },
      'notification.updateConfig': { desc: '更新通知爬虫配置', example: 'notification.updateConfig { interval: 300, channel: 0 }', params: ['config: object'] },
      'notification.test': { desc: '发送测试 Windows 通知', example: 'notification.test', params: [] },
      // AutoStart
      'autostart.getConfig': { desc: '获取开机自启动配置', example: 'autostart.getConfig', params: [] },
      'autostart.setEnabled': { desc: '设置开机自启动', example: 'autostart.setEnabled true', params: ['enabled: boolean'] },
      'autostart.setHiddenStart': { desc: '设置启动后隐藏窗口', example: 'autostart.setHiddenStart true', params: ['hidden: boolean'] },
      // Card
      'card.getBalance': { desc: '获取校园卡余额', example: 'card.getBalance { cardNumber: "..." }', params: ['config: { cardNumber? }'] },
      'card.getTransactions': { desc: '获取消费流水', example: 'card.getTransactions { cardNumber: "..." }', params: ['config: { cardNumber? }'] },
      'card.getDemo': { desc: '获取演示校园卡数据', example: 'card.getDemo', params: [] },
      // Cafeteria
      'cafeteria.getList': { desc: '获取食堂列表', example: 'cafeteria.getList', params: [] },
      'cafeteria.getCrowd': { desc: '获取食堂拥挤度', example: 'cafeteria.getCrowd "cafe1"', params: ['id: string'] },
      'cafeteria.getMenu': { desc: '获取食堂菜单', example: 'cafeteria.getMenu "cafe1"', params: ['id: string'] },
      // Bus
      'bus.getRoutes': { desc: '获取校车路线', example: 'bus.getRoutes', params: [] },
      'bus.getSchedule': { desc: '获取路线时刻表', example: 'bus.getSchedule "route1"', params: ['routeId: string'] },
      'bus.getNext': { desc: '获取下一班车信息', example: 'bus.getNext "route1"', params: ['routeId: string'] },
      // Grade
      'grade.get': { desc: '获取成绩数据', example: 'grade.get { username: "...", password: "..." }', params: ['config: object'] },
      'grade.calcGPA': { desc: '计算 GPA', example: 'grade.calcGPA [{ name: "高数", score: 95, credit: 5 }]', params: ['courses: array'] },
      'grade.getDemo': { desc: '获取演示成绩数据', example: 'grade.getDemo', params: [] },
      'grade.getDistribution': { desc: '获取成绩分布', example: 'grade.getDistribution [{...}]', params: ['courses: array'] },
      // Exam
      'exam.get': { desc: '获取考试安排', example: 'exam.get { semester: "2025-1" }', params: ['config: object'] },
      'exam.getDemo': { desc: '获取演示考试数据', example: 'exam.getDemo', params: [] },
      'exam.getCountdowns': { desc: '计算考试倒计时', example: 'exam.getCountdowns [{ date: "2026-01-15", time: "08:00" }]', params: ['exams: array'] },
      // Grad
      'grad.getTemplates': { desc: '获取培养方案模板', example: 'grad.getTemplates', params: [] },
      'grad.analyze': { desc: '分析学分完成进度', example: 'grad.analyze "template1" [...]', params: ['templateId: string', 'courses: array'] },
      'grad.getDemo': { desc: '获取演示学分数据', example: 'grad.getDemo', params: [] },
      // Map
      'map.getCampuses': { desc: '获取校区列表', example: 'map.getCampuses', params: [] },
      'map.getPlaces': { desc: '获取校区内设施', example: 'map.getPlaces "south"', params: ['campusId: string'] },
      'map.search': { desc: '搜索设施', example: 'map.search "食堂"', params: ['keyword: string'] },
      'map.getCategories': { desc: '获取设施分类', example: 'map.getCategories', params: [] },
      // Classroom
      'classroom.get': { desc: '查询空教室', example: 'classroom.get { date: "2026-09-01", building: "逸夫楼", startSlot: 1, endSlot: 4 }', params: ['config: { date, building?, startSlot, endSlot }'] },
      'classroom.getDemo': { desc: '获取演示空教室数据', example: 'classroom.getDemo { building: "逸夫楼" }', params: ['config: object'] },
      // Delivery
      'delivery.getPoints': { desc: '获取校内快递点', example: 'delivery.getPoints', params: [] },
      'delivery.track': { desc: '查询快递物流', example: 'delivery.track { carrier: "yunda", trackingNo: "123456" }', params: ['config: { carrier, trackingNo }'] },
      'delivery.getCarriers': { desc: '获取支持的快递公司', example: 'delivery.getCarriers', params: [] },
      // Review
      'review.search': { desc: '搜索课程评价', example: 'review.search "高等数学"', params: ['keyword: string'] },
      'review.get': { desc: '获取课程评价详情', example: 'review.get "c1"', params: ['courseId: string'] },
      'review.add': { desc: '提交课程评价', example: 'review.add { courseId: "c1", rating: 5, content: "很好" }', params: ['review: object'] },
      // Weather
      'weather.get': { desc: '获取天气（校区: south/north/chaoyi）', example: 'weather.get "south"', params: ['campus: string'] },
      // Pomo
      'pomo.getStatus': { desc: '获取番茄钟状态', example: 'pomo.getStatus', params: [] },
      'pomo.start': { desc: '开始番茄钟（type: "focus"/"break", todoId 可选）', example: 'pomo.start "focus"', params: ['type: string', 'todoId?: string'] },
      'pomo.pause': { desc: '暂停番茄钟', example: 'pomo.pause', params: [] },
      'pomo.resume': { desc: '恢复番茄钟', example: 'pomo.resume', params: [] },
      'pomo.stop': { desc: '停止番茄钟', example: 'pomo.stop', params: [] },
      'pomo.updateConfig': { desc: '更新番茄钟配置', example: 'pomo.updateConfig { focusDuration: 25, breakDuration: 5 }', params: ['config: object'] },
      'pomo.addTodo': { desc: '添加待办事项', example: 'pomo.addTodo { text: "复习高数", estimatedPomodoros: 3 }', params: ['data: object'] },
      'pomo.updateTodo': { desc: '更新待办', example: 'pomo.updateTodo "todoId" { text: "改需求" }', params: ['id: string', 'updates: object'] },
      'pomo.deleteTodo': { desc: '删除待办', example: 'pomo.deleteTodo "todoId"', params: ['id: string'] },
      'pomo.toggleTodo': { desc: '切换待办完成状态', example: 'pomo.toggleTodo "todoId"', params: ['id: string'] },
      'pomo.reorderTodo': { desc: '重排待办顺序', example: 'pomo.reorderTodo 1 3', params: ['from: number', 'to: number'] },
      // Share
      'share.generate': { desc: '生成课表分享图', example: 'share.generate { courses: [...], options: {...} }', params: ['courses: array', 'options: object'] },
      // Calendar
      'cal.exportCourses': { desc: '导出课表为 .ics 文件', example: 'cal.exportCourses { courses: [...], semesterStart: "2026-09-01", weeks: 16 }', params: ['config: object'] },
      'cal.exportExams': { desc: '导出考试安排为 .ics', example: 'cal.exportExams [{ name: "高数", date: "2026-01-15", time: "08:00", location: "..." }]', params: ['exams: array'] },
      'cal.showInFolder': { desc: '在文件管理器中打开文件所在位置', example: 'cal.showInFolder "C:/path/to/file.ics"', params: ['filePath: string'] },
      // Edu
      'edu.login': { desc: '教务系统登录', example: 'edu.login { username: "...", password: "..." }', params: ['config: { username, password }'] },
      'edu.fetchGrades': { desc: '获取教务成绩', example: 'edu.fetchGrades', params: [] },
      'edu.fetchSchedule': { desc: '获取教务课表', example: 'edu.fetchSchedule { semester: "2025-1" }', params: ['config: object'] },
      'edu.fetchExams': { desc: '获取教务考试安排', example: 'edu.fetchExams', params: [] },
      'edu.checkAvailability': { desc: '检查教务系统可访问性', example: 'edu.checkAvailability', params: [] },
      // Cred
      'cred.get': { desc: '获取指定系统凭据', example: 'cred.get "edu"', params: ['system: string'] },
      'cred.set': { desc: '保存凭据', example: 'cred.set "edu" "2023123456" "mypassword"', params: ['system: string', 'username: string', 'password: string', 'extra?: string'] },
      'cred.delete': { desc: '删除凭据', example: 'cred.delete "edu"', params: ['system: string'] },
      'cred.getAll': { desc: '获取所有已保存凭据', example: 'cred.getAll', params: [] },
      'cred.getSystems': { desc: '获取凭据系统列表', example: 'cred.getSystems', params: [] },
      'cred.has': { desc: '检查凭据是否存在', example: 'cred.has "edu"', params: ['system: string'] },
      // Theme
      'theme.getConfig': { desc: '获取当前主题配置', example: 'theme.getConfig', params: [] },
      'theme.updateConfig': { desc: '更新主题（mode/background/bgOpacity/bgBlur/bgDim等）', example: 'theme.updateConfig { mode: "dark" }', params: ['patch: object — 支持 mode, background, bgOpacity, bgBlur, bgDim, cardOpacityLight, cardOpacityDark, cardBlur'] },
      'theme.isDark': { desc: '当前是否为深色模式', example: 'theme.isDark', params: [] },
      'theme.getBackgrounds': { desc: '获取内置背景列表', example: 'theme.getBackgrounds', params: [] },
      'theme.getBackgroundDataUrl': { desc: '获取背景 data URL', example: 'theme.getBackgroundDataUrl "bg1"', params: ['bgId: string — bg1~bg7'] },
      'theme.setMica': { desc: '切换 Windows Mica 毛玻璃效果', example: 'theme.setMica true', params: ['enabled: boolean'] },
      'theme.pickCustomBg': { desc: '从文件选择器选自定义背景', example: 'theme.pickCustomBg', params: [] },
      // PC
      'pc.getMemInfo': { desc: '获取系统内存信息', example: 'pc.getMemInfo', params: [] },
      'pc.optimizeMemory': { desc: '内存优化（EmptyWorkingSet）', example: 'pc.optimizeMemory', params: [] },
      // Settings
      'settings.get': { desc: '读取设置值', example: 'settings.get "devMode"', params: ['key: string'] },
      'settings.set': { desc: '写入设置值（自动持久化）', example: 'settings.set "devMode" true', params: ['key: string', 'value: any'] },
      // App
      'app.getCredits': { desc: '获取开源致谢列表', example: 'app.getCredits', params: [] },
    };
    // Auto-fill docs for any missing endpoint
    devcliPage._autoFillDocs();
  },

  _autoFillDocs() {
    const all = this._ipcList;
    for (const a of all) {
      if (!this._apiDocs[a.channel]) {
        // Try to infer description from function name
        const parts = a.channel.split('.');
        const name = parts[parts.length - 1];
        const module = parts.length > 1 ? parts[parts.length - 2] : '';
        const humanName = name.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, c => c.toUpperCase());
        const humanModule = module.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, c => c.toUpperCase());
        this._apiDocs[a.channel] = {
          desc: `${humanModule || '通用'} · ${humanName}`,
          example: a.channel,
          params: ['(自动推断，无详细文档)'],
        };
      }
    }
  },

  _getDocs(channel) {
    const doc = this._apiDocs[channel];
    if (doc) return doc;
    // Fallback
    return { desc: '无详细说明', example: channel, params: [] };
  },

  // ─── Terminal UI ────────────────────────────────────────────
  _setupTerminal() {
    const input = $('devcli-input');
    if (!input) return;

    input.addEventListener('focus', () => devcliPage._hideHint());
    input.addEventListener('blur', () => devcliPage._scheduleHint());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); devcliPage.exec(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); devcliPage._historyBack(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); devcliPage._historyForward(); }
      else if (e.key === 'Tab') { e.preventDefault(); devcliPage._openRef(); }
      devcliPage._hideHint();
      devcliPage._resetInactivity();
    });

    // Auto-focus terminal when page becomes visible
    const page = $('page-devcli');
    if (page) {
      const observer = new MutationObserver(() => {
        if (page.classList.contains('active')) setTimeout(() => input.focus(), 100);
      });
      observer.observe(page, { attributes: true, attributeFilter: ['class'] });
      if (page.classList.contains('active')) input.focus();
    }
  },

  _historyBack() {
    if (devcliPage._history.length === 0) return;
    const idx = devcliPage._historyIdx < 0 ? devcliPage._history.length - 1 : devcliPage._historyIdx - 1;
    if (idx < 0) return;
    devcliPage._historyIdx = idx;
    $('devcli-input').value = devcliPage._history[devcliPage._historyIdx];
  },

  _historyForward() {
    if (devcliPage._historyIdx < 0) return;
    devcliPage._historyIdx++;
    if (devcliPage._historyIdx >= devcliPage._history.length) {
      devcliPage._historyIdx = devcliPage._history.length;
      $('devcli-input').value = '';
    } else {
      $('devcli-input').value = devcliPage._history[devcliPage._historyIdx];
    }
  },

  _println(text, cls = 'term-result') {
    const out = $('devcli-output');
    if (!out) return;
    const line = document.createElement('div');
    line.className = 'terminal-line ' + cls;
    line.innerHTML = text.replace(/\n/g, '<br>').replace(/\t/g, '  ');
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  },

  _printPrompt(cmd) {
    const out = $('devcli-output');
    if (!out) return;
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span class="term-prompt">$ </span><span class="term-cmd">${cmd.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  },

  async exec() {
    const input = $('devcli-input');
    const cmd = input.value.trim();
    if (!cmd) return;

    devcliPage._history.push(cmd);
    devcliPage._historyIdx = devcliPage._history.length;
    input.value = '';
    devcliPage._printPrompt(cmd);

    // Special commands
    if (cmd === 'help' || cmd === '?') {
      devcliPage._println('可用命令:');
      devcliPage._println(' <b>path.func</b>        调用 IPC 接口，如 <kbd>theme.getConfig</kbd>');
      devcliPage._println(' <b>path.func arg1 arg2</b>  带参数调用，如 <kbd>theme.setMica true</kbd>');
      devcliPage._println(' <b>help</b> / <b>?</b>    显示此帮助');
      devcliPage._println(' <b>clear</b> / <b>cls</b>  清屏');
      devcliPage._println(' <b>ls</b> / <b>list</b>   列出前 20 个接口');
      devcliPage._println(' <b>Ctrl+W</b> / <b>Tab</b>  打开 API 参考面板');
      return;
    }
    if (cmd === 'clear' || cmd === 'cls') {
      $('devcli-output').innerHTML = '';
      return;
    }
    if (cmd === 'ls' || cmd === 'list') {
      devcliPage._println('可用 IPC 接口 (' + devcliPage._ipcList.length + ' 个):');
      devcliPage._ipcList.slice(0, 25).forEach(a => {
        const doc = devcliPage._getDocs(a.channel);
        devcliPage._println(' <span style="color:#58a6ff">' + a.channel + '</span> — ' + doc.desc);
      });
      if (devcliPage._ipcList.length > 25) devcliPage._println(' ... 还有 ' + (devcliPage._ipcList.length - 25) + ' 个（Ctrl+W 查看全部）');
      return;
    }

    // Parse: "theme.setMica true" => path=theme.setMica, rawArgs="true"
    const parts = cmd.split(/\s+/);
    const path = parts[0];
    const rawArgs = parts.slice(1).join(' ');

    // Support both dot and colon notation
    const normalized = path.replace(/:/g, '.');
    const pathParts = normalized.split('.');

    let fn = window.jlu;
    let resolved = true;
    for (const p of pathParts) {
      if (!fn || typeof fn !== 'object') { resolved = false; break; }
      fn = fn[p];
    }
    if (!resolved || typeof fn !== 'function') {
      devcliPage._println('错误: IPC 接口 <kbd>' + path + '</kbd> 未找到，输入 <kbd>ls</kbd> 查看可用接口', 'term-result');
      // Show suggestions
      const similar = devcliPage._ipcList.filter(a => a.channel.includes(pathParts[pathParts.length-1]));
      if (similar.length) {
        devcliPage._println('相近接口: ' + similar.map(a => '<kbd>' + a.channel + '</kbd>').join(' '), 'term-result');
      }
      return;
    }

    // Parse arguments
    let args = [];
    if (rawArgs) {
      try { args = JSON.parse('[' + rawArgs + ']'); }
      catch { args = rawArgs.split(/\s+/).filter(Boolean); }
    }

    try {
      const result = await fn(...args);
      const formatted = JSON.stringify(result, null, 2);
      devcliPage._println(formatted, 'term-result');
    } catch (e) {
      devcliPage._println('错误: ' + e.message, 'term-result');
    }
  },

  // ─── Idle Hint ──────────────────────────────────────────────
  _setupHint() { devcliPage._resetInactivity(); },

  _resetInactivity() {
    clearTimeout(devcliPage._inactivityTimer);
    devcliPage._hideHint();
    devcliPage._inactivityTimer = setTimeout(() => devcliPage._showHint(), 5000);
  },

  _showHint() {
    const hint = $('devcli-hint');
    const input = $('devcli-input');
    if (!hint || !input) return;
    if (document.activeElement === input) return;
    if (!$('page-devcli')?.classList.contains('active')) return;
    hint.style.display = '';
  },

  _hideHint() { const h = $('devcli-hint'); if (h) h.style.display = 'none'; },
  _scheduleHint() { setTimeout(() => { if (document.activeElement !== $('devcli-input')) devcliPage._showHint(); }, 6000); },

  // ─── Ctrl+W / Tab API Reference Panel ──────────────────────
  _setupRefPanel() {
    $('devcli-ref-close')?.addEventListener('click', () => devcliPage._closeRef());
    $('devcli-ref-filter')?.addEventListener('input', () => devcliPage._renderRef());

    // Don't close on outside click while interacting
    document.addEventListener('mousedown', (e) => {
      const ref = $('devcli-ref');
      if (ref && ref.style.display !== 'none' && !ref.contains(e.target)) {
        // Only close if not interacting with filter/scroll
        devcliPage._closeRef();
      }
    });
  },

  _setupGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        if ($('page-devcli')?.classList.contains('active')) {
          e.preventDefault();
          const ref = $('devcli-ref');
          if (ref && ref.style.display !== 'none') devcliPage._closeRef();
          else devcliPage._openRef();
        }
      }
    });
  },

  _openRef() {
    const ref = $('devcli-ref');
    if (!ref) return;
    ref.style.display = '';
    $('devcli-ref-filter').value = '';
    setTimeout(() => $('devcli-ref-filter')?.focus(), 50);
    devcliPage._renderRef();
    devcliPage._resetRefAutoHide();
  },

  _closeRef() {
    const ref = $('devcli-ref');
    if (ref) ref.style.display = 'none';
    clearTimeout(devcliPage._refHideTimer);
    devcliPage._refInteracting = false;
    setTimeout(() => $('devcli-input')?.focus(), 50);
  },

  _resetRefAutoHide() {
    clearTimeout(devcliPage._refHideTimer);
    // Don't auto-hide if user is actively interacting
    if (devcliPage._refInteracting) return;
    devcliPage._refHideTimer = setTimeout(() => devcliPage._closeRef(), 20000);
  },

  _renderRef() {
    const container = $('devcli-ref-body');
    if (!container) return;
    const filter = ($('devcli-ref-filter')?.value || '').toLowerCase();
    let list = devcliPage._ipcList;
    if (filter) list = list.filter(a => a.channel.toLowerCase().includes(filter));
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<div class="notif-empty" style="padding:20px;text-align:center;color:#8b949e">无匹配接口</div>';
      return;
    }
    list.forEach(a => {
      const doc = devcliPage._getDocs(a.channel);
      const paramsHtml = doc.params && doc.params.length
        ? '<div style="margin-top:6px;font-size:11px;color:#8b949e">参数: ' + doc.params.join('<br>') + '</div>'
        : '';
      const card = document.createElement('div');
      card.className = 'devcli-ref-card';
      card.innerHTML = `
        <div class="devcli-ref-card-path">${a.channel}</div>
        <div class="devcli-ref-card-desc">${doc.desc}</div>
        <div class="devcli-ref-card-example" style="display:block">
          示例: <kbd style="background:rgba(63,185,80,0.15);padding:1px 5px;border-radius:3px;font-size:11px">${doc.example}</kbd>
          ${paramsHtml}
        </div>
      `;
      // Click → auto-collapse others, show example, then click again → insert to terminal
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const isExpanded = card.classList.contains('expanded');
        container.querySelectorAll('.devcli-ref-card.expanded').forEach(c => c.classList.remove('expanded'));
        if (!isExpanded) {
          card.classList.add('expanded');
        } else {
          // Insert into terminal and close
          $('devcli-input').value = doc.example;
          $('devcli-input').focus();
          devcliPage._closeRef();
        }
      });

      // Mouse interaction resets auto-hide
      card.addEventListener('mouseenter', () => { devcliPage._refInteracting = true; clearTimeout(devcliPage._refHideTimer); });
      card.addEventListener('mouseleave', () => { devcliPage._refInteracting = false; devcliPage._resetRefAutoHide(); });

      container.appendChild(card);
    });
  }
};

// ═════════════════════════════════════════════════════════════════
// PAGE: Dev LOG
// ═════════════════════════════════════════════════════════════════
const devlogPage = {
  _minLevel: -1,
  _unsubscribe: null,

  init() {
    document.querySelectorAll('.devlog-lvl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.devlog-lvl-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        devlogPage._minLevel = parseInt(btn.dataset.level);
        devlogPage.render();
      });
    });

    $('devlog-filter')?.addEventListener('input', () => devlogPage.render());
    $('devlog-clear')?.addEventListener('click', () => { Log.clear(); devlogPage.render(); });
    $('devlog-copy')?.addEventListener('click', () => devlogPage.copyAll());

    this._unsubscribe = Log.onEntry(() => devlogPage.render());
    devlogPage.render();
  },

  render() {
    const list = $('devlog-list');
    if (!list) return;
    const filter = ($('devlog-filter')?.value || '').trim();
    const entries = Log.getEntries(devlogPage._minLevel < 0 ? 0 : devlogPage._minLevel, filter);

    $('devlog-count').textContent = `${entries.length}/${Log._entries.length}`;

    if (!entries.length) {
      list.innerHTML = '<div class="terminal-line term-result" style="color:#484f58">' +
        (Log._entries.length ? '-- filter: no match --' : '-- no log entries yet --') + '</div>';
      return;
    }

    const batch = entries.slice(-800);
    list.innerHTML = batch.map(e => {
      const time = e.timeStr || (e.time.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(e.time.getMilliseconds()).padStart(3,'0'));
      const mod = e.module;
      const msg = (e.message || '') + (e.data && typeof e.data === 'object' && e.data.stack ? '' : '');
      const dataStr = e.data ? ' ' + JSON.stringify(e.data) : '';
      const cls = 'log-' + e.levelName.toLowerCase();
      return `<div class="terminal-line ${cls}"><span style="color:#484f58">${time}</span> <span style="color:#8b949e">[</span><span class="log-lvl">${e.levelName}</span><span style="color:#8b949e">][</span><span style="color:#58a6ff">${escapeHtml(mod)}</span><span style="color:#8b949e">]</span> ${escapeHtml(msg)}</div>`;
    }).join('');
    list.scrollTop = list.scrollHeight;
  },

  copyAll() {
    const filter = ($('devlog-filter')?.value || '').trim();
    const entries = Log.getEntries(devlogPage._minLevel < 0 ? 0 : devlogPage._minLevel, filter);
    if (!entries.length) { Toast.info('没有可复制的日志'); return; }
    const text = entries.map(e => {
      const time = e.time.toLocaleString('zh-CN', { hour12: false }) + '.' + String(e.time.getMilliseconds()).padStart(3,'0');
      return `[${time}][${e.levelName}][${e.module}] ${e.message}${e.data ? ' ' + JSON.stringify(e.data) : ''}`;
    }).join('\n');
    navigator.clipboard.writeText(text).then(() => Toast.success(`已复制 ${entries.length} 条日志`)).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      Toast.success(`已复制 ${entries.length} 条日志`);
    });
  }
};

function escapeHtml(s) {
  if (typeof s !== 'string') s = String(s);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═════════════════════════════════════════════════════════════════
// INIT
// ═════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initInfoTips();
  ThemeEngine.init();
  initWinCtrl(); nav.init();
  homePage.init();
  vpnPage.init(); drcomPage.init(); schedulePage.init(); studyPage.init(); coursePage.init();
  gradePage.init(); examPage.init(); gradPage.init(); classroomPage.init(); reviewPage.init();
  cardPage.init(); cafePage.init(); busPage.init(); deliveryPage.init(); libseatPage.init();
  mapPage.init(); weatherPage.init(); notifPage.init(); pomoPage.init(); calPage.init(); pctoolboxPage.init();
  devcliPage.init();
  devlogPage.init();
  settingsPage.init();

  Log.info('App', '应用初始化完成');
});
