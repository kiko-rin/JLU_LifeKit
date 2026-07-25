/**
 * 全局账号凭据管理
 * 统一存储学校各系统的账号密码，避免重复输入
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class CredentialManager {
  constructor() {
    this._dataPath = path.join(app.getPath('userData'), 'jlu-lifekit', 'credentials.json');
    this._data = this._load();
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(this._dataPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  _save() {
    try {
      const dir = path.dirname(this._dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._dataPath, JSON.stringify(this._data, null, 2));
    } catch (e) { /* ignore */ }
  }

  /**
   * Get credential for a system
   * @param {string} system - 'edu' | 'campuscard' | 'vpn' | 'study' | 'drcom' | 'libseat'
   */
  get(system) {
    return this._data[system] || null;
  }

  /**
   * Set credential for a system
   */
  set(system, { username, password, extra = {} }) {
    this._data[system] = {
      username: username || '',
      password: password || '',
      ...extra,
      updatedAt: new Date().toISOString(),
    };
    this._save();
  }

  /**
   * Delete credential for a system
   */
  delete(system) {
    delete this._data[system];
    this._save();
  }

  /**
   * Get all systems with saved credentials (mask passwords)
   */
  getAll() {
    const result = {};
    for (const [sys, cred] of Object.entries(this._data)) {
      result[sys] = {
        username: cred.username || '',
        hasPassword: !!cred.password,
        maskedPassword: cred.password ? '•'.repeat(Math.min(cred.password.length, 12)) : '',
        updatedAt: cred.updatedAt || '',
      };
    }
    return result;
  }

  /**
   * Get all systems list
   */
  getSystems() {
    return [
      { id: 'edu', name: '教务系统', desc: 'icourses.jlu.edu.cn，成绩/课表/选课/考试', icon: 'book' },
      { id: 'study', name: '学在吉大', desc: 'study.jlu.edu.cn，视频课程', icon: 'book' },
      { id: 'drcom', name: 'DrCOM 校园网', desc: '校园网认证登录', icon: 'network' },
      { id: 'campuscard', name: '校园一卡通', desc: '余额/消费查询', icon: 'bankCard' },
      { id: 'vpn', name: 'VPN', desc: 'Web VPN 登录（校外访问）', icon: 'globe' },
      { id: 'libseat', name: '图书馆座位', desc: 'libseat.jlu.edu.cn，座位预约', icon: 'seat' },
    ];
  }

  /**
   * Check if a system has saved credentials
   */
  has(system) {
    const c = this._data[system];
    return !!(c && c.username && c.password);
  }
}

module.exports = { CredentialManager };
