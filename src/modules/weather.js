/**
 * 天气 & 穿衣建议
 * 基于校区位置的精准天气
 */
const https = require('https');

class WeatherClient {
  constructor() {
    this.campusCoords = {
      south: { lat: 43.838, lon: 125.290, name: '前卫南' },
      nanling: { lat: 43.860, lon: 125.340, name: '南岭' },
      chaoyang: { lat: 43.868, lon: 125.310, name: '朝阳' },
      nanhu: { lat: 43.845, lon: 125.330, name: '南湖' },
      xinmin: { lat: 43.878, lon: 125.300, name: '新民' },
    };
  }

  _fetch(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { timeout: 8000 }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  }

  async getWeather(campus = 'south') {
    const coord = this.campusCoords[campus] || this.campusCoords.south;
    try {
      // Using Open-Meteo (free, no API key)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Shanghai&forecast_days=7`;
      const data = await this._fetch(url);

      const current = data.current;
      const daily = data.daily;

      return {
        campus: coord.name,
        current: {
          temp: current.temperature_2m,
          feelsLike: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          code: current.weather_code,
          desc: this._weatherDesc(current.weather_code),
        },
        forecast: daily.time.map((date, i) => ({
          date,
          max: daily.temperature_2m_max[i],
          min: daily.temperature_2m_min[i],
          code: daily.weather_code[i],
          desc: this._weatherDesc(daily.weather_code[i]),
          rainChance: daily.precipitation_probability_max[i],
        })),
        advice: this._clothingAdvice(current.temperature_2m, current.weather_code),
      };
    } catch (e) {
      return { campus: coord.name, error: e.message, current: null, forecast: [] };
    }
  }

  _weatherDesc(code) {
    const map = {
      0: '晴', 1: '大部晴朗', 2: '局部多云', 3: '阴天',
      45: '雾', 48: '雾凇', 51: '小毛毛雨', 53: '中毛毛雨', 55: '大毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '大冻雨',
      71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
      80: '阵雨', 81: '中阵雨', 82: '大阵雨', 85: '小阵雪', 86: '大阵雪',
      95: '雷暴', 96: '雷暴+小冰雹', 99: '雷暴+大冰雹',
    };
    return map[code] || '未知';
  }

  _clothingAdvice(temp, code) {
    let advice = '';
    if (temp >= 30) advice = '🌡️ 高温天气，建议穿短袖短裤，注意防暑防晒';
    else if (temp >= 25) advice = '☀️ 温暖舒适，穿T恤/薄衬衫即可';
    else if (temp >= 20) advice = '🌤️ 微凉，建议穿长袖/薄外套';
    else if (temp >= 15) advice = '🍂 凉爽，穿夹克/卫衣';
    else if (temp >= 10) advice = '🧥 较冷，穿厚外套/风衣';
    else if (temp >= 0) advice = '❄️ 寒冷，穿羽绒服/棉服，注意保暖';
    else advice = '🥶 严寒，穿厚羽绒服+围巾手套，注意防冻';

    if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) advice += '\n🌧️ 有雨，记得带伞！';
    if ([71, 73, 75, 85, 86].includes(code)) advice += '\n🌨️ 有雪，注意路滑！';
    if ([45, 48].includes(code)) advice += '\n🌫️ 有雾，注意能见度！';

    return advice;
  }

}

module.exports = { WeatherClient };
