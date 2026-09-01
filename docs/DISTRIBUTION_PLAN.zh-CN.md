# 发行与平台路线图

## 结论

项目采用“Web 核心 + 多平台外壳”的路线，不为每个平台重复开发业务界面。

- 当前公开源码与 Windows 安装版：`v0.5.0-beta.1`
- 第一个稳定版本目标：`v1.0.0`
- Windows 桌面框架：Tauri 2
- Windows 安装格式：NSIS `.exe`
- Windows 便携格式：单文件 `.exe` 和 `.zip`
- 企业 MSI：按当前发布安排暂停
- 手机首发：PWA
- 鸿蒙原生版本：PWA 验证后再评估 ArkTS + WebView 外壳

## 为什么选择 Tauri 2

现有界面以 React 和 Web 技术构建，Tauri 可以复用大部分界面代码，并生成 Windows、macOS 和 Linux 桌面程序。相较于内置完整浏览器内核的方案，它更适合这个本地工具的体量。

需要注意：当前工程使用 Vinext 的开发与构建链路。进入桌面打包前，应先把纯前端界面整理为可静态输出的 Vite SPA，不能把 `npm run dev` 或本地 Node 服务作为正式安装版的运行条件。

## 版本阶段

### `v0.5.0-beta.1`：公开源码与 Windows 安装测试版

- 发布源码和运行说明
- 使用纯模拟数据
- 完成 GitHub 基础治理文件
- 保留浏览器本地存储
- 生成 Windows x64 NSIS 安装包与便携版
- 不把当前版本描述为稳定生产工具

### `v0.6.x`：Windows 数据与升级完善版

- 增加 Tauri 2 桌面外壳
- 继续使用免管理员安装的 NSIS `.exe`
- 使用系统应用数据目录
- 增加自动备份、恢复和数据结构迁移
- 完成覆盖安装、卸载保留数据和异常退出测试
- 提供 SHA-256 校验值

### `v0.7.x`：桌面完善版

- 增加应用签名与自动更新签名
- 增加 Windows ARM64 构建验证
- 建立崩溃恢复、日志导出和诊断包

### `v0.8.x`：多平台测试版

- macOS：Apple Silicon 与 Intel 构建、签名和公证
- Linux：`.AppImage` 与 `.deb`
- PWA：离线缓存、安装提示和触控布局

### `v1.0.0`：稳定版

只有在以下条件全部满足后才发布：

- 数据库迁移可回滚
- 自动备份和手动恢复经过真实验证
- 跨版本覆盖安装不丢数据
- Windows 安装包完成签名
- 核心功能具有自动化测试
- 隐私说明、许可证和安全响应流程完整

## Windows 安装包设计

### 首发文件

```text
ProjectWorkbench_0.5.0-beta.1_windows-x64-setup.exe
ProjectWorkbench_0.5.0-beta.1_windows-x64-offline-setup.exe
ProjectWorkbench_0.5.0-beta.1_windows-x64-portable.exe
ProjectWorkbench_0.5.0-beta.1_windows-x64-portable.zip
ProjectWorkbench_0.5.0-beta.1_web-static.zip
SHA256SUMS.txt
```

NSIS 安装包采用“仅当前用户”模式，减少管理员权限要求。当前不生成企业 MSI。

### 安装行为

- 程序文件与用户数据分开存放
- 卸载程序默认保留用户数据和备份
- 删除用户数据必须单独明确确认
- 覆盖安装前自动创建一次完整备份
- 首次启动展示数据位置和备份入口
- 不静默添加开机启动
- 不默认联网，不包含遥测

### 数据层

正式桌面版不继续把浏览器 `localStorage` 作为唯一存储。建议使用 SQLite：

```text
应用数据目录/
  workspace.db
  backups/
  logs/
  settings.json
```

每次数据库结构变更都必须包含：迁移版本、迁移前备份、失败回滚和旧版恢复验证。

## 多平台优先级

| 优先级 | 平台 | 交付物 | 原因 |
| --- | --- | --- | --- |
| P0 | Web | 源码运行版 | 开发和验证最快 |
| P1 | Windows x64 | NSIS `.exe` | 当前主要使用环境 |
| P1 | Windows x64 | 便携版 `.exe` | 无需安装的快速试用 |
| P2 | PWA | 可安装网页 | 最快覆盖鸿蒙与其他手机 |
| P2 | macOS | `.dmg` | 覆盖个人电脑用户 |
| P3 | Linux | `.AppImage`、`.deb` | 开发者与私有部署 |
| P3 | Windows ARM64 | 安装包 | 视设备需求推进 |
| P4 | 鸿蒙原生 | ArkTS 外壳 | 在移动需求稳定后开发 |

## GitHub 自动发布

建议建立两个工作流：

1. `ci.yml`：每次提交执行依赖安装、类型检查和 Web 构建。
2. `release-desktop.yml`：推送 `v*` 标签后，在 Windows、macOS、Linux 构建机生成安装包，并上传到 GitHub Release 草稿。

当前工作流已配置以下构建目标：

- Windows x64：NSIS `.exe`，不生成 MSI
- macOS Apple Silicon：`.dmg`
- macOS Intel：`.dmg`
- Linux x64：`.AppImage` 与 `.deb`

桌面发布工作流不应直接把未经人工验收的草稿改为正式 Release。签名私钥只能保存在 GitHub Secrets 或离线密钥设备中，不能进入仓库。

## 官方参考

- Tauri Windows Installer: https://v2.tauri.app/distribute/windows-installer/
- Tauri GitHub Pipeline: https://v2.tauri.app/distribute/pipelines/github/
- Tauri Updater: https://v2.tauri.app/plugin/updater/
- GitHub Actions Artifacts: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
