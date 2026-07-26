/**
 * 成绩 & GPA 计算器
 * 自动拉取教务系统成绩，计算 GPA
 */
const https = require('https');

class GradeClient {
  constructor() {
    this.cookie = null;
    this.baseUrl = 'https://icourses.jlu.edu.cn';
  }

  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : require('http');
      const headers = { 'User-Agent': 'Mozilla/5.0', ...options.headers };
      if (this.cookie) headers['Cookie'] = this.cookie;
      const req = mod.request(url, { method: options.method || 'GET', headers, timeout: 10000 }, (res) => {
        if (res.headers['set-cookie']) this.cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => { const b = Buffer.concat(chunks).toString(); try { resolve(JSON.parse(b)); } catch { resolve(b); } });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('超时')); });
      if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      req.end();
    });
  }

  async getGrades({ username, password }) {
    try {
      await this._request(`${this.baseUrl}/login`, { method: 'POST', body: { username, password } });
      const data = await this._request(`${this.baseUrl}/api/grades`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  /** Calculate GPA using multiple methods */
  calculateGPA(courses) {
    if (!courses || courses.length === 0) return { weighted: 0, arithmetic: 0, credits: 0, count: 0 };

    let totalWeighted = 0, totalCredits = 0, totalScore = 0, validCount = 0;

    for (const c of courses) {
      const score = typeof c.score === 'number' ? c.score : parseFloat(c.score);
      const credit = typeof c.credit === 'number' ? c.credit : parseFloat(c.credit);
      if (isNaN(score) || isNaN(credit) || credit <= 0) continue;

      totalWeighted += this._scoreToGPA(score) * credit;
      totalCredits += credit;
      totalScore += score;
      validCount++;
    }

    return {
      weighted: totalCredits > 0 ? (totalWeighted / totalCredits).toFixed(3) : '0.000',
      arithmetic: validCount > 0 ? (totalScore / validCount).toFixed(1) : '0.0',
      totalCredits: totalCredits.toFixed(1),
      count: validCount,
    };
  }

  /**
   * JLU official 4.0 GPA scale (校教字〔2016〕102号)
   * Source: https://jjxy.jlu.edu.cn/info/1052/1389.htm
   *
   * | 百分制 | <60 | 60-63 | 64-66 | 67-69 | 70-73 | 74-76 | 77-79 | 80-83 | 84-86 | 87-89 | 90-94 | 95-100 |
   * | 绩点  | 0   | 1.0   | 1.3   | 1.7   | 2.0   | 2.3   | 2.7   | 3.0   | 3.3   | 3.7   | 4.0   | 4.0   |
   * | 等级  | F   | D     | D+    | C-    | C     | C+    | B-    | B     | B+    | A-    | A     | A+    |
   *
   * 等级制: 优→4.0  良→3.7  中→2.7  及格→1.3  不及格→0
   */
  _scoreToGPA(score) {
    if (score >= 95) return 4.0;
    if (score >= 90) return 4.0;
    if (score >= 87) return 3.7;
    if (score >= 84) return 3.3;
    if (score >= 80) return 3.0;
    if (score >= 77) return 2.7;
    if (score >= 74) return 2.3;
    if (score >= 70) return 2.0;
    if (score >= 67) return 1.7;
    if (score >= 64) return 1.3;
    if (score >= 60) return 1.0;
    return 0;
  }

  /** Grade letter mapping */
  scoreToGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 87) return 'A-';
    if (score >= 84) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 77) return 'B-';
    if (score >= 74) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 67) return 'C-';
    if (score >= 64) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  /** Score distribution for chart */
  getDistribution(courses) {
    const ranges = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
    for (const c of courses) {
      const s = typeof c.score === 'number' ? c.score : parseFloat(c.score);
      if (isNaN(s)) continue;
      if (s >= 90) ranges['90-100']++;
      else if (s >= 80) ranges['80-89']++;
      else if (s >= 70) ranges['70-79']++;
      else if (s >= 60) ranges['60-69']++;
      else ranges['<60']++;
    }
    return ranges;
  }

}

module.exports = { GradeClient };
