/**
 * 快递查询
 * 聚合快递状态，显示校内快递点信息
 */
const https = require('https');

class DeliveryClient {
  constructor() {
    this.expressPoints = [
      { id: 'cainiao_south', name: '菜鸟驿站（前卫南）', location: '前卫南校区东门', hours: '08:00-21:00', carriers: ['菜鸟', '中通', '圆通', '韵达', '申通'] },
      { id: 'jd_south', name: '京东快递点（前卫南）', location: '前卫南校区南门', hours: '09:00-19:00', carriers: ['京东'] },
      { id: 'sf_south', name: '顺丰速运（前卫南）', location: '前卫南校区西门', hours: '08:30-20:00', carriers: ['顺丰'] },
      { id: 'cainiao_nanling', name: '菜鸟驿站（南岭）', location: '南岭校区北门', hours: '08:00-20:00', carriers: ['菜鸟', '中通', '圆通', '韵达'] },
      { id: 'ems_south', name: 'EMS 代收点', location: '前卫南校区邮局', hours: '09:00-17:00', carriers: ['EMS', '邮政'] },
    ];
  }

  getExpressPoints() { return this.expressPoints; }

  async track({ carrier, trackingNo }) {
    // In real implementation, call tracking API (kuaidi100 etc.)
    return { carrier, trackingNo, status: '查询中', timeline: [] };
  }

  getCarrierList() {
    return ['顺丰', '京东', '中通', '圆通', '韵达', '申通', '极兔', 'EMS', '邮政', '菜鸟'];
  }
}

module.exports = { DeliveryClient };
