# 🎓 JLU LifeKit

**吉林大学校园生活工具箱** — 基于 Electron + Win11 Fluent Design 的桌面应用。

> ⚠️ **Beta 声明**
>
> 开发者尚未实际入学吉林大学，因此部分依赖校园网络环境的功能（教务同步、OA 爬虫等）**未经真实环境测试**。欢迎在校同学提交 Issue 或 PR。
>
> 本项目不含任何演示数据，所有页面均显示真实运行状态。

---

## 📦 功能总览

| 模块 | 说明 | 状态 |
|------|------|------|
| **VPN 任意门** | URL→VPN 转换，302/代理/Host 三模式 | ✅ 完整 |
| **DrCOM 认证** | 校园网认证，支持自动登录 | ✅ 完整 |
| **课表管理** | 周次课表、导入/添加课程 | ⚠️ 需测试 |
| **学在吉大** | 视频课程浏览 | ⚠️ 需测试 |
| **选课助手** | 自动抢课 | ⚠️ 需测试 |
| **成绩 GPA** | 教务成绩同步 + GPA 计算 | ⚠️ 需测试 |
| **考试安排** | 考试倒计时 | ❌ 待接入 |
| **学分追踪** | 培养方案对比 | ⚠️ 需测试 |
| **空教室查询** | 按时间段筛选 | ❌ 待接入 |
| **课程评价** | 评价搜索/提交（本地持久化） | ✅ 完整 |
| **校园卡** | 余额 + 消费流水 | ⚠️ 需测试 |
| **食堂** | 菜单、拥挤度（静态数据） | 📊 静态 |
| **校车时刻表** | 多校区班车（静态数据） | 📊 静态 |
| **快递查询** | 运单追踪 + 快递点 | 📊 静态 |
| **图书馆座位** | 座位查询/预约 | ⚠️ 需测试 |
| **校园地图** | 设施检索（静态数据） | 📊 静态 |
| **天气** | 7 日预报 + 穿衣建议（Open-Meteo） | ✅ 完整 |
| **通知中心** | OA 通知抓取 + Windows Toast | ⚠️ 需测试 |
| **番茄钟** | 专注计时 + 待办 + 统计 | ✅ 完整 |
| **日历导出** | 课表/考试 → .ics | ✅ 完整 |
| **PC 百宝箱** | 内存优化 (EmptyWorkingSet) | ✅ 完整 |

---

## 🚀 快速开始

### Windows（推荐）

```powershell
# 双击 setup.bat 或右键 setup.ps1 → 使用 PowerShell 运行
# 或手动执行：
npm install --ignore-scripts --legacy-peer-deps
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
node node_modules/electron/install.js
npm start
```

> 国内用户：首次安装约 200MB，脚本默认使用 npmmirror 镜像。

### 前置要求

- **Node.js >= 18.x** — [下载](https://nodejs.org/)
- **Windows 10/11**

---

## 🔧 构建

```bash
npm run build:win
```

输出在 `dist/`：
- `吉大生活+ Setup x.x.x.exe` — 安装版
- `吉大生活+ x.x.x.exe` — 便携版

---

## ⚙️ 开发者模式

设置 → 开发者模式 → 开启后显示：
- **API CLI** — 终端式 IPC 命令行，Ctrl+W 查看 API 参考
- **LOG** — 全量运行日志，分级过滤，可复制

---

## 📁 项目结构

```
JLU_LifeKit/
├── package.json
├── assets/               # 图标、背景图
├── src/
│   ├── main/
│   │   ├── main.js       # Electron 主进程 (IPC × 60+)
│   │   └── preload.js    # contextBridge 安全桥接
│   ├── modules/          # 20+ 后端模块
│   └── renderer/
│       ├── index.html    # 22 个页面面板
│       ├── app.js        # 渲染进程交互
│       ├── icons.js      # IconPark SVG 图标集
│       └── styles/       # Win11 Fluent 样式
├── setup.bat / setup.ps1
```

---

## ⚠️ 已知问题

- `ELECTRON_RUN_AS_NODE` 环境变量会导致 Electron API 不可用
- 部分教务接口因开发者未在校无法验证
- 食堂、校车、快递、地图数据为静态，有待对接真实数据源

---

## 🙏 致谢

| 项目 | 作者 | 用途 |
|------|------|------|
| [jlu-vpns-dokodemo-door](https://github.com/MerlynAllen/jlu-vpns-dokodemo-door) | MerlynAllen | VPN 转换 |
| [drcom-jlu-qt](https://github.com/code4lala/drcom-jlu-qt) | code4lala | DrCOM 协议 |
| [JLU_schedule](https://github.com/JFyuhong/JLU_schedule) | JFyuhong | 课表管理 |
| [StudyAtJLU_Desktop](https://github.com/RikaCelery/StudyAtJLU_Desktop) | RikaCelery | 学在吉大 |
| [JLUiCourse](https://github.com/wzyyyyyyy/JLUiCourse) | wzyyyyyyy | 抢课 |
| [JLU LibSeat PC Wide](https://github.com/flash122u/jlu-libseat-pc-wide) | flash122u | 图书馆座位 |
| [Reachee](https://github.com/TechCiel/Reachee) | TechCiel | OA 爬虫 |
| [IconPark](https://github.com/bytedance/IconPark) | ByteDance | SVG 图标 |

---

## License

Apache License 2.0
