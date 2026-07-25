/**
 * 吉大生活+ — 术语解释 & 功能说明
 * 为界面中的专业名词提供悬浮提示
 */

const GLOSSARY = {
  // ─── VPN ────────────────────────────────────────────────────
  'VPN': 'Virtual Private Network（虚拟专用网络）。吉大提供 Web VPN 服务，允许在校外通过浏览器访问校内资源（如图书馆数据库、教务系统等）。',
  '302 跳转': 'HTTP 302 重定向。输入目标网址后，自动跳转到 JLU Web VPN 对应地址。最简单的使用方式，无需修改系统设置。',
  '系统代理': '将本机的 HTTP/HTTPS 代理设置为吉大 VPN 代理服务器。设置后，浏览器和其他应用的所有网络请求都会自动走 VPN 通道，无需手动拼接 URL。',
  'Host 映射': '仅将指定域名（如 scholar.google.com）的请求走 VPN，其余域名直连。比系统代理更精细，不会拖慢国内网站访问速度。',
  'DrCOM': '吉大校园网认证协议。连接 JLU.PC 等校园 WiFi 后，需要通过 DrCOM 客户端输入账号密码完成认证，才能正常上网。',
  'MAC 地址': '网卡的物理地址（Media Access Control Address），格式如 AA:BB:CC:DD:EE:FF。有线网要求 MAC 地址与网络中心注册的一致，无线网可随意填写。',

  // ─── 学习服务 ───────────────────────────────────────────────
  '课表': '从吉大教务系统导入的个人课程表，支持按周次查看、手动添加课程、多课表管理。',
  '学在吉大': '吉林大学的在线学习平台（study.jlu.edu.cn），提供录播课程、直播回放等视频资源。',
  '抢课': '在选课开放期间，自动循环尝试选择目标课程，直到成功选上。适合热门课程（如体育、通识选修）竞争激烈时使用。',
  'GPA': 'Grade Point Average（平均学分绩点）。吉大采用 4.0 制，计算公式：GPA = Σ(课程绩点 × 学分) / Σ学分。是保研、评奖、出国的重要参考指标。',
  '绩点': '百分制成绩对应的 4.0 分制数值。吉大标准：<60→0，60-63→1.0，64-66→1.3，67-69→1.7，70-73→2.0，74-76→2.3，77-79→2.7，80-83→3.0，84-86→3.3，87-89→3.7，90-100→4.0。',
  '学分': '衡量课程学习量的单位。每门课有对应学分数，毕业需修满培养方案要求的总学分（计科 2022 版要求 170 学分）。',
  '培养方案': '学校对各专业学生必须完成的课程、学分、实践环节的总体规定。不同专业、不同年份的培养方案可能不同。',
  '考试安排': '教务系统发布的期末考试时间、地点和座位号。本功能自动同步并显示考前倒计时。',
  '空教室': '查询某时间段内没有排课的教室，方便找地方自习。',

  // ─── 校园生活 ───────────────────────────────────────────────
  '校园卡': '吉林大学一卡通，用于食堂消费、超市购物、图书馆借书、打印复印等。可在此查看余额和近期消费记录。',
  '校车': '吉大有 6 个校区（前卫南、南岭、朝阳、南湖、新民、和平），校区间有免费班车。此处提供时刻表和下一班车倒计时。',
  '快递点': '校内各快递公司的代收点位置和营业时间。包括菜鸟驿站、京东、顺丰、EMS 等。',
  '座位预约': '通过 libseat.jlu.edu.cn 预约图书馆座位。支持手动预约和自动预约（每晚 21:00 开放次日预约）。',
  '研修间': '图书馆的小组学习室，可在线预约，适合小组讨论和项目协作。',
  '校园地图': '标注了各校区主要建筑位置，包括教学楼、食堂、图书馆、快递点、校医院等。',

  // ─── 效率工具 ───────────────────────────────────────────────
  '番茄钟': '一种时间管理方法：专注工作 25 分钟（一个"番茄"），然后休息 5 分钟。每 4 个番茄后长休息 15 分钟。帮助保持专注、避免疲劳。',
  '日历导出': '将课表和考试安排导出为 .ics 文件，可导入 Google Calendar、Apple Calendar、Outlook 等日历应用，实现课程/考试提醒。',

  // ─── 通知 ───────────────────────────────────────────────────
  'OA 通知': 'Office Automation 系统通知。吉大通过 oa.jlu.edu.cn 发布学校公告、行政通知等。开启监控后，新通知会自动推送到 Windows 系统通知。',
  '通知爬虫': '参考 Reachee 项目实现的 OA 通知自动抓取程序。定时检查是否有新通知，有则推送提醒。',
};

// ─── Render info icon with tooltip ────────────────────────────
function infoIcon(term, opts = {}) {
  const desc = GLOSSARY[term];
  if (!desc) return '';
  const size = opts.size || 14;
  return `<span class="info-tip" data-tip="${desc.replace(/"/g, '&quot;')}" title="${term}"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/><line x1="24" y1="22" x2="24" y2="34"/><circle cx="24" cy="14" r="2" fill="currentColor"/></svg></span>`;
}

// ─── Create info banner for page top ──────────────────────────
function infoBanner(text) {
  return `<div class="info-banner"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="#0078d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/><line x1="24" y1="22" x2="24" y2="34"/><circle cx="24" cy="14" r="2" fill="#0078d4"/></svg><span>${text}</span></div>`;
}

// ─── Initialize all tooltips on page ──────────────────────────
function initInfoTips() {
  // Tooltip positioning
  document.addEventListener('mouseenter', (e) => {
    const tip = e.target.closest('.info-tip');
    if (!tip) return;
    // Remove existing
    document.querySelectorAll('.info-tooltip-popup').forEach(el => el.remove());

    const popup = document.createElement('div');
    popup.className = 'info-tooltip-popup';
    popup.textContent = tip.dataset.tip;
    document.body.appendChild(popup);

    const rect = tip.getBoundingClientRect();
    popup.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
    popup.style.top = (rect.bottom + 6) + 'px';
    // Ensure it fits
    requestAnimationFrame(() => {
      const pr = popup.getBoundingClientRect();
      if (pr.right > window.innerWidth - 8) popup.style.left = (window.innerWidth - pr.width - 8) + 'px';
      if (pr.bottom > window.innerHeight - 8) popup.style.top = (rect.top - pr.height - 6) + 'px';
    });
  }, true);

  document.addEventListener('mouseleave', (e) => {
    if (e.target.closest('.info-tip')) {
      document.querySelectorAll('.info-tooltip-popup').forEach(el => el.remove());
    }
  }, true);
}

module.exports = { GLOSSARY, infoIcon, infoBanner, initInfoTips };
