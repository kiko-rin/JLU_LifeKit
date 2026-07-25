/**
 * jlu-vpns-dokodemo-door — Enhanced VPN Proxy
 * Original: https://github.com/MerlynAllen/jlu-vpns-dokodemo-door
 *
 * 三种模式：
 * 1. redirect  — 浏览器 302 跳转到 VPN URL（原始模式）
 * 2. system    — 系统代理模式：本地 HTTP 代理，设置 OS 系统代理
 * 3. host      — Host 模式：维护域名映射表，透明代理指定域名
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { execSync } = require('child_process');

let server = null;
let currentMode = 'redirect';
let currentPort = 8080;
let originalProxySettings = null;

// ─── Host Mode domain map ──────────────────────────────────────
// Maps domain -> whether to route through VPN
const hostMap = new Map();
const defaultHosts = [
  'scholar.google.com',
  'scholar.google.com.hk',
  'dl.acm.org',
  'ieeexplore.ieee.org',
  'springer.com',
  'sciencedirect.com',
  'nature.com',
  'wiley.com',
  'arxiv.org',
  'github.com',
  'stackoverflow.com',
  'docs.google.com',
  'drive.google.com',
  'classroom.google.com',
];

// Initialize default hosts
defaultHosts.forEach(d => hostMap.set(d, true));

// ─── VPN URL Conversion ────────────────────────────────────────
function convertToVpnUrl(targetUrl) {
  if (!targetUrl) return null;
  const stripped = targetUrl.replace(/^https?:\/\//, '');
  return `https://vpn.jlu.edu.cn/${stripped}`;
}

function buildVpnProxyUrl(targetUrl) {
  // Build a proxy-friendly VPN URL for transparent fetching
  if (!targetUrl) return null;
  try {
    const u = new URL(targetUrl);
    const hexHost = Buffer.from(u.hostname).toString('hex').replace(/(.{2})/g, '$1');
    const port = u.port || (u.protocol === 'https:' ? '44696469646131313237' : '68747470');
    return `https://vpn.jlu.edu.cn/https/${hexHost}${u.pathname}${u.search}`;
  } catch {
    return convertToVpnUrl(targetUrl);
  }
}

// ─── System Proxy (Windows Registry) ───────────────────────────
function setWindowsProxy(enable, proxyAddr) {
  if (process.platform !== 'win32') return;

  const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

  try {
    // Save original settings first
    if (!originalProxySettings) {
      try {
        const output = execSync(`reg query "${regKey}" /v ProxyEnable`, { encoding: 'utf-8' });
        const match = output.match(/ProxyEnable\s+REG_DWORD\s+0x(\d+)/);
        originalProxySettings = {
          enabled: match ? parseInt(match[1], 16) : 0,
        };
      } catch {
        originalProxySettings = { enabled: 0 };
      }
      try {
        const output = execSync(`reg query "${regKey}" /v ProxyServer`, { encoding: 'utf-8' });
        const match = output.match(/ProxyServer\s+REG_SZ\s+(.*)/);
        originalProxySettings.server = match ? match[1].trim() : '';
      } catch {
        originalProxySettings.server = '';
      }
    }

    if (enable) {
      execSync(`reg add "${regKey}" /v ProxyEnable /t REG_DWORD /d 1 /f`, { stdio: 'ignore' });
      execSync(`reg add "${regKey}" /v ProxyServer /t REG_SZ /d "${proxyAddr}" /f`, { stdio: 'ignore' });
      // Bypass proxy for local addresses
      execSync(`reg add "${regKey}" /v ProxyOverride /t REG_SZ /d "<local>;localhost;127.*;10.*;192.168.*" /f`, { stdio: 'ignore' });
    } else {
      // Restore original
      execSync(`reg add "${regKey}" /v ProxyEnable /t REG_DWORD /d ${originalProxySettings?.enabled || 0} /f`, { stdio: 'ignore' });
      if (originalProxySettings?.server) {
        execSync(`reg add "${regKey}" /v ProxyServer /t REG_SZ /d "${originalProxySettings.server}" /f`, { stdio: 'ignore' });
      } else {
        execSync(`reg delete "${regKey}" /v ProxyServer /f`, { stdio: 'ignore' });
      }
    }
  } catch (e) {
    console.error('[VPN] Failed to set Windows proxy:', e.message);
  }
}

function notifySystemProxyChanged() {
  if (process.platform !== 'win32') return;
  try {
    // Notify Windows that proxy settings changed
    execSync('powershell -Command "[System.Net.WebRequest]::DefaultWebProxy = $null"', { stdio: 'ignore' });
  } catch { /* ignore */ }
}

