# OllamaLens

[English](README.md) | [中文](README-zh.md)

![GitHub release (latest by date)](https://img.shields.io/github/v/release/jieliu2000/ollama-lens)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

A modern interface for interacting with Ollama AI models. Simplify your AI model management and interactions through an intuitive graphical interface.

## Features

- 🖥️ Cross-platform support (Windows/macOS/Linux)
- 🔍 Easy model browsing and selection
- ⚡ Quick inference with customizable parameters
- 📦 Self-contained executable packages

## Download

Get the latest release from [GitHub Releases](https://github.com/jieliu2000/ollama-lens/releases/latest):

### Pre-built Binaries

- **Windows**: [ollamalens-windows-amd64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollamalens-windows-amd64.zip)
- **macOS (Intel)**: [ollamalens-macos-amd64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollamalens-macos-amd64.zip)
- **macOS (Apple Silicon)**: [ollamalens-macos-arm64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollamalens-macos-arm64.zip)
- **Linux**: [ollamalens-linux-amd64.zip](https://github.com/jieliu2000/ollama-lens/releases/latest/download/ollamalens-linux-amd64.zip)

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running
- (Windows) [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Usage

1. **Download** the appropriate package for your OS
2. **Extract** the ZIP file
3. **Run** the executable:

   ```bash
   # Linux/macOS
   chmod +x ollamalens-<platform>
   ./ollamalens-<platform>

   # Windows
   ollamalens-windows-amd64.exe
   ```

4. The web interface will automatically open in your default browser at `http://localhost:6366`

## Building from Source

1. Clone the repository:

   ```bash
   git clone https://github.com/jieliu2000/ollama-lens.git
   cd ollama-lens
   ```

2. Build the application:

   ```bash
   go build -o ollamalens main.go
   ```

3. Run with static assets:
   ```bash
   ./ollamalens
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
