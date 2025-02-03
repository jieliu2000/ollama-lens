package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

var (
	ollamaURL     string
	ollamaURLLock sync.RWMutex
	fileCache     = make(map[string][]byte)
	fileCacheLock sync.RWMutex
	serverConfig  struct {
		host string
		port int
	}
)

// 初始化配置
func initConfig() {
	viper.SetConfigName("ollama_lens")
	viper.SetConfigType("yml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("$HOME/.config/ollama_lens")

	setDefaultConfig()
	loadConfig()
}

func setDefaultConfig() {
	viper.SetDefault("server.port", 6366)
	viper.SetDefault("server.host", "localhost")
	viper.SetDefault("ollama.default_url", "http://localhost:11434")
}

func loadConfig() {
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			if err := viper.SafeWriteConfig(); err != nil {
				log.Printf("无法创建配置文件: %v", err)
			}
		} else {
			log.Printf("读取配置文件错误: %v", err)
		}
	}
}

// 处理静态文件
func handleStaticFile(c *gin.Context) {
	path := strings.TrimPrefix(c.Param("filepath"), "/")

	// 处理根路径请求，重定向到 index.html
	if path == "" {
		c.Redirect(http.StatusMovedPermanently, "/static/index.html")
		return
	}

	fullPath := filepath.Join("static", path)
	if !validateFile(c, fullPath) {
		return
	}

	content, err := os.ReadFile(fullPath)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	// 处理需要替换占位符的文件
	if shouldProcessFile(path) {
		content = processFileContent(content)
	}

	serveContent(c, path, content)
}

func validateFile(c *gin.Context, fullPath string) bool {
	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		c.Status(http.StatusNotFound)
		return false
	}

	// 如果是目录，检查是否存在 index.html
	if fileInfo.IsDir() {
		if _, err := os.Stat(filepath.Join(fullPath, "index.html")); err == nil {
			c.Redirect(http.StatusMovedPermanently, "/static/"+filepath.Join(strings.TrimPrefix(fullPath, "static"), "index.html"))
			return false
		}
		c.Status(http.StatusForbidden)
		return false
	}
	return true
}

func shouldProcessFile(path string) bool {
	return strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".html")
}

func processFileContent(content []byte) []byte {
	return []byte(strings.ReplaceAll(string(content), "__OLLAMA_PROXY__",
		fmt.Sprintf("http://%s:%d/ollama", serverConfig.host, serverConfig.port)))
}

func serveContent(c *gin.Context, path string, content []byte) {
	contentType := getContentType(path)
	c.Data(http.StatusOK, contentType, content)
}

func getContentType(path string) string {
	switch {
	case strings.HasSuffix(path, ".js"):
		return "application/javascript"
	case strings.HasSuffix(path, ".css"):
		return "text/css"
	case strings.HasSuffix(path, ".html"):
		return "text/html"
	case strings.HasSuffix(path, ".png"):
		return "image/png"
	case strings.HasSuffix(path, ".jpg"), strings.HasSuffix(path, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(path, ".gif"):
		return "image/gif"
	case strings.HasSuffix(path, ".svg"):
		return "image/svg+xml"
	default:
		return ""
	}
}

func main() {
	initConfig()
	serverConfig.host = viper.GetString("server.host")
	serverConfig.port = viper.GetInt("server.port")
	ollamaURL = viper.GetString("ollama.default_url")

	r := gin.Default()
	setupRoutes(r)
	startServer(r)
}

func setupRoutes(r *gin.Engine) {
	r.GET("/static/*filepath", handleStaticFile)
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/static/index.html")
	})
	r.Any("/ollama/*path", ollamaProxyHandler)
}

func startServer(r *gin.Engine) {
	addr := fmt.Sprintf("%s:%d", serverConfig.host, serverConfig.port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal(err)
	}

	openBrowser(fmt.Sprintf("http://%s:%d", serverConfig.host, serverConfig.port))

	go func() {
		if err := r.RunListener(listener); err != nil {
			log.Fatal(err)
		}
	}()

	select {}
}

// 获取并验证 Ollama URL
func getAndValidateOllamaURL(c *gin.Context) (string, error) {
	// 从请求头中获取 Ollama URL
	target := c.GetHeader("X-Ollama-URL")

	// 如果请求头中有指定 URL，则验证其有效性
	if target != "" {
		if _, err := url.Parse(target); err != nil {
			// 如果 URL 无效，则回退到使用配置的 ollamaURL
			target = ""
		} else {
			// 如果 URL 有效，则更新 ollamaURL
			ollamaURLLock.Lock()
			ollamaURL = target
			ollamaURLLock.Unlock()
		}
	}

	// 如果请求头中没有指定或指定了无效的 URL，则使用配置的 ollamaURL
	if target == "" {
		ollamaURLLock.RLock()
		target = ollamaURL
		ollamaURLLock.RUnlock()

		// 如果配置的 ollamaURL 也是空的，则使用默认值
		if target == "" {
			target = "http://localhost:11434"
		}
	}

	// 最终验证 URL
	if _, err := url.Parse(target); err != nil {
		return "", fmt.Errorf("invalid Ollama URL")
	}

	return target, nil
}

// Ollama代理处理
func ollamaProxyHandler(c *gin.Context) {
	// 获取并验证 Ollama URL
	target, err := getAndValidateOllamaURL(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 解析目标 URL
	targetURL, err := url.Parse(target)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Ollama URL"})
		return
	}

	// 创建反向代理
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	proxy.Director = func(req *http.Request) {
		req.Header = c.Request.Header
		req.Host = targetURL.Host
		req.URL.Scheme = targetURL.Scheme
		req.URL.Host = targetURL.Host
		req.URL.Path = c.Param("path")
	}

	// 处理代理请求
	proxy.ServeHTTP(c.Writer, c.Request)
}

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default:
		cmd = "xdg-open"
	}
	args = append(args, url)

	if err := exec.Command(cmd, args...).Start(); err != nil {
		log.Printf("Failed to open browser: %v", err)
	}
}
