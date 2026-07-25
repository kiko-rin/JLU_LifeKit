/**
 * Windows Auto-Start Manager
 * Uses Electron's app.setLoginItemSettings for platform-native auto-launch
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class AutoStartManager {
  constructor(store) {
    this.store = store;
    this.config = {
      enabled: false,
      openAsHidden: false,  // start minimized to tray
    };
    this._load();
  }

  _load() {
    try {
      const saved = this.store?.get('autoStart');
      if (saved) Object.assign(this.config, saved);
    } catch (e) { /* ignore */ }
  }

  _save() {
    try { this.store?.set('autoStart', this.config); } catch (e) { /* ignore */ }
  }

  /**
   * Get current auto-start status
   */
  isEnabled() {
    try {
      const settings = app.getLoginItemSettings();
      return settings.openAtLogin;
    } catch {
      return this.config.enabled;
    }
  }

  /**
   * Enable or disable auto-start
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
    this._save();

    try {
      if (process.platform === 'win32') {
        // Windows: use Electron's built-in API
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: app.getPath('exe'),
          args: enabled && this.config.openAsHidden ? ['--hidden'] : [],
        });
      } else if (process.platform === 'darwin') {
        // macOS
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: this.config.openAsHidden,
        });
      } else {
        // Linux: create .desktop file in autostart
        this._setLinuxAutoStart(enabled);
      }
    } catch (e) {
      console.error('[AutoStart] Failed to set auto-start:', e.message);
    }

    return { ok: true, enabled };
  }

  /**
   * Set whether to start minimized
   */
  setHiddenStart(hidden) {
    this.config.openAsHidden = hidden;
    this._save();
    // Re-apply
    if (this.config.enabled) {
      this.setEnabled(true);
    }
  }

  /**
   * Linux: manage .desktop file in ~/.config/autostart/
   */
  _setLinuxAutoStart(enabled) {
    const autostartDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.config', 'autostart'
    );
    const desktopFile = path.join(autostartDir, 'jlu-lifekit.desktop');

    if (enabled) {
      try {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }
        const execPath = app.getPath('exe');
        const desktopContent = `[Desktop Entry]
Type=Application
Name=JLU LifeKit
Exec=${execPath} ${this.config.openAsHidden ? '--hidden' : ''}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
`;
        fs.writeFileSync(desktopFile, desktopContent);
      } catch (e) {
        console.error('[AutoStart] Failed to create .desktop file:', e.message);
      }
    } else {
      try {
        if (fs.existsSync(desktopFile)) {
          fs.unlinkSync(desktopFile);
        }
      } catch (e) {
        console.error('[AutoStart] Failed to remove .desktop file:', e.message);
      }
    }
  }

  /**
   * Get current config for renderer
   */
  getConfig() {
    return {
      ...this.config,
      platform: process.platform,
      currentStatus: this.isEnabled(),
    };
  }
}

module.exports = { AutoStartManager };
