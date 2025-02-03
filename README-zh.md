# OllamaLens

[English](README.md) | [中文](README-zh.md)

![GitHub 最新版本](https://img.shields.io/github/v/release/jieliu2000/ollama-lens)
![许可证](https://img.shields.io/badge/License-MIT-blue.svg)

为 Ollama AI 模型打造的现代化交互界面。通过直观的图形界面简化 AI 模型管理和交互。

## 功能特性

- 🖥️ 跨平台支持（Windows/macOS/Linux）
- 🔍 便捷的模型浏览与选择
- ⚡ 可定制参数的快速推理
- 📦 开箱即用的独立执行文件

## 下载安装

从[GitHub Releases](https://github.com/jieliu2000/ollama-lens/releases/latest)获取最新版本：

### 预编译版本

- **Windows**: [ollama-lens-windows-amd64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollama-lens-windows-amd64.zip)
- **macOS (Intel 芯片)**: [ollama-lens-macos-amd64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollama-lens-macos-amd64.zip)
- **macOS (Apple 芯片)**: [ollama-lens-macos-arm64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollama-lens-macos-arm64.zip)
- **Linux**: [ollama-lens-linux-amd64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollama-lens-linux-amd64.zip)

## 运行要求

- 已安装并运行[Ollama](https://ollama.ai/)
- (Windows 系统) 需要[WebView2 Runtime](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/)

## 使用说明

1. **下载**对应操作系统的安装包
2. **解压**ZIP 文件
3. **运行**可执行文件：

   ```bash
   # Linux/macOS
   chmod +x ollama-lens-<平台>
   ./ollama-lens-<平台>

   # Windows
   ollama-lens-windows-amd64.exe
   ```

4. 网页界面将自动在默认浏览器中打开，访问地址：`http://localhost:6366`

## 从源码构建

1. 克隆仓库：

   ```bash
   git clone https://github.com/jieliu2000/ollama-lens.git
   cd ollama-lens
   ```

2. 编译应用：

   ```bash
   go build -o ollama-lens main.go
   ```

3. 运行程序：
   ```bash
   ./ollama-lens
   ```

## 许可证

本项目采用 MIT 许可证 - 详见[LICENSE](LICENSE)文件。
