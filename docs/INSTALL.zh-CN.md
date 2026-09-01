# 各平台安装指南

本指南对应 `v0.5.0-beta.1` 公开测试版。所有文件请从项目的 [GitHub Release 页面](https://github.com/HenryWorsley/project-workbench/releases/tag/v0.5.0-beta.1) 下载。

## 下载前先确认

1. 只从 `HenryWorsley/project-workbench` 的 Release 页面下载。
2. 下载 `SHA256SUMS.txt`，核对文件是否完整。
3. 当前桌面测试包尚未进行商业代码签名；Windows 可能显示“未知发布者”，macOS 可能阻止首次打开。
4. 首次录入重要内容后，立即从“系统设置”导出 JSON 完整备份。

Windows PowerShell 校验示例：

```powershell
Get-FileHash -Algorithm SHA256 .\ProjectWorkbench_0.5.0-beta.1_windows-x64-setup.exe
```

macOS 或 Linux 校验示例：

```bash
shasum -a 256 ProjectWorkbench_0.5.0-beta.1_macos-aarch64.dmg
sha256sum ProjectWorkbench_0.5.0-beta.1_linux-x64.AppImage
```

把输出与 `SHA256SUMS.txt` 中对应文件的值进行比较。

## Windows

### 联网安装版

适合绝大多数 Windows 10/11 x64 电脑：

```text
ProjectWorkbench_0.5.0-beta.1_windows-x64-setup.exe
```

双击文件并按安装向导完成安装。程序按当前用户安装，通常不需要企业部署环境。如果系统缺少 Microsoft Edge WebView2 Runtime，安装程序会联网获取。

### 完全离线安装版

适合现场无网络或网络不稳定的电脑：

```text
ProjectWorkbench_0.5.0-beta.1_windows-x64-offline-setup.exe
```

安装方法与联网版相同。它已经包含 WebView2 安装环境，所以文件约 253 MB。

### 便携版

无需安装，下载后直接运行：

```text
ProjectWorkbench_0.5.0-beta.1_windows-x64-portable.exe
```

也可以选择 `windows-x64-portable.zip`。压缩包同时包含 `LICENSE` 与 `NOTICE`。

安装版与便携版可能使用不同的本地数据空间。切换前请先导出 JSON 备份。

## macOS

按处理器选择文件：

- Apple Silicon（M1/M2/M3/M4 等）：`ProjectWorkbench_0.5.0-beta.1_macos-aarch64.dmg`
- Intel Mac：`ProjectWorkbench_0.5.0-beta.1_macos-x64.dmg`

打开 DMG，将“项目工作台”拖入“应用程序”目录。

当前 DMG 由 GitHub Actions 在对应 Mac 构建机生成，但尚未进行 Apple 开发者签名与公证。如果系统阻止打开，请先核对文件哈希并确认下载来源；当前版本只建议开发测试，不建议用于保存唯一一份重要业务数据。

## Linux

### Debian / Ubuntu

```bash
sudo apt install ./ProjectWorkbench_0.5.0-beta.1_linux-amd64.deb
```

### AppImage

```bash
chmod +x ProjectWorkbench_0.5.0-beta.1_linux-x64.AppImage
./ProjectWorkbench_0.5.0-beta.1_linux-x64.AppImage
```

Linux 包由 Ubuntu x64 构建机生成，尚未在不同发行版、桌面环境和 Wayland/X11 组合上完整验证。

## Web 静态版

解压：

```text
ProjectWorkbench_0.5.0-beta.1_web-static.zip
```

将解压后的文件放到静态 Web 服务器的网站根目录。不要直接双击 `index.html`，因为静态资源需要通过 HTTP 服务从站点根路径加载。

本地临时预览可以在解压目录运行：

```powershell
npx serve .
```

Web 版数据保存在当前浏览器针对该站点的本地空间。更换域名、端口或浏览器配置前，请先导出 JSON 备份。

## 从源码运行 Web 版

```powershell
git clone https://github.com/HenryWorsley/project-workbench.git
cd project-workbench
npm ci
npm run dev
```

默认访问 `http://localhost:3000`。

## 从源码构建桌面版

桌面版使用 Tauri 2。除 Node.js 外，还需要 Rust 与目标系统的 Tauri 构建依赖。

Windows NSIS 安装包：

```powershell
npm ci
npm run desktop:build
```

Windows 完全离线安装包：

```powershell
npm run desktop:build:offline
```

桌面前端单独验证：

```powershell
npm run desktop:frontend:build
```

GitHub 推送 `v*` 标签后，仓库的 `Desktop Release` 工作流会在 Windows、macOS 和 Linux 构建机生成对应测试包。

## 已知限制

- 没有企业 MSI、Windows ARM64 和手机原生安装包。
- Windows 与 macOS 文件尚未进行商业签名。
- macOS 尚未公证，Linux 尚未完成多发行版实机验收。
- 当前数据仍位于浏览器或 WebView 本地空间，没有账号、权限和云同步。
- 当前测试版不承诺跨运行形态自动共享数据。
