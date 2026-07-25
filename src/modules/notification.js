/**
 * Reachee-style JLU OA Notification Crawler
 * Reference: https://github.com/TechCiel/Reachee
 *
 * Crawls JLU OA system for notifications and dispatches to:
 * - Windows Toast notifications (via Electron)
 * - In-app notification center
 */
const https = require('https');
const http = require('http');
const iconv = require('iconv-lite');
const { URL } = require('url');

class NotificationCrawler {
  constructor(store) {
    this.store = store; // persistent store
    this.timer = null;
    this.running = false;
    this.posted = [];      // list of seen post IDs
    this.listeners = [];   // callback listeners
    this.config = {
      enabled: false,
      interval: 300,       // seconds between checks
      channel: 179577,     // default OA channel (通知公告)
      useVpn: false,
      vpnAccount: '',
      vpnPassword: '',
      skipKeywords: ['聘', '任免', '任职', '招生宣传', '讲话精神'],
      censorKeywords: [],
    };
    this._loadConfig();
  }

  // ─── Config Persistence ──────────────────────────────────────
  _loadConfig() {
    try {
      const saved = this.store?.get('notificationConfig');
      if (saved) Object.assign(this.config, saved);
    } catch (e) { /* ignore */ }
    try {
      const posted = this.store?.get('notificationPosted');
      if (Array.isArray(posted)) this.posted = posted;
    } catch (e) { /* ignore */ }
  }

  _saveConfig() {
    try { this.store?.set('notificationConfig', this.config); } catch (e) { /* ignore */ }
  }

  _savePosted() {
    // Keep last 200 entries
    this.posted = this.posted.slice(-200);
    try { this.store?.set('notificationPosted', this.posted); } catch (e) { /* ignore */ }
  }

