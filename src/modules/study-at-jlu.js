/**
 * StudyAtJlu_Desktop reimplementation for Electron
 * "学在吉大" video course browser and downloader
 * Original: https://github.com/RikaCelery/StudyAtJLU_Desktop
 */
const https = require('https');
const http = require('http');

class StudyAtJluClient {
  constructor() {
    this.baseUrl = 'https://study.jlu.edu.cn';
    this.cookie = null;
  }

  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      };
      if (this.cookie) {
        headers['Cookie'] = this.cookie;
      }

      const req = mod.request(url, { method: options.method || 'GET', headers }, (res) => {
        // Capture cookies
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          this.cookie = setCookies.map(c => c.split(';')[0]).join('; ');
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      req.end(options.body ? JSON.stringify(options.body) : undefined);
    });
  }

  /**
   * Authenticate with 学在吉大
   */
  async _login({ username, password }) {
    const loginUrl = `${this.baseUrl}/api/auth/login`;
    await this._request(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username, password }
    });
  }

  /**
   * Get course list
   */
  async getCourses({ username, password }) {
    await this._login({ username, password });
    const data = await this._request(`${this.baseUrl}/api/courses`);

    // Transform to normalized format
    if (Array.isArray(data)) {
      return data.map(c => ({
        id: c.id || c.courseId,
        name: c.name || c.courseName || '未知课程',
        term: c.term || c.semester || '',
        teacher: c.teacher || c.instructor || '',
        cover: c.cover || c.thumbnail || null
      }));
    }
    return [];
  }

  /**
   * Get videos for a specific course
   */
  async getVideos({ username, password, courseId }) {
    if (!this.cookie) await this._login({ username, password });
    const data = await this._request(`${this.baseUrl}/api/courses/${courseId}/videos`);

    if (Array.isArray(data)) {
      return data.map(v => ({
        id: v.id || v.videoId,
        title: v.title || v.name || '未知视频',
        date: v.date || v.createdAt || '',
        type: v.type || '',
        duration: v.duration || 0,
        url: v.url || v.videoUrl || '',
        downloadable: !!v.url
      }));
    }
    return [];
  }
}

module.exports = { StudyAtJluClient };
