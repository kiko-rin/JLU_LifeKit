/**
 * 食堂菜单 & 拥挤度
 * 各食堂菜单、推荐、用餐高峰提示
 */
class CafeteriaClient {
  constructor() {
    this.cafeterias = [
      { id: 'south1', name: '前卫南一食堂', floors: 2, location: '中心校区' },
      { id: 'south2', name: '前卫南二食堂', floors: 3, location: '中心校区' },
      { id: 'shenzi', name: '莘子园', floors: 2, location: '中心校区' },
      { id: 'nanling1', name: '南岭一食堂', floors: 2, location: '南岭校区' },
      { id: 'nanling2', name: '南岭二食堂', floors: 2, location: '南岭校区' },
      { id: 'chaoyang', name: '朝阳校区食堂', floors: 1, location: '朝阳校区' },
      { id: 'nanhu', name: '南湖校区食堂', floors: 1, location: '南湖校区' },
      { id: 'newminzhu', name: '新民校区食堂', floors: 1, location: '新民校区' },
    ];
  }

  getCafeterias() { return this.cafeterias; }

  /** Estimate crowd level based on time of day */
  getCrowdLevel(cafeteriaId) {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const t = h * 60 + m;
    let level, label;
    if (t >= 660 && t <= 750) { level = 'high'; label = '高峰期 🔴'; }       // 11:00-12:30
    else if (t >= 750 && t <= 810) { level = 'medium'; label = '较拥挤 🟡'; } // 12:30-13:30
    else if (t >= 1080 && t <= 1170) { level = 'high'; label = '高峰期 🔴'; } // 18:00-19:30
    else if (t >= 420 && t <= 540) { level = 'low'; label = '空闲 🟢'; }      // 7:00-9:00
    else if (t >= 540 && t <= 660) { level = 'medium'; label = '较拥挤 🟡'; } // 9:00-11:00
    else { level = 'low'; label = '空闲 🟢'; }
    return { level, label, time: `${h}:${String(m).padStart(2, '0')}` };
  }

  /** Get recommended dishes (demo data) */
  getMenu(cafeteriaId) {
    const menus = {
      south1: {
        breakfast: ['豆浆油条', '小米粥+包子', '煎饼果子', '鸡蛋灌饼'],
        lunch: ['红烧肉套餐', '麻辣香锅', '鸡公煲', '兰州拉面', '铁板饭'],
        dinner: ['黄焖鸡米饭', '烤肉饭', '石锅拌饭', '砂锅米线'],
      },
      south2: {
        breakfast: ['豆腐脑', '肉夹馍', '手抓饼', '紫薯粥'],
        lunch: ['水煮鱼', '麻辣烫', '盖浇饭', '韩式拌饭', '炒面'],
        dinner: ['炸鸡汉堡', '酸辣粉', '饺子', '冒菜'],
      },
      shenzi: {
        breakfast: ['八宝粥', '烧饼', '茶鸡蛋', '牛奶面包'],
        lunch: ['回锅肉', '鱼香肉丝', '宫保鸡丁', '地三鲜', '凉皮'],
        dinner: ['刀削面', '炸酱面', '馄饨', '肉夹馍'],
      },
    };
    const m = menus[cafeteriaId] || menus.south1;
    return { ...m, recommend: m.lunch.slice(0, 3) };
  }
}

module.exports = { CafeteriaClient };
