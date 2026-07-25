/**
 * JLUiCourse reimplementation for Electron
 * Course selection (抢课) assistant for JLU
 * Original: https://github.com/wzyyyyyyy/JLUiCourse
 */
const https = require('https');

class CourseGrabClient {
  static _activeTasks = new Map();

  constructor() {
    this.taskId = Date.now().toString(36);
  }

  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers
      };
      if (options.cookie) {
        headers['Cookie'] = options.cookie;
      }

      const mod = url.startsWith('https') ? https : require('http');
      const req = mod.request(url, { method: options.method || 'GET', headers }, (res) => {
        const setCookies = res.headers['set-cookie'];
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ data: JSON.parse(body), cookies: setCookies });
          } catch {
            resolve({ data: body, cookies: setCookies });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  /**
   * Start course grabbing task
   * config: { username, password, courseIds, interval, baseUrl }
   */
  async start(config) {
    const {
      username,
      password,
      courseIds = [],
      interval = 2000,
      baseUrl = 'https://icourses.jlu.edu.cn'
    } = config;

    if (!username || !password) throw new Error('需要用户名和密码');
    if (courseIds.length === 0) throw new Error('请添加要抢的课程ID');

    const taskId = this.taskId;
    let grabbed = 0;
    let attempts = 0;
    let cookie = '';

    // Login first
    try {
      const loginRes = await this._request(`${baseUrl}/login`, {
        method: 'POST',
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });
      if (loginRes.cookies) {
        cookie = loginRes.cookies.map(c => c.split(';')[0]).join('; ');
      }
    } catch (e) {
      throw new Error(`登录失败: ${e.message}`);
    }

    // Start grabbing loop
    const timer = setInterval(async () => {
      if (grabbed >= courseIds.length) {
        clearInterval(timer);
        CourseGrabClient._activeTasks.delete(taskId);
        return;
      }

      for (const courseId of courseIds) {
        try {
          attempts++;
          const res = await this._request(`${baseUrl}/api/course/select`, {
            method: 'POST',
            cookie,
            body: `courseId=${courseId}`
          });

          if (res.data?.success || res.data?.code === 200) {
            grabbed++;
            // Notify via console (could be extended to IPC notification)
            console.log(`[CourseGrab] 选课成功: ${courseId} (${grabbed}/${courseIds.length})`);
          }
        } catch (e) {
          console.error(`[CourseGrab] 尝试失败: ${courseId}`, e.message);
        }
      }
    }, interval);

    CourseGrabClient._activeTasks.set(taskId, { timer, attempts: 0, grabbed: 0 });

    return {
      taskId,
      message: `开始抢课，目标 ${courseIds.length} 门课程，间隔 ${interval}ms`,
      courseIds
    };
  }

  /**
   * Stop all grabbing tasks
   */
  static stopAll() {
    for (const [id, task] of CourseGrabClient._activeTasks) {
      if (task.timer) clearInterval(task.timer);
    }
    CourseGrabClient._activeTasks.clear();
  }
}

module.exports = { CourseGrabClient };