// ─── Proxy Server (for system & host modes) ────────────────────
function createProxyServer(port, mode) {
  const proxy = http.createServer();

  proxy.on('request', (clientReq, clientRes) => {
    const targetUrl = clientReq.url;

    // If it's a direct request to our proxy (no target), show status page
    if (!targetUrl || targetUrl === '/' || targetUrl === '/favicon.ico') {
      serveStatusPage(clientReq, clientRes, port, mode);
      return;
    }

    let shouldProxy = false;

    if (mode === 'system') {
      // System proxy: proxy ALL external requests
      shouldProxy = true;
    } else if (mode === 'host') {
      // Host mode: only proxy mapped domains
      try {
        const u = new URL(targetUrl);
        shouldProxy = hostMap.has(u.hostname);
      } catch {
        shouldProxy = false;
      }
    }

    if (!shouldProxy) {
      // Pass through directly
      passThrough(clientReq, clientRes);
      return;
    }

    // Route through VPN
    proxyThroughVpn(clientReq, clientRes, targetUrl);
  });

  // Handle HTTPS CONNECT tunneling
  proxy.on('connect', (req, clientSocket, head) => {
    const [hostname, port] = req.url.split(':');

    let shouldProxy = false;
    if (mode === 'system') shouldProxy = true;
    else if (mode === 'host') shouldProxy = hostMap.has(hostname);

    if (!shouldProxy) {
      // Direct tunnel
      const net = require('net');
      const targetSocket = net.connect(parseInt(port) || 443, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        targetSocket.write(head);
        targetSocket.pipe(clientSocket);
        clientSocket.pipe(targetSocket);
      });
      targetSocket.on('error', () => { try { clientSocket.end(); } catch {} });
      clientSocket.on('error', () => { try { targetSocket.end(); } catch {} });
      return;
    }

    // For VPN-proxied HTTPS, we need to intercept and rewrite
    // This is complex; for now, redirect to VPN URL
    const vpnUrl = convertToVpnUrl(`https://${hostname}:${port || 443}`);
    clientSocket.write(`HTTP/1.1 302 Found\r\nLocation: ${vpnUrl}\r\n\r\n`);
    clientSocket.end();
  });

  return new Promise((resolve, reject) => {
    proxy.on('error', reject);
    proxy.listen(port, '127.0.0.1', () => resolve(proxy));
  });
}

// ─── Pass-through proxy ────────────────────────────────────────
function passThrough(clientReq, clientRes) {
  try {
    const target = new URL(clientReq.url);
    const mod = target.protocol === 'https:' ? https : http;

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: target.hostname },
    };

    const proxyReq = mod.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on('error', () => {
      clientRes.writeHead(502);
      clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq);
  } catch {
    clientRes.writeHead(400);
    clientRes.end('Bad Request');
  }
}

