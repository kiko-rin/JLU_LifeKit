/**
 * 考试安排查询
 * 同步教务系统考试时间、地点、座位号，考前倒计时
 */
class ExamClient {
  constructor() {
    this.cookie = null;
  }

  async getExams({ username, password }) {
    // In real implementation, fetch from edu system
    // Returns: [{ name, type, date, time, location, seat, note }]
    return [];
  }

  /** Calculate countdown for each exam */
  getCountdowns(exams) {
    const now = Date.now();
    return exams.map(e => {
      const examTime = new Date(`${e.date} ${e.time}`).getTime();
      const diff = examTime - now;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      return {
        ...e,
        countdown: diff > 0 ? (days > 0 ? `${days}天${hours}小时` : `${hours}小时`) : '已结束',
        urgent: diff > 0 && diff <= 86400000 * 3, // within 3 days
        passed: diff <= 0,
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /** Demo data */
  getDemoExams() {
    const y = new Date().getFullYear();
    return [
      { name: '高等数学A', type: '期末考试', date: `${y}-08-25`, time: '09:00', location: '逸夫楼301', seat: '15', note: '带计算器' },
      { name: '大学物理', type: '期末考试', date: `${y}-08-27`, time: '14:00', location: '数学楼201', seat: '22', note: '' },
      { name: '程序设计基础', type: '期末考试', date: `${y}-08-29`, time: '09:00', location: '计算机楼401', seat: '08', note: '机考' },
      { name: '线性代数', type: '期末考试', date: `${y}-09-01`, time: '14:00', location: '逸夫楼102', seat: '31', note: '' },
      { name: '大学英语', type: '期末考试', date: `${y}-09-03`, time: '09:00', location: '外语楼305', seat: '12', note: '带耳机' },
      { name: '体育', type: '考查', date: `${y}-07-28`, time: '10:00', location: '体育馆', seat: '—', note: '' },
    ];
  }
}

module.exports = { ExamClient };
