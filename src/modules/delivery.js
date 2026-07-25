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
    // Demo:
    return {
      carrier,
      trackingNo,
      status: '已签收',
      timeline: [
        { time: '2026-07-25 09:30', desc: '已签收，签收人：菜鸟驿站代收' },
        { time: '2026-07-25 06:15', desc: '派件中，快递员：张师傅 138****1234' },
        { time: '2026-07-24 22:00', desc: '到达长春转运中心' },
        { time: '2026-07-23 18:00', desc: '已发出，上海转运中心' },
        { time: '2026-07-23 14:00', desc: '已揽收，上海浦东营业部' },
      ],
    };
  }

  getCarrierList() {
    return ['顺丰', '京东', '中通', '圆通', '韵达', '申通', '极兔', 'EMS', '邮政', '菜鸟'];
  }
}

module.exports = { DeliveryClient };
