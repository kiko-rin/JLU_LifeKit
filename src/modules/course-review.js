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
    return [];
  }

  /** Get reviews for a course */
  getReviews(courseId) {
    return [];
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

}

module.exports = { CourseReviewClient };
