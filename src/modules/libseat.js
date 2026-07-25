/**
 * JLU LibSeat PC Wide reimplementation for Electron
 * Library seat reservation helper for JLU
 * Original: https://github.com/flash122u/jlu-libseat-pc-wide
 */
const https = require('https');

class LibSeatClient {
  constructor() {
    this.baseUrl = 'https://libseat.jlu.edu.cn';
    this.cookie = null;
  }

  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      };
      if (this.cookie) headers['Cookie'] = this.cookie;
      if (options.body) headers['Content-Type'] = 'application/json';

      const mod = url.startsWith('https') ? https : require('http');
      const req = mod.request(url, { method: options.method || 'GET', headers }, (res) => {
        if (res.headers['set-cookie']) {
          this.cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve(body); }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('请求超时')); });
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    });
  }

  /**
   * Get available seats for a floor/date/time
   */
  async getSeats({ floor, date, timeSlot }) {
    const params = new URLSearchParams();
    if (floor) params.set('floor', floor);
    if (date) params.set('date', date);
    if (timeSlot) params.set('timeSlot', timeSlot);

    try {
      const data = await this._request(`${this.baseUrl}/api/seats?${params}`);
      if (Array.isArray(data)) {
        return data.map(s => ({
          id: s.id || s.seatId,
          name: s.name || s.seatName || `座位${s.id}`,
          floor: s.floor || '',
          room: s.room || s.area || '',
          status: s.status || 'unknown', // available, occupied, reserved
          availableMinutes: s.availableMinutes || 0,
          colorCode: this._getColorCode(s.availableMinutes || 0, s.status)
        }));
      }
      return [];
    } catch (e) {
      throw new Error(`获取座位信息失败: ${e.message}`);
    }
  }

  /**
   * Color code based on available time
   * Orange: 30min-1h, Yellow: 1-2h, Green: 2h+, Red: occupied
   */
  _getColorCode(minutes, status) {
    if (status === 'occupied' || status === 'reserved') return 'red';
    if (minutes <= 0) return 'red';
    if (minutes <= 30) return 'orange';
    if (minutes <= 60) return 'orange';
    if (minutes <= 120) return 'yellow';
    return 'green';
  }

  /**
   * Manual seat reservation
   */
  async reserve({ seatId, date, startTime, endTime }) {
    if (!seatId || !date || !startTime || !endTime) {
      throw new Error('缺少预约参数');
    }
    try {
      const data = await this._request(`${this.baseUrl}/api/reserve`, {
        method: 'POST',
        body: { seatId, date, startTime, endTime }
      });
      return { message: '预约成功', data };
    } catch (e) {
      throw new Error(`预约失败: ${e.message}`);
    }
  }

  /**
   * Auto-reserve for next day (runs at 21:00)
   * config: { seatIds: [], date, startTime, endTime }
   * Tries multiple candidate seats until one succeeds
   */
  async autoReserve({ seatIds = [], date, startTime, endTime }) {
    if (seatIds.length === 0) throw new Error('请添加候选座位');

    const tomorrow = date || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    for (const seatId of seatIds) {
      try {
        const result = await this.reserve({
          seatId: seatId.trim(),
          date: tomorrow,
          startTime: startTime || '08:00',
          endTime: endTime || '22:00'
        });
        return { message: `座位 ${seatId} 预约成功`, ...result };
      } catch (e) {
        console.log(`[LibSeat] 座位 ${seatId} 预约失败，尝试下一个...`);
        continue;
      }
    }
    throw new Error('所有候选座位预约失败');
  }
}

module.exports = { LibSeatClient };
