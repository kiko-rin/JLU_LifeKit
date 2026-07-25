/**
 * 校园地图 & 导航
 * 交互式校园地图，标注教学楼/食堂/快递点等
 */
class CampusMapClient {
  constructor() {
    this.campuses = [
      {
        id: 'south', name: '前卫南校区（中心校区）', center: [43.838, 125.290],
        places: [
          { id: 's1', name: '逸夫楼', type: 'teaching', lat: 43.839, lng: 125.291, desc: '主要教学楼' },
          { id: 's2', name: '计算机楼', type: 'teaching', lat: 43.837, lng: 125.293, desc: '计算机科学学院' },
          { id: 's3', name: '图书馆', type: 'library', lat: 43.838, lng: 125.289, desc: '中心图书馆' },
          { id: 's4', name: '一食堂', type: 'food', lat: 43.840, lng: 125.288, desc: '大众餐饮' },
          { id: 's5', name: '二食堂', type: 'food', lat: 43.841, lng: 125.292, desc: '特色餐饮' },
          { id: 's6', name: '莘子园', type: 'food', lat: 43.836, lng: 125.290, desc: '清真/快餐' },
          { id: 's7', name: '体育馆', type: 'sport', lat: 43.835, lng: 125.294, desc: '室内运动' },
          { id: 's8', name: '菜鸟驿站', type: 'delivery', lat: 43.842, lng: 125.287, desc: '快递收发' },
          { id: 's9', name: '校医院', type: 'hospital', lat: 43.843, lng: 125.291, desc: '校内医疗' },
          { id: 's10', name: '行政楼', type: 'admin', lat: 43.838, lng: 125.295, desc: '学校行政' },
          { id: 's11', name: '数学楼', type: 'teaching', lat: 43.837, lng: 125.286, desc: '数学学院' },
          { id: 's12', name: '外语楼', type: 'teaching', lat: 43.839, lng: 125.285, desc: '外国语学院' },
        ],
      },
      {
        id: 'nanling', name: '南岭校区', center: [43.860, 125.340],
        places: [
          { id: 'n1', name: '基础楼', type: 'teaching', lat: 43.861, lng: 125.341, desc: '主教学楼' },
          { id: 'n2', name: '一食堂', type: 'food', lat: 43.862, lng: 125.339, desc: '' },
          { id: 'n3', name: '图书馆', type: 'library', lat: 43.860, lng: 125.342, desc: '' },
        ],
      },
    ];
  }

  getCampuses() { return this.campuses.map(c => ({ id: c.id, name: c.name })); }

  getPlaces(campusId) {
    const campus = this.campuses.find(c => c.id === campusId) || this.campuses[0];
    return campus.places;
  }

  search(keyword) {
    const results = [];
    for (const c of this.campuses) {
      for (const p of c.places) {
        if (p.name.includes(keyword) || p.desc.includes(keyword) || p.type.includes(keyword)) {
          results.push({ ...p, campus: c.name });
        }
      }
    }
    return results;
  }

  getCategories() {
    return [
      { id: 'teaching', name: '教学楼', icon: '🏫' },
      { id: 'food', name: '食堂', icon: '🍜' },
      { id: 'library', name: '图书馆', icon: '📚' },
      { id: 'sport', name: '体育', icon: '⚽' },
      { id: 'delivery', name: '快递', icon: '📦' },
      { id: 'hospital', name: '医疗', icon: '🏥' },
      { id: 'admin', name: '行政', icon: '🏛️' },
    ];
  }
}

module.exports = { CampusMapClient };
