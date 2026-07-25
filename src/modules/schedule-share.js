/**
 * 课程表分享
 * 生成精美课表图片
 */
class ScheduleShareClient {
  /**
   * Generate HTML for course table image
   */
  generateHTML(courses, options = {}) {
    const { title = '我的课表', semester = '', weekNum = 1 } = options;

    const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#E57373', '#BA68C8', '#4DB6AC', '#FFD54F', '#7986CB', '#F06292', '#AED581'];
    const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const slots = ['第1节', '第2节', '第3节', '第4节', '第5节', '第6节', '第7节', '第8节', '第9节', '第10节', '第11节', '第12节'];

    // Build grid
    const grid = Array.from({ length: 12 }, () => Array(7).fill(null));
    courses.forEach((c, i) => {
      if (c.dayOfWeek >= 1 && c.dayOfWeek <= 7) {
        for (let s = c.startSlot; s <= c.endSlot; s++) {
          if (s >= 1 && s <= 12) grid[s - 1][c.dayOfWeek - 1] = { ...c, color: c.color || colors[i % colors.length] };
        }
      }
    });

    let tableRows = '';
    for (let s = 0; s < 12; s++) {
      tableRows += `<tr><td class="slot-label">${slots[s]}</td>`;
      for (let d = 0; d < 7; d++) {
        const c = grid[s][d];
        if (c) {
          const isStart = s === 0 || grid[s - 1]?.[d]?.name !== c.name;
          if (isStart) {
            let span = 1;
            while (s + span < 12 && grid[s + span]?.[d]?.name === c.name) span++;
            tableRows += `<td rowspan="${span}" class="course-cell" style="background:${c.color}"><div class="cc-name">${c.name}</div><div class="cc-info">${c.location || ''}</div></td>`;
          }
        } else {
          tableRows += '<td class="empty-cell"></td>';
        }
      }
      tableRows += '</tr>';
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Microsoft YaHei', sans-serif; background:#f5f5f5; padding:24px; }
      .container { background:#fff; border-radius:16px; padding:24px; box-shadow:0 4px 24px rgba(0,0,0,0.08); max-width:700px; margin:0 auto; }
      .header { text-align:center; margin-bottom:16px; }
      .header h1 { font-size:22px; color:#1a1a1a; }
      .header p { font-size:13px; color:#888; margin-top:4px; }
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th, td { border:1px solid #e0e0e0; text-align:center; padding:6px 2px; }
      th { background:#f0f4f8; font-weight:600; color:#333; height:32px; }
      .slot-label { width:52px; font-size:11px; color:#888; background:#fafafa; }
      .course-cell { color:#fff; border-radius:4px; padding:4px !important; vertical-align:middle; }
      .cc-name { font-weight:600; font-size:12px; line-height:1.3; }
      .cc-info { font-size:10px; opacity:0.85; margin-top:2px; }
      .empty-cell { background:#fafafa; }
      .footer { text-align:center; margin-top:12px; font-size:11px; color:#aaa; }
    </style></head><body><div class="container">
      <div class="header"><h1>${title}</h1><p>${semester} ${weekNum ? `· 第${weekNum}周` : ''}</p></div>
      <table><thead><tr>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
      <div class="footer">JLU LifeKit · 生成于 ${new Date().toLocaleDateString('zh-CN')}</div>
    </div></body></html>`;
  }
}

module.exports = { ScheduleShareClient };
