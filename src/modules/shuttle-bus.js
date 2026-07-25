/**
 * 校车时刻表
 * 多校区间班车时刻查询
 */
class ShuttleBusClient {
  constructor() {
    this.routes = [
      {
        id: 'south-nanling',
        name: '前卫南 ↔ 南岭',
        stops: ['前卫南(中心)', '南岭校区'],
        schedule: {
          weekday: ['7:00', '7:30', '8:00', '9:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '17:30'],
          weekend: ['8:00', '9:30', '11:00', '14:00', '16:00'],
        },
        duration: '约40分钟',
        note: '周末及节假日减少班次',
      },
      {
        id: 'south-chaoyang',
        name: '前卫南 ↔ 朝阳',
        stops: ['前卫南(中心)', '朝阳校区'],
        schedule: {
          weekday: ['7:15', '8:15', '9:15', '10:15', '13:15', '14:15', '15:15', '16:15', '17:15'],
          weekend: ['8:30', '10:30', '14:30', '16:30'],
        },
        duration: '约50分钟',
        note: '经停新民校区',
      },
      {
        id: 'south-nanhu',
        name: '前卫南 ↔ 南湖',
        stops: ['前卫南(中心)', '南湖校区'],
        schedule: {
          weekday: ['7:30', '8:30', '10:00', '13:30', '15:00', '17:00'],
          weekend: ['9:00', '11:00', '14:00', '16:00'],
        },
        duration: '约35分钟',
        note: '',
      },
      {
        id: 'nanling-chaoyang',
        name: '南岭 ↔ 朝阳',
        stops: ['南岭校区', '朝阳校区'],
        schedule: {
          weekday: ['7:30', '9:00', '13:30', '15:30', '17:00'],
          weekend: ['9:00', '14:00'],
        },
        duration: '约30分钟',
        note: '',
      },
    ];
  }

  getRoutes() {
    return this.routes.map(r => ({ id: r.id, name: r.name, stops: r.stops, duration: r.duration, note: r.note }));
  }

  getSchedule(routeId) {
    const route = this.routes.find(r => r.id === routeId);
    if (!route) return null;
    const isWeekend = [0, 6].includes(new Date().getDay());
    const times = isWeekend ? route.schedule.weekend : route.schedule.weekday;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const upcoming = times.map(t => {
      const [h, m] = t.split(':').map(Number);
      const diff = h * 60 + m - nowMin;
      return { time: t, minutesLeft: diff, passed: diff < 0 };
    });

    const nextBus = upcoming.find(b => !b.passed);

    return {
      route: route.name,
      duration: route.duration,
      isWeekend,
      times: upcoming,
      nextBus: nextBus || null,
    };
  }

  getNextBus(routeId) {
    const s = this.getSchedule(routeId);
    if (!s) return null;
    if (s.nextBus) {
      const mins = s.nextBus.minutesLeft;
      return {
        time: s.nextBus.time,
        countdown: mins < 60 ? `${mins} 分钟后` : `${Math.floor(mins / 60)}h${mins % 60}m 后`,
        urgent: mins <= 15,
      };
    }
    return { time: '已收车', countdown: '明天请早', urgent: false };
  }
}

module.exports = { ShuttleBusClient };
