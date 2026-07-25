/**
 * 自习计时器 (番茄钟) + 待办事务
 * 专注计时 + 学习统计 + Todo 管理
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class PomodoroTimer {
  constructor(store) {
    this.store = store;
    this.timer = null;
    this.running = false;
    this.paused = false;
    this.currentSession = null;
    this.activeTodoId = null; // 当前专注的待办
    this.config = {
      workMinutes: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionsBeforeLong: 4,
    };
    this._data = this._load();
  }

  _dataPath() {
    return path.join(app.getPath('userData'), 'jlu-lifekit', 'pomodoro.json');
  }

  _load() {
    try {
      const raw = fs.readFileSync(this._dataPath(), 'utf-8');
      const data = JSON.parse(raw);
      // Migrate old format
      if (!data.todos) data.todos = [];
      if (!data.history) data.history = [];
      return data;
    } catch {
      return { date: this._today(), sessions: 0, totalMinutes: 0, history: [], todos: [] };
    }
  }

  _save() {
    try {
      const dir = path.dirname(this._dataPath());
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._dataPath(), JSON.stringify(this._data, null, 2));
    } catch (e) { /* ignore */ }
  }

  _today() { return new Date().toISOString().split('T')[0]; }

  _ensureToday() {
    if (this._data.date !== this._today()) {
      // Archive yesterday's data
      this._data.date = this._today();
      this._data.sessions = 0;
      this._data.totalMinutes = 0;
      this._data.history = [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Timer
  // ═══════════════════════════════════════════════════════════════

  start(type = 'work', todoId = null) {
    if (this.running) return this.getStatus();

    const duration = type === 'work' ? this.config.workMinutes
      : type === 'short_break' ? this.config.shortBreak
      : this.config.longBreak;

    this.currentSession = {
      type,
      startTime: Date.now(),
      duration: duration * 60 * 1000,
      remaining: duration * 60 * 1000,
    };
    this.activeTodoId = todoId || null;
    this.running = true;
    this.paused = false;

    this.timer = setInterval(() => {
      if (this.paused) return;
      this.currentSession.remaining -= 1000;
      if (this.currentSession.remaining <= 0) this._onComplete();
    }, 1000);

    return this.getStatus();
  }

  pause() {
    this.paused = true;
    return this.getStatus();
  }

  resume() {
    this.paused = false;
    return this.getStatus();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.paused = false;
    this.currentSession = null;
    this.activeTodoId = null;
    return this.getStatus();
  }

  _onComplete() {
    clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this._ensureToday();

    if (this.currentSession?.type === 'work') {
      this._data.sessions++;
      this._data.totalMinutes += this.config.workMinutes;
      const entry = {
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        duration: this.config.workMinutes,
        type: 'work',
        todoId: this.activeTodoId,
        todoTitle: '',
      };
      // Attach todo title
      if (this.activeTodoId) {
        const todo = this._data.todos.find(t => t.id === this.activeTodoId);
        if (todo) {
          entry.todoTitle = todo.title;
          todo.pomodoros = (todo.pomodoros || 0) + 1;
          todo.totalMinutes = (todo.totalMinutes || 0) + this.config.workMinutes;
        }
      }
      this._data.history.push(entry);
      this._save();
    }

    this.currentSession = null;
    this.activeTodoId = null;
  }

  // ═══════════════════════════════════════════════════════════════
  // Todo Management
  // ═══════════════════════════════════════════════════════════════

  addTodo({ title, priority = 'normal', dueDate = null, tags = [] }) {
    if (!title || !title.trim()) return null;
    const todo = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title: title.trim(),
      done: false,
      priority, // 'low' | 'normal' | 'high' | 'urgent'
      dueDate,
      tags,
      pomodoros: 0,
      totalMinutes: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this._data.todos.unshift(todo);
    this._save();
    return todo;
  }

  updateTodo(id, updates) {
    const todo = this._data.todos.find(t => t.id === id);
    if (!todo) return null;
    Object.assign(todo, updates);
    if (updates.done === true && !todo.completedAt) {
      todo.completedAt = new Date().toISOString();
    }
    if (updates.done === false) {
      todo.completedAt = null;
    }
    this._save();
    return todo;
  }

  deleteTodo(id) {
    this._data.todos = this._data.todos.filter(t => t.id !== id);
    this._save();
  }

  toggleTodo(id) {
    const todo = this._data.todos.find(t => t.id === id);
    if (!todo) return null;
    todo.done = !todo.done;
    todo.completedAt = todo.done ? new Date().toISOString() : null;
    this._save();
    return todo;
  }

  getTodos() {
    return this._data.todos || [];
  }

  reorderTodos(fromIndex, toIndex) {
    const todos = this._data.todos;
    if (fromIndex < 0 || fromIndex >= todos.length || toIndex < 0 || toIndex >= todos.length) return;
    const [moved] = todos.splice(fromIndex, 1);
    todos.splice(toIndex, 0, moved);
    this._save();
  }

  // ═══════════════════════════════════════════════════════════════
  // Status
  // ═══════════════════════════════════════════════════════════════

  getStatus() {
    this._ensureToday();
    const activeTodo = this.activeTodoId ? this._data.todos.find(t => t.id === this.activeTodoId) : null;
    return {
      running: this.running,
      paused: this.paused,
      session: this.currentSession ? {
        type: this.currentSession.type,
        remaining: this.currentSession.remaining,
        remainingText: this._formatTime(this.currentSession.remaining),
        progress: 1 - (this.currentSession.remaining / this.currentSession.duration),
        typeName: this.currentSession.type === 'work' ? '专注中' : this.currentSession.type === 'short_break' ? '短休息' : '长休息',
        activeTodo: activeTodo ? { id: activeTodo.id, title: activeTodo.title } : null,
      } : null,
      today: {
        date: this._data.date,
        sessions: this._data.sessions,
        totalMinutes: this._data.totalMinutes,
        history: this._data.history,
      },
      todos: this._data.todos,
      config: this.config,
    };
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    return this.config;
  }

  _formatTime(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}

module.exports = { PomodoroTimer };
