/**
 * 校园卡余额查询
 * 查询一卡通余额、近期消费流水
 */
const https = require('https');
const http = require('http');

class CampusCardClient {
  constructor() {
    this.baseUrl = 'https://ecard.jlu.edu.cn';
    this.cookie = null;
  }

  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      };
      if (this.cookie) headers['Cookie'] = this.cookie;
      const req = mod.request(url, { method: options.method || 'GET', headers, timeout: 10000 }, (res) => {
        if (res.headers['set-cookie']) this.cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          try { resolve(JSON.parse(body)); } catch { resolve(body); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('超时')); });
      if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      req.end();
    });
  }

  async getBalance({ username, password }) {
    try {
      await this._request(`${this.baseUrl}/login`, { method: 'POST', body: { username, password } });
      const data = await this._request(`${this.baseUrl}/api/card/balance`);
      return { balance: data.balance || 0, cardId: data.cardId || '', status: data.status || '正常' };
    } catch (e) {
      return { balance: 0, cardId: '—', status: '查询失败', error: e.message };
    }
  }

  async getTransactions({ username, password, days = 7 }) {
    try {
      if (!this.cookie) await this.getBalance({ username, password });
      const data = await this._request(`${this.baseUrl}/api/card/transactions?days=${days}`);
      if (Array.isArray(data)) return data.map(t => ({
        time: t.time || t.transTime || '',
        location: t.location || t.merchantName || '',
        amount: t.amount || 0,
        balance: t.balance || 0,
        type: t.type || '消费',
      }));
      return [];
    } catch (e) {
      return [];
    }
  }

}

module.exports = { CampusCardClient };
