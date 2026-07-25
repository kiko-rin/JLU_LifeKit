const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 课程评价 & 教授风评
 * 查看学长学姐对课程/老师的评价
 */
class CourseReviewClient {
  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'jlu-lifekit', 'reviews.json');
    this.reviews = this._load();
  }

  /** Search courses */
  searchCourses(keyword) {
    // In real implementation, query from database or API
    return this.getDemoCourses().filter(c =>
      c.name.includes(keyword) || c.teacher.includes(keyword) || c.department.includes(keyword)
    );
  }

  /** Get reviews for a course */
  getReviews(courseId) {
    return this.getDemoReviews().filter(r => r.courseId === courseId);
  }

  /** Submit a review */
  addReview(review) {
    this.reviews.push({ ...review, id: Date.now(), time: new Date().toISOString() });
    this._save();
  }

  _save() {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dataPath, JSON.stringify(this.reviews, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save reviews:', e);
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        return JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    }
    return [];
  }

  getDemoCourses() {
    return [
      { id: 'c1', name: '高等数学A', teacher: '张三', department: '数学学院', rating: 4.5, difficulty: 4, workload: 4, reviews: 128 },
      { id: 'c2', name: '程序设计基础', teacher: '王五', department: '计算机学院', rating: 4.8, difficulty: 3, workload: 3, reviews: 95 },
      { id: 'c3', name: '大学物理', teacher: '李四', department: '物理学院', rating: 4.2, difficulty: 4, workload: 3, reviews: 87 },
      { id: 'c4', name: '数据结构', teacher: '赵六', department: '计算机学院', rating: 4.6, difficulty: 4, workload: 4, reviews: 76 },
      { id: 'c5', name: '线性代数', teacher: '孙七', department: '数学学院', rating: 4.0, difficulty: 3, workload: 3, reviews: 104 },
      { id: 'c6', name: '大学英语', teacher: '周八', department: '外语学院', rating: 3.8, difficulty: 2, workload: 2, reviews: 156 },
      { id: 'c7', name: '离散数学', teacher: '吴九', department: '计算机学院', rating: 4.3, difficulty: 4, workload: 3, reviews: 62 },
      { id: 'c8', name: '概率论', teacher: '郑十', department: '数学学院', rating: 4.1, difficulty: 3, workload: 3, reviews: 91 },
    ];
  }

  getDemoReviews() {
    return [
      { courseId: 'c1', author: '匿名', rating: 5, content: '老师讲得很好，深入浅出，考试不难但需要认真复习。', semester: '2025-1', helpful: 42 },
      { courseId: 'c1', author: '匿名', rating: 4, content: '作业比较多，但能学到东西。建议多做课后题。', semester: '2025-1', helpful: 28 },
      { courseId: 'c2', author: '匿名', rating: 5, content: 'C语言入门首选，老师很有耐心，实验课很有趣。', semester: '2025-1', helpful: 35 },
      { courseId: 'c2', author: '匿名', rating: 5, content: '给分很好，认真学能拿高分。', semester: '2024-2', helpful: 21 },
      { courseId: 'c4', author: '匿名', rating: 4, content: '课程内容扎实，需要花时间理解。实验报告有点多。', semester: '2025-1', helpful: 33 },
    ];
  }
}

module.exports = { CourseReviewClient };
