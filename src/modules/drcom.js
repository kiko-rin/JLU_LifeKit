/**
 * drcom-jlu-qt reimplementation in Node.js
 * DrCOM campus network authentication client for JLU
 * Original: https://github.com/code4lala/drcom-jlu-qt
 * Protocol reference: https://github.com/drcoms/jlu-drcom-client
 */
const dgram = require('dgram');
const crypto = require('crypto');

class DrcomClient {
  constructor() {
    this.loggedIn = false;
    this.info = null;
    this.socket = null;
    this.keepAliveTimer = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.credentials = null;
  }

  /**
   * Generate DrCOM challenge packet
   */
  _buildChallengePacket(salt) {
    const pkt = Buffer.alloc(20);
    pkt[0] = 0x01;
    pkt[1] = 0x02;
    pkt[2] = 0x17; // JLU magic
    pkt[3] = 0x00;
    if (salt) {
      salt.copy(pkt, 4, 0, 16);
    }
    return pkt;
  }

  /**
   * Generate DrCOM login packet
   */
  _buildLoginPacket({ username, password, mac, salt }) {
    const usernameBuf = Buffer.from(username, 'utf-8');
    const passwordHash = crypto.createHash('md5').update(password).digest();

    // MAC address bytes
    let macBytes;
    if (mac && mac.includes(':')) {
      macBytes = Buffer.from(mac.split(':').map(b => parseInt(b, 16)));
    } else if (mac && mac.includes('-')) {
      macBytes = Buffer.from(mac.split('-').map(b => parseInt(b, 16)));
    } else {
      macBytes = Buffer.alloc(6, 0x00);
    }

    // Build packet
    const pkt = Buffer.alloc(330);
    pkt[0] = 0x01;
    pkt[1] = 0x00;
    pkt[2] = usernameBuf.length + 20;
    // Copy password MD5
    passwordHash.copy(pkt, 4);
    // Copy username
    usernameBuf.copy(pkt, 20);
    // Copy MAC
    macBytes.copy(pkt, 56);

    return pkt;
  }

  /**
   * Login to DrCOM
   */
  async login({ server = '10.10.10.10', username, password, mac }) {
    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }

    this.credentials = { server, username, password, mac };

    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket('udp4');
      const timeout = setTimeout(() => {
        this.socket?.close();
        reject(new Error('连接超时，请检查网络'));
      }, 10000);

      // Send challenge
      const challengePkt = this._buildChallengePacket();
      this.socket.send(challengePkt, 0, challengePkt.length, 61440, server);

      this.socket.on('message', (msg, rinfo) => {
        clearTimeout(timeout);

        // Parse response
        if (msg[0] === 0x02) {
          // Challenge response received, send login
          const loginPkt = this._buildLoginPacket({
            username, password, mac, salt: msg
          });
          this.socket.send(loginPkt, 0, loginPkt.length, 61440, server);
        } else if (msg[0] === 0x04) {
          // Login success
          this.loggedIn = true;
          this.info = {
            server,
            username,
            ip: rinfo.address,
            loginTime: new Date().toLocaleString('zh-CN')
          };
          this._startKeepAlive(server);
          resolve({ message: '登录成功', info: this.info });
        } else if (msg[0] === 0x05) {
          // Login failed
          this.socket.close();
          reject(new Error('登录失败：用户名或密码错误'));
        }
      });

      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        this.loggedIn = false;
        reject(new Error(`网络错误: ${err.message}`));
      });
    });
  }

  /**
   * Keep-alive heartbeat
   */
  _startKeepAlive(server) {
    this.keepAliveTimer = setInterval(() => {
      if (!this.socket || !this.loggedIn) return;
      const pkt = Buffer.alloc(4);
      pkt[0] = 0x07;
      pkt[1] = 0x00;
      try {
        this.socket.send(pkt, 0, pkt.length, 61440, server);
      } catch (e) {
        // ignore
      }
    }, 30000);
  }

  /**
   * Logout from DrCOM
   */
  async logout() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.socket) {
      try {
        const pkt = Buffer.alloc(4);
        pkt[0] = 0x06;
        pkt[1] = 0x00;
        if (this.credentials?.server) {
          this.socket.send(pkt, 0, pkt.length, 61440, this.credentials.server);
        }
        this.socket.close();
      } catch (e) {
        // ignore
      }
      this.socket = null;
    }
    this.loggedIn = false;
    this.info = null;
    this.credentials = null;
    return { message: '已注销' };
  }
}

module.exports = { DrcomClient };
