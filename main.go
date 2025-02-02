package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os/exec"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	ollamaURL     string
	ollamaURLLock sync.RWMutex
)

var ollamaProxy *httputil.ReverseProxy

func main() {
	// 1. 确定可用端口
	port := findAvailablePort(11434)

	// 2. 初始化Gin引擎
	r := gin.Default()

	// 设置静态文件路由
	r.Static("/static", "./static")
	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// 3. 创建Ollama代理
	r.Any("/ollama/*path", ollamaProxyHandler)

	// 添加配置接口路由
	r.POST("/api/config/ollama", updateOllamaConfigHandler)
	r.GET("/api/config/ollama", getOllamaConfigHandler)

	// 启动服务器
	go func() {
		if err := r.Run(fmt.Sprintf(":%d", port)); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// 4. 自动打开浏览器
	openBrowser(fmt.Sprintf("http://localhost:%d", port))

	// 保持程序运行
	select {}
}

// 查找可用端口
func findAvailablePort(startPort int) int {
	for port := startPort; port < 65535; port++ {
		if isPortAvailable(port) {
			return port
		}
	}
	return 11434 // 默认回退
}

func isPortAvailable(port int) bool {
	timeout := time.Second
	conn, err := net.DialTimeout("tcp", net.JoinHostPort("localhost", fmt.Sprintf("%d", port)), timeout)
	if err != nil {
		return true
	}
	defer conn.Close()
	return false
}

// Ollama代理处理
func ollamaProxyHandler(c *gin.Context) {
	ollamaURLLock.RLock()
	target := ollamaURL
	ollamaURLLock.RUnlock()

	// 如果未配置则使用默认值
	if target == "" {
		target = "http://localhost:11434"
	}

	targetURL, err := url.Parse(target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid Ollama URL configuration"})
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	proxy.Director = func(req *http.Request) {
		req.Header = c.Request.Header
		req.Host = targetURL.Host
		req.URL.Scheme = targetURL.Scheme
		req.URL.Host = targetURL.Host
		req.URL.Path = c.Param("path")
	}
	proxy.ServeHTTP(c.Writer, c.Request)
}

// 自动打开浏览器
func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: // "linux", "freebsd", "openbsd", "netbsd"
		cmd = "xdg-open"
	}
	args = append(args, url)

	if err := exec.Command(cmd, args...).Start(); err != nil {
		log.Printf("Failed to open browser: %v", err)
	}
}

// 新增配置更新处理
func updateOllamaConfigHandler(c *gin.Context) {
	type configRequest struct {
		URL string `json:"url"`
	}

	var req configRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 验证URL格式
	if _, err := url.ParseRequestURI(req.URL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL format"})
		return
	}

	ollamaURLLock.Lock()
	ollamaURL = req.URL
	ollamaURLLock.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "Configuration updated"})
}

// 新增配置获取处理
func getOllamaConfigHandler(c *gin.Context) {
	ollamaURLLock.RLock()
	defer ollamaURLLock.RUnlock()
	c.JSON(http.StatusOK, gin.H{"url": ollamaURL})
}
