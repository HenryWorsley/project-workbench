# 项目工作台 · Project Workbench

一款本地优先、可以持续扩展的项目计划与执行工具。它把项目、任务、甘特图、日程、工作记录与报表放在同一个工作空间中，既能安排未来，也能保留实际发生过的工作过程。

[![Release](https://img.shields.io/github/v/release/HenryWorsley/project-workbench?include_prereleases&label=release)](https://github.com/HenryWorsley/project-workbench/releases/tag/v0.5.0-beta.1)
[![CI](https://github.com/HenryWorsley/project-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/HenryWorsley/project-workbench/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-2f6f62)](LICENSE)

**当前版本：`v0.5.0-beta.1`** · [前往下载](https://github.com/HenryWorsley/project-workbench/releases/tag/v0.5.0-beta.1)

> 这是公开测试版。仓库和截图只使用虚构项目、虚构人员与模拟业务数据，不包含真实企业、客户或生产资料。

![项目工作台甘特图总览](docs/images/gantt-overview.png)

## 它适合解决什么问题

很多项目管理工具擅长“登记任务”，却很难同时回答这些管理问题：项目整体走到哪里、哪些工作马上到期、计划为什么发生变化、今天真正应该盯什么，以及一个任务经历过哪些优化与决策。

项目工作台把这些信息组织为同一份本地数据：

- 用项目和子项目拆解长期工作；
- 用可操作甘特图安排开始时间、结束时间与整体排期；
- 用完成度、临期和逾期状态表达执行风险；
- 用任务动力场突出最紧迫的工作；
- 用今日、本周、本月日程重新组织同一批任务；
- 用更新记录保留进展、问题、优化与决策；
- 用 CSV 报表和 JSON 备份把数据带走。

## 三个特色界面

### 可直接拖动的甘特图

任务条不是静态展示。按住主体可以整体平移排期，拖动左右两端可以调整开始或结束日期；日、周、月三种时间尺度适合不同规划周期。周一整列使用浅色背景，时间轴滚动时保持在顶部。

完成任务使用低饱和度颜色，进行中任务把已完成与未完成部分直接画在同一条任务条里；逾期和即将到期任务会得到更醒目的视觉提示。五套全局主题会同步改变配色、任务条高度和动态节奏。

### 任务动力场

任务不再只是从上到下排列的表格。越紧迫的任务越大、越靠近中心；方块中的液态水位代表完成度。光标接近时，方块会放大并把碰撞逐层传向周围，形成自然衰减的空间反馈。

![任务动力场与动态任务方块](docs/images/task-dynamics.png)

### 今日工作与周期日程

日程页可以在今日、本周、本月和里程碑之间切换。同一份任务数据会按时间重新组织，今天要做什么、由谁负责、何时截止和当前完成度可以在一屏内看清。

![今日工作日程](docs/images/today-schedule.png)

## 功能一览

| 模块 | 能力 |
| --- | --- |
| 项目 | 新建、改名、修改描述、建立子项目、按项目筛选 |
| 任务 | 子任务、负责人、优先级、开始与结束日期、延期、完成度 |
| 甘特图 | 日/周/月尺度、整体拖动、两端缩放、固定时间轴、周一提示 |
| 工作记录 | 追加进展、问题、优化和决策，不覆盖原有过程 |
| 动态任务 | 按紧迫性决定位置和大小，按完成度显示动态水位 |
| 日程 | 今日、本周、本月和关键里程碑 |
| 主题 | 松墨、潮汐、日晷、鸢尾、信号五套全局风格 |
| 数据 | CSV 任务报表、JSON 完整备份、本机保存 |

## 选择下载版本

所有安装文件都在 [v0.5.0-beta.1 Release](https://github.com/HenryWorsley/project-workbench/releases/tag/v0.5.0-beta.1)。

| 使用场景 | 推荐文件 |
| --- | --- |
| 普通 Windows 电脑 | `ProjectWorkbench_0.5.0-beta.1_windows-x64-setup.exe` |
| Windows 电脑没有网络 | `ProjectWorkbench_0.5.0-beta.1_windows-x64-offline-setup.exe` |
| Windows 不想安装 | `ProjectWorkbench_0.5.0-beta.1_windows-x64-portable.exe` |
| Apple Silicon Mac | `ProjectWorkbench_0.5.0-beta.1_macos-aarch64.dmg` |
| Intel Mac | `ProjectWorkbench_0.5.0-beta.1_macos-x64.dmg` |
| Debian / Ubuntu | `ProjectWorkbench_0.5.0-beta.1_linux-amd64.deb` |
| 其他 x64 Linux | `ProjectWorkbench_0.5.0-beta.1_linux-x64.AppImage` |
| 放到静态服务器运行 | `ProjectWorkbench_0.5.0-beta.1_web-static.zip` |

### Windows 安装

1. 优先下载小体积的联网安装版并双击运行；如果电脑缺少 WebView2，安装程序会联网获取。
2. 无网络环境使用离线安装版，它已经包含 WebView2 安装环境，因此文件明显更大。
3. 不需要安装时，直接运行便携版 `.exe`；也可以下载包含许可证文件的便携压缩包。

当前 Windows 包尚未进行商业代码签名，系统可能显示“未知发布者”。请从本仓库 Release 下载，并在运行前核对 `SHA256SUMS.txt`。

### macOS、Linux 与 Web

macOS、Linux 和 Web 的具体安装步骤、命令与已知限制见 [各平台安装指南](docs/INSTALL.zh-CN.md)。macOS 包尚未签名和公证，Linux 包尚未完成多发行版实机验收，当前都只建议用于测试。

暂不提供企业 MSI、Windows ARM64 和手机原生安装包。

## 从源码运行

环境要求：Node.js `22.13` 或更高版本、npm `10` 或更高版本。

```powershell
npm ci
npm run dev
```

默认访问 `http://localhost:3000`。Windows 用户也可以双击 `启动项目工作台.bat`，脚本默认使用 `http://localhost:3001`。

提交代码前运行：

```powershell
npm run typecheck
npm run build
```

桌面构建环境和命令见 [各平台安装指南](docs/INSTALL.zh-CN.md#从源码构建桌面版)。

## 数据与隐私

当前测试版将工作区数据保存在浏览器或桌面 WebView 的本地空间，不会自动上传业务服务器，也没有账号、遥测和多用户同步。

- 录入重要内容后，请在“系统设置”中下载 JSON 完整备份。
- 清理浏览器网站数据、重装浏览器或更换运行形态可能导致本地数据无法直接读取。
- 安装版、便携版和不同浏览器的数据空间可能不同，切换前应先导出备份。
- 不要把唯一一份关键业务数据只保存在当前测试版中。

## 项目状态与路线

`v0.5.0-beta.1` 已提供 Windows、macOS、Linux 和 Web 测试包。下一阶段重点不是增加更多平台外壳，而是完善 SQLite 本地数据、自动备份、恢复验证、数据迁移、应用签名和自动更新。

详细安排见 [发行与平台路线图](docs/DISTRIBUTION_PLAN.zh-CN.md)，发布前检查项见 [GitHub 发布检查清单](docs/RELEASE_CHECKLIST.zh-CN.md)。

## 参与项目

提交问题或代码前，请阅读 [参与贡献](CONTRIBUTING.md)。界面变化需要附真实截图，动态交互需要附真实录屏。安全问题请按照 [安全策略](SECURITY.md) 使用私密漏洞报告，不要在公开 Issue 中披露漏洞细节或真实数据。

## 许可证

本项目采用 [Apache License 2.0](LICENSE)。可以使用、修改和分发代码，但必须遵守许可证中的版权、许可证文本和 NOTICE 要求。项目名称与视觉标识不因代码许可证自动获得商标授权。
