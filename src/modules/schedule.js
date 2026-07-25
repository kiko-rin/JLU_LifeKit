/**
 * JLU_schedule reimplementation for Electron
 * Course timetable management for JLU students
 * Original: https://github.com/JFyuhong/JLU_schedule
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ScheduleStore {
  constructor() {
    this._dataDir = path.join(app.getPath('userData'), 'jlu-lifekit');
    this._filePath = path.join(this._dataDir, 'schedules.json');
    this._data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this._filePath)) {
        return JSON.parse(fs.readFileSync(this._filePath, 'utf-8'));
      }
    } catch (e) {
      // ignore
    }
    return { currentId: null, schedules: [] };
  }

  _save() {
    try {
      if (!fs.existsSync(this._dataDir)) {
        fs.mkdirSync(this._dataDir, { recursive: true });
      }
      fs.writeFileSync(this._filePath, JSON.stringify(this._data, null, 2));
    } catch (e) {
      console.error('Failed to save schedule:', e);
    }
  }

  getAll() {
    return this._data.schedules.map(s => ({
      id: s.id,
      name: s.name,
      semesterStart: s.semesterStart,
      courseCount: s.courses.length,
      isCurrent: s.id === this._data.currentId
    }));
  }

  getCurrent() {
    const id = this._data.currentId;
    if (!id) return null;
    return this._data.schedules.find(s => s.id === id) || null;
  }

  setCurrent(id) {
    this._data.currentId = id;
    this._save();
    return { ok: true };
  }

  create({ name, semesterStart }) {
    const schedule = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name || '新课表',
      semesterStart: semesterStart || new Date().toISOString().split('T')[0],
      courses: [],
      createdAt: new Date().toISOString()
    };
    this._data.schedules.push(schedule);
    if (!this._data.currentId) this._data.currentId = schedule.id;
    this._save();
    return schedule;
  }

  update(id, updates) {
    const idx = this._data.schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;
    Object.assign(this._data.schedules[idx], updates);
    this._save();
    return this._data.schedules[idx];
  }

  delete(id) {
    this._data.schedules = this._data.schedules.filter(s => s.id !== id);
    if (this._data.currentId === id) {
      this._data.currentId = this._data.schedules[0]?.id || null;
    }
    this._save();
    return { ok: true };
  }

  /**
   * Import from parsed JLU edu system data
   * courses: Array of { name, teacher, location, dayOfWeek, startSlot, endSlot, weeks, oddEven }
   *   - dayOfWeek: 1-7 (Mon-Sun)
   *   - startSlot/endSlot: 1-12 (class periods)
   *   - weeks: array of week numbers, e.g. [1,2,3,...,16]
   *   - oddEven: 'all' | 'odd' | 'even'
   */
  importFromParsed(semesterStart, courses) {
    const schedule = this.create({
      name: `导入课表 ${new Date().toLocaleDateString('zh-CN')}`,
      semesterStart
    });

    schedule.courses = courses.map((c, i) => ({
      id: `${schedule.id}_${i}`,
      name: c.name || '未知课程',
      teacher: c.teacher || '',
      location: c.location || '',
      dayOfWeek: c.dayOfWeek || 1,
      startSlot: c.startSlot || 1,
      endSlot: c.endSlot || 2,
      weeks: c.weeks || [],
      oddEven: c.oddEven || 'all',
      color: this._getCourseColor(i)
    }));

    this.update(schedule.id, { courses: schedule.courses });
    return schedule;
  }

  _getCourseColor(index) {
    const colors = [
      '#4FC3F7', '#81C784', '#FFB74D', '#E57373',
      '#BA68C8', '#4DB6AC', '#FFD54F', '#7986CB',
      '#A1887F', '#90A4AE', '#F06292', '#AED581'
    ];
    return colors[index % colors.length];
  }

  /**
   * Get courses for a specific week
   */
  getCoursesForWeek(weekNum) {
    const current = this.getCurrent();
    if (!current) return [];
    return current.courses.filter(c => {
      if (!c.weeks || c.weeks.length === 0) return true;
      return c.weeks.includes(weekNum);
    });
  }

  /**
   * Get today's courses
   */
  getTodayCourses() {
    const current = this.getCurrent();
    if (!current) return [];
    const today = new Date().getDay() || 7; // 1-7
    const semesterStart = new Date(current.semesterStart);
    const now = new Date();
    const diffDays = Math.floor((now - semesterStart) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;

    return current.courses.filter(c => {
      if (c.dayOfWeek !== today) return false;
      if (c.weeks && c.weeks.length > 0 && !c.weeks.includes(currentWeek)) return false;
      if (c.oddEven === 'odd' && currentWeek % 2 === 0) return false;
      if (c.oddEven === 'even' && currentWeek % 2 !== 0) return false;
      return true;
    }).sort((a, b) => a.startSlot - b.startSlot);
  }
}

module.exports = { ScheduleStore };
