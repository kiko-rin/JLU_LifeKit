# 🎓 JLU LifeKit

**吉林大学校园生活工具箱** — 基于 Electron + Win11 Fluent Design 的桌面应用。

> ⚠️ **Beta 版本声明**
>
> 开发者尚未实际入学吉林大学，因此部分依赖真实校园网络环境的功能（如教务系统同步、校园网认证、OA 通知爬虫等）**未经真实环境测试**，可能存在接口兼容性问题。欢迎在校同学提交 Issue 或 PR 协助完善。

---

## 📦 功能总览

### 🌐 网络工具
| 模块 | 说明 |
|------|------|
| VPN 任意门 | 校外 URL 转 JLU Web VPN 地址，支持 302 跳转/系统代理/Host 映射三种模式 |
| DrCOM 认证 | 校园网 DrCOM 协议认证客户端，支持记住密码和自动重连 |

### 📚 学习服务
| 模块 | 说明 | 状态 |
|------|------|------|
| 课表管理 | 周次切换课表、导入/添加课程 | ⚠️ 教务接口待测试 |
| 学在吉大 | 视频课程浏览 | ⚠️ 需接入环境测试 |
| 选课助手 | 自动抢课 | ⚠️ 需配合选课时间测试 |
| 成绩 GPA | 教务成绩同步 + GPA 计算 | ⚠️ 教务接口待测试 |
| 考试安排 | 考试倒计时 | ⚠️ 教务接口待测试 |
| 学分追踪 | 培养方案对比可视化 | ⚠️ 需对接教务 |
| 空教室查询 | 按时间段教学楼筛选 | ⚠️ 数据源待确认 |
| 课程评价 | 搜索/查看/提交课程评价 | ✅ 本地存储可用 |

### 🏠 校园生活
| 模块 | 说明 | 状态 |
|------|------|------|
| 校园卡 | 余额 + 消费流水 | ⚠️ 接口待测试 |
| 食堂 | 菜单、实时拥挤度 | ✅ 静态数据演示可用 |
| 校车时刻表 | 多校区班车 + 倒计时 | ✅ 静态数据可用 |
| 快递查询 | 运单追踪 + 校内快递点 | ✅ 聚合物流接口 |
| 图书馆座位 | 座位查询/预约/自动预约 | ⚠️ 需接入环境测试 |
| 校园地图 | 按分类/关键词检索设施 | ✅ 本地数据可用 |
| 天气 | 精准天气 + 7 日预报 | ✅ Open-Meteo API |
| 通知中心 | OA 通知自动抓取推送 | ⚠️ 爬虫接口待测试 |

### ⚡ 效率工具
| 模块 | 说明 |
|------|------|
| 番茄钟 | 专注计时 + 待办事务 + 今日统计 |
| 日历导出 | 课表/考试 → .ics 文件 |
| PC 百宝箱 | 系统内存优化 (EmptyWorkingSet) |

---

## 🚀 快速开始

### Windows（推荐）

```powershell
# 方法一：双击 setup.bat 或右键 setup.ps1 → 使用 PowerShell 运行
# 方法二：手动执行
npm install --ignore-scripts --legacy-peer-deps
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
node node_modules/electron/install.js
npm start
```

> 国内用户：首次安装 Electron 二进制约 200MB，脚本默认使用 npmmirror 镜像加速。

### 前置要求

- **Node.js >= 18.x** — [下载地址](https://nodejs.org/)
- **Windows 10/11**（推荐，macOS/Linux 未测试）

---

## 🔧 构建安装包

```bash
npm run build:win
```

输出在 `dist/` 目录：

- `吉大生活+ Setup x.x.x.exe` — NSIS 安装版
- `吉大生活+ x.x.x.exe` — 便携版

---

## 📁 项目结构

```
JLU_LifeKit/
├── package.json
├── assets/               # 图标、背景图
├── src/
│   ├── main/
│   │   ├── main.js       # Electron 主进程 (IPC × 80+)
│   │   └── preload.js    # contextBridge 安全桥接
│   ├── modules/          # 20+ 后端功能模块
│   └── renderer/
│       ├── index.html    # 页面面板
│       ├── app.js        # 渲染进程交互
│       ├── icons.js      # IconPark SVG 图标集
│       └── styles/       # Win11 Fluent 样式
├── setup.bat / setup.ps1 # 一键配置脚本
```

---

## ⚙️ 开发者模式

设置 → 开发者模式开启后，可加载示例数据调试各功能模块。默认关闭。

---

## 📝 TODO

以下功能需要服务器/数据库或校园网环境支持，尚未实现：

- [ ] 失物招领
- [ ] 学费 & 缴费查询
- [ ] 热水/电费充值
- [ ] AI 课程助手
- [ ] 社区模块（二手交易/拼车）
- [ ] 多校区生活指南

---

## ⚠️ 已知问题

- `ELECTRON_RUN_AS_NODE` 环境变量会导致 Electron API 不可用
- 部分模块的教务系统接口因开发者未在校无法验证
- 若使用 302 代理模式，需要先配置系统代理或使用浏览器插件

---

## 🙏 致谢

本项目基于多个开源 JLU 项目构建：

| 项目 | 作者 | 用途 |
|------|------|------|
| [jlu-vpns-dokodemo-door](https://github.com/MerlynAllen/jlu-vpns-dokodemo-door) | MerlynAllen | VPN URL 转换 |
| [drcom-jlu-qt](https://github.com/code4lala/drcom-jlu-qt) | code4lala | DrCOM 认证协议 |
| [JLU_schedule](https://github.com/JFyuhong/JLU_schedule) | JFyuhong | 课表管理 |
| [StudyAtJLU_Desktop](https://github.com/RikaCelery/StudyAtJLU_Desktop) | RikaCelery | 学在吉大 |
| [JLUiCourse](https://github.com/wzyyyyyyy/JLUiCourse) | wzyyyyyyy | 自动抢课 |
| [JLU LibSeat PC Wide](https://github.com/flash122u/jlu-libseat-pc-wide) | flash122u | 图书馆座位 |
| [Reachee](https://github.com/TechCiel/Reachee) | TechCiel | OA 通知爬虫 |
| [IconPark](https://github.com/bytedance/IconPark) | ByteDance | SVG 图标库 |

---

## License

MIT
