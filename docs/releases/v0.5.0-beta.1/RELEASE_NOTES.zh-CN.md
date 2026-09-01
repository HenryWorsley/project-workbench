# Project Workbench v0.5.0-beta.1

这是项目工作台的第一个公开测试版。它把长期项目的计划、执行、更新记录和复盘放进同一套本地工作空间，发布内容只包含虚构项目、虚构人员和模拟业务数据。

## 这个版本值得体验的功能

### 可直接调整排期的甘特图

在首页查看选定项目的完整甘特图。任务条支持整体拖动，也可以拖动左右端修改开始和结束日期；日、周、月尺度、固定时间轴和周一浅色列让长期排期更容易阅读。

![甘特图总览](https://raw.githubusercontent.com/HenryWorsley/project-workbench/main/docs/images/gantt-overview.png)

### 按紧迫性组织的任务动力场

越紧迫的任务越大并靠近中心，完成度由方块中的动态水位表达。光标接近方块时，碰撞会像水波一样向周围衰减传递。

![任务动力场](https://raw.githubusercontent.com/HenryWorsley/project-workbench/main/docs/images/task-dynamics.png)

### 今日、本周、本月与里程碑

日程页把同一份任务数据按时间重新组织，可以快速查看今天覆盖哪些工作，以及每项工作的负责人、截止时间和完成度。

![今日工作](https://raw.githubusercontent.com/HenryWorsley/project-workbench/main/docs/images/today-schedule.png)

## 主要功能

- 项目改名、修改描述和建立子项目
- 任务与子任务、负责人、优先级、起止日期、延期和完成度
- 任务进展、问题、优化与决策记录
- 五套全局主题与一致的甘特图状态色系
- CSV 任务报表和 JSON 完整备份
- 默认不要求账号、不上传业务数据

## 下载与安装

| 平台或场景 | 文件 | 安装方法 |
| --- | --- | --- |
| Windows 联网安装 | `windows-x64-setup.exe` | 双击运行；缺少 WebView2 时会联网获取 |
| Windows 完全离线 | `windows-x64-offline-setup.exe` | 双击运行；已包含 WebView2 安装环境 |
| Windows 便携使用 | `windows-x64-portable.exe` | 下载后直接运行，无需安装 |
| Apple Silicon Mac | `macos-aarch64.dmg` | 打开 DMG，将应用拖入“应用程序” |
| Intel Mac | `macos-x64.dmg` | 打开 DMG，将应用拖入“应用程序” |
| Debian / Ubuntu | `linux-amd64.deb` | `sudo apt install ./文件名.deb` |
| 其他 x64 Linux | `linux-x64.AppImage` | 添加执行权限后直接运行 |
| Web 静态服务器 | `web-static.zip` | 解压到静态服务器根目录 |

完整步骤见 [各平台安装指南](../../INSTALL.zh-CN.md)。

## 数据提醒

- 当前数据保存在浏览器或桌面 WebView 的本地空间。
- 安装版、便携版和不同浏览器的数据空间可能不同。
- 切换版本前，请先在“系统设置”中导出 JSON 完整备份。
- 不要把唯一一份重要业务数据只保存在测试版中。

## 已知限制

- Windows 安装包尚未进行商业代码签名，系统可能显示“未知发布者”。
- macOS 包尚未签名和公证，只建议开发测试。
- Linux 包尚未完成多发行版和桌面环境实机验收。
- 尚未实现多用户、账号、权限、云同步与自动更新。
- 暂不提供企业 MSI、Windows ARM64 和手机原生版本。

运行任何下载文件前，建议核对 Release 中的 `SHA256SUMS.txt`。
