/**
 * 吉大教务系统查询适配器
 *
 * 对接官方教务系统进行成绩、课表、考试等数据同步。
 *
 * 系统地址：
 * - 选课系统: https://icourses.jlu.edu.cn
 * - 新教务系统: https://iedu.jlu.edu.cn (智慧吉大认证)
 * - OA 通知: https://oa.jlu.edu.cn
 *
 * 认证方式：
 * - icourses: 用户名/密码 POST 登录
 * - iedu: 智慧吉大扫码 / 微信验证码（暂不支持自动化）
 *
 * 注意：实际接口可能因系统升级而变化，
 * 以下实现基于公开可访问的接口结构，仅做参考。
 */
const https = require('https');
const http = require('http');

class EduSystemAdapter {
  constructor() {
    this.cookie = null;
    this.loggedIn = false;
    this.systemUrl = 'https://icourses.jlu.edu.cn';
    this.ieduUrl = 'https://iedu.jlu.edu.cn';
  }

  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        ...options.headers,
      };
      if (this.cookie) headers['Cookie'] = this.cookie;

      const req = mod.request(url, { method: options.method || 'GET', headers, timeout: 15000 }, (res) => {
        if (res.headers['set-cookie']) {
          this.cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          try { resolve({ data: JSON.parse(body), raw: body, status: res.statusCode }); }
          catch { resolve({ data: null, raw: body, status: res.statusCode }); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      req.end();
    });
  }

  /**
   * Login to icourses system
   */
  async login({ username, password }) {
    try {
      const res = await this._request(`${this.systemUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });

      if (res.status === 200 && (res.data?.success || res.raw.includes('success'))) {
        this.loggedIn = true;
        return { ok: true, message: '登录成功' };
      }
      return { ok: false, error: '用户名或密码错误' };
    } catch (e) {
      return { ok: false, error: `登录失败: ${e.message}` };
    }
  }

  /**
   * Fetch grades from edu system
   * Endpoint: /api/student/grades or similar
   */
  async fetchGrades() {
    if (!this.loggedIn) return { ok: false, error: '未登录' };
    try {
      // Try common API patterns
      const endpoints = [
        '/api/student/grades',
        '/api/grade/list',
        '/jwapp/sys/studentApi/grade/query.do',
      ];

      for (const ep of endpoints) {
        try {
          const res = await this._request(`${this.systemUrl}${ep}`);
          if (res.data && (Array.isArray(res.data) || res.data.rows)) {
            const grades = Array.isArray(res.data) ? res.data : res.data.rows;
            return {
              ok: true,
              grades: grades.map(g => ({
                semester: g.semester || g.xnxq || '',
                name: g.courseName || g.kcmc || '',
                credit: parseFloat(g.credit || g.xf || 0),
                score: parseFloat(g.score || g.cj || 0),
                grade: g.grade || g.jd || '',
                type: g.courseType || g.kclb || '',
              })),
            };
          }
        } catch { /* try next endpoint */ }
      }

      return { ok: false, error: '无法获取成绩数据，请检查教务系统是否可用' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Fetch course schedule
   */
  async fetchSchedule({ semester }) {
    if (!this.loggedIn) return { ok: false, error: '未登录' };
    try {
      const endpoints = [
        `/api/student/schedule?semester=${semester || ''}`,
        '/api/schedule/current',
        '/jwapp/sys/studentApi/schedule/query.do',
      ];

      for (const ep of endpoints) {
        try {
          const res = await this._request(`${this.systemUrl}${ep}`);
          if (res.data && (Array.isArray(res.data) || res.data.rows)) {
            const courses = Array.isArray(res.data) ? res.data : res.data.rows;
            return {
              ok: true,
              courses: courses.map(c => ({
                name: c.courseName || c.kcmc || '',
                teacher: c.teacherName || c.jsxm || '',
                location: c.classroom || c.jsmc || '',
                dayOfWeek: parseInt(c.dayOfWeek || c.xq || 0),
                startSlot: parseInt(c.startSlot || c.ksjc || 0),
                endSlot: parseInt(c.endSlot || c.jsjc || 0),
                weeks: c.weeks || [],
                credit: parseFloat(c.credit || c.xf || 0),
              })),
            };
          }
        } catch { /* try next */ }
      }
      return { ok: false, error: '无法获取课表数据' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Fetch exam schedule
   */
  async fetchExams() {
    if (!this.loggedIn) return { ok: false, error: '未登录' };
    try {
      const endpoints = [
        '/api/student/exams',
        '/api/exam/list',
        '/jwapp/sys/studentApi/exam/query.do',
      ];

      for (const ep of endpoints) {
        try {
          const res = await this._request(`${this.systemUrl}${ep}`);
          if (res.data && (Array.isArray(res.data) || res.data.rows)) {
            const exams = Array.isArray(res.data) ? res.data : res.data.rows;
            return {
              ok: true,
              exams: exams.map(e => ({
                name: e.courseName || e.kcmc || '',
                type: e.examType || e.kslx || '',
                date: e.examDate || e.ksrq || '',
                time: e.examTime || e.kssj || '',
                location: e.classroom || e.jsmc || '',
                seat: e.seatNo || e.zwh || '',
              })),
            };
          }
        } catch { /* try next */ }
      }
      return { ok: false, error: '无法获取考试数据' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Fetch graduation credit requirements
   * This is typically from the training plan page
   */
  async fetchTrainingPlan() {
    try {
      const res = await this._request('https://ccst.jlu.edu.cn/rcpy/bksjy/pyfa.htm');
      return { ok: true, raw: res.raw };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Check system availability
   */
  async checkAvailability() {
    const results = {};
    for (const [name, url] of [['icourses', this.systemUrl], ['iedu', this.ieduUrl], ['oa', 'https://oa.jlu.edu.cn']]) {
      try {
        const res = await this._request(url, { method: 'HEAD' });
        results[name] = { available: res.status < 400, status: res.status };
      } catch (e) {
        results[name] = { available: false, error: e.message };
      }
    }
    return results;
  }
}

module.exports = { EduSystemAdapter };