  // ─── HTTP Helpers ────────────────────────────────────────────
  _request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const mod = parsed.protocol === 'https:' ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      };
      if (this._cookie) headers['Cookie'] = this._cookie;

      const req = mod.request(url, {
        method: options.method || 'GET',
        headers,
        timeout: 30000,
      }, (res) => {
        // Capture cookies
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          this._cookie = setCookies.map(c => c.split(';')[0]).join('; ');
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          // Try to detect encoding from Content-Type header
          const ct = (res.headers['content-type'] || '').toLowerCase();
          let body;
          if (ct.includes('gbk') || ct.includes('gb2312') || ct.includes('gb18030')) {
            try { body = iconv.decode(raw, 'gbk'); } catch { body = raw.toString('utf-8'); }
          } else {
            body = raw.toString('utf-8');
          }
          resolve({ status: res.statusCode, body, headers: res.headers });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  // ─── VPN Login ───────────────────────────────────────────────
  async _loginVpn() {
    if (!this.config.useVpn || !this.config.vpnAccount) return;
    try {
      await this._request('https://vpn.jlu.edu.cn/do-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `auth_type=local&username=${encodeURIComponent(this.config.vpnAccount)}&password=${encodeURIComponent(this.config.vpnPassword)}`,
      });
    } catch (e) {
      console.error('[NotificationCrawler] VPN login failed:', e.message);
    }
  }

  _getBaseUrl() {
    if (this.config.useVpn) {
      return 'https://vpn.jlu.edu.cn/https/44696469646131313237446964696461a579b2620fdde512c84ea96fd9/defaultroot';
    }
    return 'https://oa.jlu.edu.cn/defaultroot';
  }

  // ─── HTML Parsing (lightweight, no external deps) ────────────
  _extractPosts(html) {
    const posts = [];
    // Match links like: <a ... class="font14" href="...id=12345...">
    const linkRegex = /<a[^>]*class="font14"[^>]*href="([^"]*)"[^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const idMatch = href.match(/id=(\d+)/);
      if (idMatch) {
        posts.push(parseInt(idMatch[1]));
      }
    }
    return posts.reverse(); // oldest first
  }

  _extractPostDetail(html) {
    const get = (cls) => {
      const re = new RegExp(`<[^>]*class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)</`, 'i');
      const m = html.match(re);
      if (!m) return '';
      // Strip HTML tags
      return m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    };

    return {
      title: get('content_t'),
      time: get('content_time'),
      dept: (() => {
        const m = html.match(/class="content_time"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
        return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
      })(),
      content: (() => {
        const m = html.match(/class="content_font"[^>]*>([\s\S]*?)<\/div>/i);
        if (!m) return '';
        return m[1]
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<\/?(p|br|div|h[1-6]|li)[^>]*>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      })(),
    };
  }

  _shouldSkip(title, content) {
    const skip = this.config.skipKeywords || [];
    if (skip.some(kw => title.includes(kw))) return true;
    const censor = this.config.censorKeywords || [];
    if (censor.some(kw => content.includes(kw))) return true;
    return false;
  }

  // ─── Core Crawl ──────────────────────────────────────────────
  async crawl() {
    const baseUrl = this._getBaseUrl();
    const channel = this.config.channel;

    await this._loginVpn();

    // Fetch notification list
    const listUrl = `${baseUrl}/PortalInformation!jldxList.action?channelId=${channel}&startPage=1`;
    const res = await this._request(listUrl);
    const posts = this._extractPosts(res.body);

    // Filter new posts
    const newPosts = posts.filter(id => !this.posted.includes(id));
    if (newPosts.length === 0) return [];

    const results = [];

    for (const pid of newPosts) {
      try {
        const detailUrl = `${baseUrl}/PortalInformation!getInformation.action?id=${pid}`;
        const detailRes = await this._request(detailUrl);
        const detail = this._extractPostDetail(detailRes.body);

        if (this._shouldSkip(detail.title, detail.content)) {
          console.log(`[NotificationCrawler] Skipped: ${detail.title}`);
          this.posted.push(pid);
          continue;
        }

        const notification = {
          id: pid,
          title: detail.title || '无标题',
          time: detail.time || '',
          dept: detail.dept || '',
          content: detail.content || '',
          link: detailUrl,
          linkLAN: `https://oa.jlu.edu.cn/defaultroot/PortalInformation!getInformation.action?id=${pid}`,
          linkVPN: `https://vpn.jlu.edu.cn/https/44696469646131313237446964696461a579b2620fdde512c84ea96fd9/defaultroot/PortalInformation!getInformation.action?id=${pid}`,
          receivedAt: Date.now(),
          read: false,
        };

        results.push(notification);
        this.posted.push(pid);

        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`[NotificationCrawler] Failed to fetch post ${pid}:`, e.message);
      }
    }

    this._savePosted();
    return results;
  }

  // ─── Listener Management ─────────────────────────────────────
  onNotification(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  _dispatch(notifications) {
    for (const n of notifications) {
      for (const listener of this.listeners) {
        try { listener(n); } catch (e) { console.error(e); }
      }
    }
  }

  // ─── Start / Stop ────────────────────────────────────────────
  async start() {
    if (this.running) return;
    this.running = true;
    this.config.enabled = true;
    this._saveConfig();

    const poll = async () => {
      if (!this.running) return;
      try {
        const newNotifs = await this.crawl();
        if (newNotifs.length > 0) {
          console.log(`[NotificationCrawler] Found ${newNotifs.length} new notifications`);
          this._dispatch(newNotifs);
        }
      } catch (e) {
        console.error('[NotificationCrawler] Crawl error:', e.message);
      }
      // Schedule next
      if (this.running) {
        this.timer = setTimeout(poll, (this.config.interval || 300) * 1000);
      }
    };

    // First run immediately
    await poll();
  }

  stop() {
    this.running = false;
    this.config.enabled = false;
    this._saveConfig();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // ─── Update Config ───────────────────────────────────────────
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this._saveConfig();
    // Restart if running
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  getConfig() {
    return { ...this.config };
  }

  // ─── Manual Check ────────────────────────────────────────────
  async checkNow() {
    try {
      const newNotifs = await this.crawl();
      this._dispatch(newNotifs);
      return { ok: true, count: newNotifs.length, notifications: newNotifs };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = { NotificationCrawler };
