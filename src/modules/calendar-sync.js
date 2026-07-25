/**
 * 校内通知日历同步
 * 将教务通知、考试、课程自动写入系统日历（.ics 导出）
 */
const fs = require('fs');
const path = require('path');

class CalendarSyncClient {
  /**
   * Generate .ics file content from events
   */
  generateICS(events, calendarName = 'JLU LifeKit') {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JLU LifeKit//CN',
      `X-WR-CALNAME:${calendarName}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const evt of events) {
      const uid = `jlu-lifekit-${evt.id || Date.now()}@lifekit`;
      const dtStart = this._toICSDate(evt.start);
      const dtEnd = this._toICSDate(evt.end);
      const now = this._toICSDate(new Date());

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${this._escape(evt.title)}`,
        `DESCRIPTION:${this._escape(evt.description || '')}`,
        `LOCATION:${this._escape(evt.location || '')}`,
      );
      if (evt.alarm) {
        lines.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:Reminder: ${this._escape(evt.title)}`, 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Export courses to .ics
   */
  coursesToEvents(courses, semesterStart, weeks = 20) {
    const events = [];
    const startDate = new Date(semesterStart);

    for (const course of courses) {
      const courseWeeks = course.weeks || Array.from({ length: weeks }, (_, i) => i + 1);
      for (const week of courseWeeks) {
        if (course.oddEven === 'odd' && week % 2 === 0) continue;
        if (course.oddEven === 'even' && week % 2 !== 0) continue;

        const dayOffset = (week - 1) * 7 + (course.dayOfWeek - 1);
        const eventDate = new Date(startDate);
        eventDate.setDate(eventDate.getDate() + dayOffset);

        // Slot to time mapping (approximate)
        const slotTimes = {
          1: '08:00', 2: '08:50', 3: '09:50', 4: '10:40',
          5: '13:00', 6: '13:50', 7: '14:50', 8: '15:40',
          9: '18:00', 10: '18:50', 11: '19:50', 12: '20:40',
        };
        const endTimeSlots = {
          2: '09:40', 4: '11:30', 6: '14:40', 8: '16:30', 10: '19:40', 12: '21:30',
        };

        const startStr = slotTimes[course.startSlot] || '08:00';
        const endStr = endTimeSlots[course.endSlot] || slotTimes[Math.min(course.endSlot + 1, 12)] || '09:40';

        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);

        const start = new Date(eventDate); start.setHours(sh, sm, 0);
        const end = new Date(eventDate); end.setHours(eh, em, 0);

        events.push({
          id: `${course.name}_w${week}_${course.dayOfWeek}`,
          title: course.name,
          start, end,
          location: course.location || '',
          description: `教师：${course.teacher || '—'} | 第${week}周`,
        });
      }
    }
    return events;
  }

  /**
   * Exams to events
   */
  examsToEvents(exams) {
    return exams.map(e => {
      const [h, m] = (e.time || '09:00').split(':').map(Number);
      const start = new Date(`${e.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + 2 * 3600000); // assume 2h
      return {
        id: `exam_${e.name}`,
        title: `📝 ${e.name} (${e.type})`,
        start, end,
        location: `${e.location} 座位${e.seat || '—'}`,
        description: e.note || '',
      };
    });
  }

  saveICS(content, filename) {
    const filePath = path.join(process.cwd(), filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  _toICSDate(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  _escape(str) {
    return str.replace(/[\\;,\n]/g, (m) => ({ '\\': '\\\\', ';': '\\;', ',': '\\,', '\n': '\\n' }[m]));
  }
}

module.exports = { CalendarSyncClient };
