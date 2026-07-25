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

}

module.exports = { ExamClient };
