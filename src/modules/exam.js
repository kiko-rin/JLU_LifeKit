/**
 * 考试安排查询
 * 同步教务系统考试时间、地点、座位号，考前倒计时
 */
class ExamClient {
  constructor() {
    this.cookie = null;
  }

  async getExams(config) {
    // In real implementation, fetch from edu system
    // Demo fallback
    return this.getDemoExams();
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

  getDemoExams() {
    const y = new Date().getFullYear();
    return [
      { name: '高等数学A', type: '期末', date: `${y}-01-10`, time: '08:00-10:00', location: '逸夫楼301', seat: '12', courseId: 'c1' },
      { name: '程序设计基础', type: '期末', date: `${y}-01-15`, time: '14:00-16:00', location: '计算机楼401', seat: '5', courseId: 'c2' },
      { name: '大学物理', type: '期末', date: `${y}-01-18`, time: '08:00-10:00', location: '物理楼201', seat: '28', courseId: 'c3' },
      { name: '数据结构', type: '期末', date: `${y}-01-22`, time: '14:00-16:00', location: '计算机楼302', seat: '18', courseId: 'c4' },
      { name: '线性代数', type: '期末', date: `${y}-01-25`, time: '08:00-10:00', location: '数学楼101', seat: '9', courseId: 'c5' },
      { name: '大学英语', type: '期末', date: `${y}-01-07`, time: '14:00-16:00', location: '外语楼205', seat: '32', courseId: 'c6' },
    ];
  }
}

module.exports = { ExamClient };