// ─── VPN Transparent Proxy ─────────────────────────────────────
function proxyThroughVpn(clientReq, clientRes, targetUrl) {
  try {
    // Build VPN URL
    const vpnUrl = buildVpnProxyUrl(targetUrl) || convertToVpnUrl(targetUrl);

    // For system proxy mode, we fetch via VPN and return the content
    const vpnReq = https.get(vpnUrl, {
      headers: {
        'User-Agent': clientReq.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': clientReq.headers['accept'] || '*/*',
      },
      timeout: 15000,
    }, (vpnRes) => {
      // Copy headers, replace Location if it's a VPN redirect
      const headers = { ...vpnRes.headers };
      if (headers.location) {
        // If it's a VPN login page redirect, pass through
      }
      clientRes.writeHead(vpnRes.statusCode, headers);
      vpnRes.pipe(clientRes);
    });

    vpnReq.on('error', (e) => {
      clientRes.writeHead(502);
      clientRes.end(`VPN Proxy Error: ${e.message}`);
    });
  } catch (e) {
    clientRes.writeHead(500);
    clientRes.end(`Error: ${e.message}`);
  }
}

// ─── Status Page ───────────────────────────────────────────────
function serveStatusPage(req, res, port, mode) {
  const modeNames = { redirect: '302 跳转', system: '系统代理', host: 'Host 映射' };
  const modeDescs = {
    redirect: '浏览器访问任意 URL 自动跳转到 VPN 地址',
    system: '设置为操作系统 HTTP 代理，所有流量经 VPN',
    host: '仅对指定域名走 VPN，其余直连',
  };

  let hostListHtml = '';
  if (mode === 'host') {
    hostListHtml = `<h3>Host 映射列表</h3><ul>${[...hostMap.entries()].map(([d, v]) =>
      `<li><code>${d}</code> ${v ? '🟢 VPN' : '🔴 直连'}</li>`
    ).join('')}</ul>`;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>吉大生活+ VPN</title>
<style>body{font-family:'Segoe UI',system-ui,sans-serif;max-width:640px;margin:40px auto;padding:20px;color:#1a1a1a;background:#f9f9f9}
h1{font-size:24px}h3{margin-top:20px;font-size:16px}
code{background:#e8f2fc;padding:2px 6px;border-radius:4px;font-size:13px;color:#0078d4}
ul{padding-left:20px}li{margin:4px 0}
.card{background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
.badge{display:inline-block;padding:2px 10px;border-radius:100px;font-size:12px;font-weight:600;background:#dff6dd;color:#0f7b0f}
</style></head><body>
<h1>🎓 吉大生活+ VPN</h1>
<div class="card">
<p><strong>模式：</strong>${modeNames[mode]} <span class="badge">运行中</span></p>
<p>${modeDescs[mode]}</p>
<p><strong>代理地址：</strong><code>http://127.0.0.1:${port}</code></p>
</div>
${hostListHtml}
<div class="card">
<h3>使用说明</h3>
${mode === 'system' ? `<p>已自动设置系统代理。如需手动配置：</p><p>浏览器 → 设置 → 代理 → <code>http://127.0.0.1:${port}</code></p>` : ''}
${mode === 'host' ? `<p>Host 映射的域名会自动走 VPN，其余直连。可在侧边栏配置映射列表。</p>` : ''}
</div>
</body></html>`);
}

// ─── Main Entry: Start Server ──────────────────────────────────
async function startVpnServer(port = 8080, mode = 'redirect') {
  if (server) await stopVpnServer();

  currentPort = port;
  currentMode = mode;

  if (mode === 'redirect') {
    // Original redirect mode
    server = http.createServer((req, res) => {
      let target = req.url.slice(1);
      if (!target || target === '' || target === 'favicon.ico') {
        serveStatusPage(req, res, port, 'redirect');
        return;
      }
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = 'https://' + target;
      }
      const vpnUrl = convertToVpnUrl(target);
      res.writeHead(302, { Location: vpnUrl });
      res.end();
    });
    await new Promise((resolve, reject) => {
      server.on('error', reject);
      server.listen(port, '127.0.0.1', () => resolve());
    });
  } else {
    // System proxy or Host mode
    server = await createProxyServer(port, mode);
  }

  // Set system proxy for 'system' mode
  if (mode === 'system') {
    setWindowsProxy(true, `127.0.0.1:${port}`);
    notifySystemProxyChanged();
  }

  return { port, mode };
}

// ─── Stop ──────────────────────────────────────────────────────
async function stopVpnServer() {
  // Restore system proxy
  if (currentMode === 'system') {
    setWindowsProxy(false);
    notifySystemProxyChanged();
  }

  return new Promise((resolve) => {
    if (!server) { server = null; return resolve(); }
    server.close(() => { server = null; resolve(); });
  });
}

// ─── Host Map Management ───────────────────────────────────────
function addHost(domain) { hostMap.set(domain.replace(/^https?:\/\//, '').split('/')[0], true); }
function removeHost(domain) { hostMap.delete(domain.replace(/^https?:\/\//, '').split('/')[0]); }
function getHosts() { return [...hostMap.entries()].map(([domain, enabled]) => ({ domain, enabled })); }
function setHosts(hosts) {
  hostMap.clear();
  hosts.forEach(h => hostMap.set(h.domain, h.enabled !== false));
}

module.exports = {
  startVpnServer, stopVpnServer, convertToVpnUrl,
  addHost, removeHost, getHosts, setHosts,
};
