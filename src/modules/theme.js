/**
 * 主题 & 个性化管理
 * - 明暗双色主题
 * - 背景图片 + 淡化 + 模糊
 * - 同步系统明暗设置
 */
const fs = require('fs');
const path = require('path');
const { app, nativeTheme } = require('electron');

class ThemeManager {
  constructor() {
    this._dataPath = path.join(app.getPath('userData'), 'jlu-lifekit', 'theme.json');
    this._defaults = {
      mode: 'system',        // 'light' | 'dark' | 'system'
      background: 'none',    // 'none' | 'bg1' | 'bg2' | 'bg3' | 'bg4' | 'custom'
      customBgPath: '',      // custom image path
      bgOpacity: 0.15,       // 0-1, background image opacity
      bgBlur: 20,            // 0-60, backdrop-filter blur px
      bgDim: 0.4,            // 0-1, dark overlay on background
      accentColor: '#0078d4',
    };
    this._config = this._load();
    this._listeners = [];
  }

  _load() {
    try {
      const saved = JSON.parse(fs.readFileSync(this._dataPath, 'utf-8'));
      return { ...this._defaults, ...saved };
    } catch {
      return { ...this._defaults };
    }
  }

  _save() {
    try {
      const dir = path.dirname(this._dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._dataPath, JSON.stringify(this._config, null, 2));
    } catch (e) { /* ignore */ }
  }

  getConfig() { return { ...this._config }; }

  updateConfig(patch) {
    Object.assign(this._config, patch);
    this._save();
    this._notify();
    return this.getConfig();
  }

  /** Get the effective dark mode state */
  isDark() {
    if (this._config.mode === 'system') return nativeTheme.shouldUseDarkColors;
    return this._config.mode === 'dark';
  }

  /** Listen for system theme changes */
  startSystemSync(win) {
    nativeTheme.on('updated', () => {
      if (this._config.mode === 'system') {
        this._notify();
        win?.webContents.send('theme:changed', this.getConfig());
      }
    });
  }

  /** Register listener */
  onUpdate(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(l => l !== callback); };
  }

  _notify() {
    for (const l of this._listeners) {
      try { l(this.getConfig()); } catch (e) { /* ignore */ }
    }
  }

  /** Get built-in background list */
  getBackgrounds() {
    const bgDir = path.join(__dirname, '..', '..', 'assets', 'backgrounds');
    const bgs = [{ id: 'none', name: '无背景', path: '' }];
    const bgFiles = [
      { id: 'bg1', file: 'bg1.png' },
      { id: 'bg2', file: 'bg2.jpg' },
      { id: 'bg3', file: 'bg3.jpg' },
      { id: 'bg4', file: 'bg4.jpg' },
      { id: 'bg5', file: 'bg5.jpg' },
      { id: 'bg6', file: 'bg6.jpeg' },
      { id: 'bg7', file: 'bg7.png' },
    ];
    for (const bg of bgFiles) {
      const filePath = path.join(bgDir, bg.file);
      if (fs.existsSync(filePath)) {
        const name = bg.id === 'bg1' ? '极光' : bg.id === 'bg2' ? '晨曦' : bg.id === 'bg3' ? '森林' : bg.id === 'bg4' ? '海浪' : bg.id === 'bg5' ? '山峦' : bg.id === 'bg6' ? '晚霞' : '星空';
        bgs.push({ id: bg.id, name, path: filePath });
      }
    }
    return bgs;
  }
}

module.exports = { ThemeManager };
