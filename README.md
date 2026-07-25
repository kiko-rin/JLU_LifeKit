# 🎓 JLU LifeKit v2.0

吉林大学校园生活工具箱 — Electron + Win11 Fluent Design 桌面应用。

## 📦 功能模块 (18 个)

### 🌐 网络工具
| 模块 | 原项目 | 功能 |
|------|--------|------|
| VPN 任意门 | [jlu-vpns-dokodemo-door](https://github.com/MerlynAllen/jlu-vpns-dokodemo-door) | URL → VPN 地址 + 本地代理 |
| DrCOM 认证 | [drcom-jlu-qt](https://github.com/code4lala/drcom-jlu-qt) | 校园网登录认证 |

### 📚 学习服务
| 模块 | 原项目 | 功能 |
|------|--------|------|
| 课表管理 | [JLU_schedule](https://github.com/JFyuhong/JLU_schedule) | 周次切换、课程展示 |
| 学在吉大 | [StudyAtJlu_Desktop](https://github.com/RikaCelery/StudyAtJLU_Desktop) | 视频课程浏览下载 |
| 选课助手 | [JLUiCourse](https://github.com/wzyyyyyyy/JLUiCourse) | 自动抢课 |
| 成绩 GPA | — | 教务成绩 + GPA 计算器 |
| 考试安排 | — | 考试时间地点 + 倒计时 |
| 学分追踪 | — | 培养方案对比进度条 |
| 空教室 | — | 按时间段查询空闲教室 |
| 课程评价 | — | 课程/教师评价搜索 |

### 🏠 校园生活
| 模块 | 原项目 | 功能 |
|------|--------|------|
| 校园卡 | [JLUSmartCard](https://github.com/RigoLigoRLC/JLUSmartCard) | 余额查询、消费流水 |
| 食堂 | — | 菜单、拥挤度、推荐 |
| 校车时刻 | — | 多校区班车时刻 + 倒计时 |
| 快递查询 | — | 快递追踪 + 校内快递点 |
| 图书馆座位 | [JLU LibSeat PC Wide](https://github.com/flash122u/jlu-libseat-pc-wide) | 座位预约 + 自动预约 |
| 校园地图 | [JLUSchoolGIS](https://github.com/Baolvlv/JLUSchoolGIS) | 设施搜索 + 分类筛选 |
| 天气 | — | 精准天气 + 7日预报 + 穿衣建议 |
| 通知中心 | [Reachee](https://github.com/TechCiel/Reachee) | OA 通知爬虫 + Windows Toast |

### ⚡ 效率工具
| 模块 | 功能 |
|------|------|
| 番茄钟 | 专注计时 + 今日统计 |
| 日历导出 | 课表/考试 → .ics 文件 |

### ⚙️ 设置
| 功能 | 说明 |
|------|------|
| 开机自启动 | Windows 注册表 / macOS Login Items / Linux .desktop |
| 最小化启动 | 开机后静默后台运行 |

## 🚀 运行

### Windows 一键配置（推荐）

```powershell
# 方法 1: PowerShell（推荐）
右键 setup.ps1 → 使用 PowerShell 运行

# 方法 2: CMD
double-click setup.bat
```

脚本会自动：
1. 检查 Node.js 环境
2. 安装 npm 依赖
3. 从国内镜像下载 Electron（~200MB）
4. 启动应用

### 手动安装

```bash
# 前置要求: Node.js >= 18
# https://nodejs.org/

npm install --ignore-scripts --legacy-peer-deps
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
node node_modules/electron/install.js
npm start
```

### 打包安装程序

```bash
# 生成 Windows 安装包 (NSIS + Portable)
npm run build:win

# 输出在 dist/ 目录
# - 吉大生活+ Setup x.x.x.exe  (安装版)
# - 吉大生活+ x.x.x.exe        (便携版)
```

## 📁 项目结构

```
JLU_LifeKit/
├── package.json
├── README.md
├── assets/icon.svg
├── src/
│   ├── main/
│   │   ├── main.js           # Electron 主进程 (IPC × 60+)
│   │   └── preload.js        # contextBridge 安全桥接
│   ├── modules/              # 14 个后端模块
│   │   ├── vpn-door.js       # VPN URL 转换 + 代理
│   │   ├── drcom.js          # DrCOM UDP 认证
│   │   ├── schedule.js       # 课表持久化
│   │   ├── study-at-jlu.js   # 学在吉大 API
│   │   ├── course-grab.js    # 自动抢课引擎
│   │   ├── libseat.js        # 图书馆座位 API
│   │   ├── notification.js   # OA 通知爬虫 (Reachee)
│   │   ├── autostart.js      # 开机自启动管理
│   │   ├── campus-card.js    # 校园卡查询
│   │   ├── cafeteria.js      # 食堂菜单/拥挤度
│   │   ├── shuttle-bus.js    # 校车时刻表
│   │   ├── grade.js          # 成绩/GPA 计算
│   │   ├── exam.js           # 考试安排
│   │   ├── graduation.js     # 学分追踪
│   │   ├── campus-map.js     # 校园地图
│   │   ├── empty-classroom.js # 空教室查询
│   │   ├── delivery.js       # 快递查询
│   │   ├── course-review.js  # 课程评价
│   │   ├── weather.js        # 天气 (Open-Meteo)
│   │   ├── pomodoro.js       # 番茄钟
│   │   ├── schedule-share.js # 课表分享
│   │   └── calendar-sync.js  # 日历导出 (.ics)
│   └── renderer/             # Win11 Fluent UI
│       ├── index.html        # 18 个页面面板
│       ├── app.js            # 渲染进程交互
│       └── styles/ (4 files)
```

## 📊 统计

- **文件数**：25 个
- **代码行数**：~5600 行
- **模块数**：22 个
- **IPC 通道**：60+
- **页面数**：18 个

## 📝 TODO

以下功能因需要服务器/数据库支持，暂未实现：

- [ ] 失物招领 — 需要后端存储 + 图片上传
- [ ] 学费 & 缴费查询 — 需对接财务系统
- [ ] 热水/电费充值 — 需对接后勤系统
- [ ] AI 课程助手 — 需 LLM API + RAG 后端
- [ ] 社区模块 — 二手交易/拼车/组队，需数据库
- [ ] 多校区生活指南 — 需持续维护数据

## 免责声明

仅供学习与个人效率提升，请遵守学校相关规范。未经吉林大学官方授权。

## License

MIT
