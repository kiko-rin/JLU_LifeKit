/**
 * 空教室查询
 * 按时间段查询可用空教室
 */
class EmptyClassroomClient {
  constructor() { this.cookie = null; }

  async getClassrooms({ date, startSlot, endSlot, building }) {
    // In real implementation, query edu system
    // Demo: return mock data
    return this.getDemoClassrooms({ building });
  }

  getDemoClassrooms({ building = 'all' } = {}) {
    const buildings = [
      { name: '逸夫楼', rooms: ['101', '102', '201', '202', '301', '302', '401', '402', '501'] },
      { name: '计算机楼', rooms: ['101', '201', '301', '302', '401', '402'] },
      { name: '数学楼', rooms: ['101', '102', '201', '202', '301'] },
      { name: '外语楼', rooms: ['101', '201', '205', '301', '305'] },
    ];

    const result = [];
    for (const b of buildings) {
      if (building && building !== 'all' && !b.name.includes(building)) continue;
      for (const room of b.rooms) {
        const slots = {};
        for (let s = 1; s <= 12; s++) {
          slots[s] = Math.random() > 0.4; // 60% chance empty
        }
        result.push({ building: b.name, room, capacity: Math.floor(Math.random() * 100 + 60), slots });
      }
    }
    return result;
  }

  /** Get available rooms for a specific time slot */
  filterAvailable(classrooms, slot) {
    return classrooms.filter(c => c.slots[slot]);
  }
}

module.exports = { EmptyClassroomClient };
