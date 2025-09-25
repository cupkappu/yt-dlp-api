# yt-dlp API Server

一个基于 FastAPI 的 RESTful API 服务器，为 yt-dlp 提供 HTTP 接口，支持流式传输下载。

## 功能特性

- 🚀 **完整的 yt-dlp 功能**: 支持所有 yt-dlp 的下载选项和格式
- ⚡ **流式传输**: 支持直接流式传输下载内容，无需在服务器存储文件
- 🔄 **异步下载**: 支持后台异步下载任务
- 📊 **进度跟踪**: 实时跟踪下载进度
- 📚 **自动文档**: FastAPI 自动生成的交互式 API 文档
- 🐳 **Docker 支持**: 完整的容器化部署方案
- 🔒 **无认证**: 简单的微服务设计，无需用户验证

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd yt-dlp-api

# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose logs -f
```

服务将在 http://localhost:8000 启动

### 手动安装

```bash
# 安装依赖
pip install -r requirements.txt

# 安装 yt-dlp
cd reference/yt-dlp
pip install .

# 返回项目根目录
cd ../..

# 启动服务
python main.py
```

## API 文档

启动服务后，访问以下地址查看完整的 API 文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API 端点

### 基本信息
- `GET /` - 根端点，显示 API 信息
- `GET /health` - 健康检查

### 视频信息查询
- `GET /info/{url}` - 获取视频信息
- `GET /formats/{url}` - 获取可用格式列表

### 下载功能
- `POST /download` - 启动异步下载任务
- `POST /stream` - 直接流式下载（同步）
- `GET /task/{task_id}` - 获取任务状态
- `GET /tasks` - 列出所有任务

## 使用示例

### 获取视频信息

```bash
curl "http://localhost:8000/info/https://www.youtube.com/watch?v=example"
```

### 启动异步下载

```bash
curl -X POST "http://localhost:8000/download" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=example",
    "format": "best",
    "options": {
      "write_subtitles": true,
      "write_thumbnail": true
    }
  }'
```

响应：
```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "started",
  "message": "Download task started successfully"
}
```

### 检查任务状态

```bash
curl "http://localhost:8000/task/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 直接流式下载

```bash
curl -X POST "http://localhost:8000/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=example",
    "format": "best"
  }' \
  --output video.mp4
```

### 使用 Python 客户端

```python
import requests
import json

# 获取视频信息
response = requests.get("http://localhost:8000/info/https://www.youtube.com/watch?v=example")
video_info = response.json()

# 启动下载
download_data = {
    "url": "https://www.youtube.com/watch?v=example",
    "format": "best[height<=720]"
}
response = requests.post("http://localhost:8000/download", json=download_data)
task_info = response.json()

# 检查进度
task_id = task_info["task_id"]
while True:
    response = requests.get(f"http://localhost:8000/task/{task_id}")
    status = response.json()
    
    if status["status"] == "completed":
        print("下载完成!")
        break
    elif status["status"] == "failed":
        print(f"下载失败: {status['error']}")
        break
    else:
        print(f"进度: {status['progress']}")
        time.sleep(5)
```

## 配置选项

通过环境变量配置服务器：

| 环境变量 | 默认值 | 描述 |
|---------|--------|------|
| `HOST` | `0.0.0.0` | 服务器监听地址 |
| `PORT` | `8000` | 服务器端口 |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | 最大并发下载数 |
| `TEMP_DIR` | `/tmp/ytdlp_api` | 临时文件目录 |
| `MAX_TASK_AGE_HOURS` | `1` | 任务最大保留时间（小时） |
| `CHUNK_SIZE` | `8192` | 流式传输分块大小 |
| `LOG_LEVEL` | `INFO` | 日志级别 |

## 请求/响应格式

### 下载请求
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "options": {
    "write_subtitles": true,
    "write_thumbnail": true,
    "subtitleslangs": ["en", "zh"]
  }
}
```

### 任务状态响应
```json
{
  "task_id": "uuid",
  "status": "downloading",
  "progress": "45.3%",
  "filename": "video_title.mp4",
  "created_at": "2023-01-01T12:00:00",
  "updated_at": "2023-01-01T12:01:30"
}
```

## 支持的 yt-dlp 选项

通过 `options` 字段可以传递任何 yt-dlp 支持的选项：

```json
{
  "url": "https://example.com/video",
  "format": "best[height<=1080]",
  "options": {
    "write_subtitles": true,
    "write_thumbnail": true,
    "subtitleslangs": ["en", "zh"],
    "writedescription": true,
    "writeinfojson": true,
    "ignoreerrors": true
  }
}
```

## 错误处理

服务器返回标准的 HTTP 状态码：

- `200` - 成功
- `400` - 请求参数错误
- `404` - 资源未找到
- `429` - 并发下载限制
- `500` - 服务器内部错误

## 开发

### 本地开发环境

```bash
# 安装开发依赖
pip install -r requirements.txt

# 安装 yt-dlp 开发版本
cd reference/yt-dlp
pip install -e .

# 启动开发服务器（自动重载）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 测试

```bash
# 运行健康检查
curl http://localhost:8000/health

# 测试视频信息获取
curl "http://localhost:8000/info/https://www.youtube.com/watch?v=example"
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t ytdlp-api .

# 运行容器
docker run -d -p 8000:8000 --name ytdlp-api ytdlp-api
```

### Kubernetes 部署

创建 deployment.yaml:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ytdlp-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ytdlp-api
  template:
    metadata:
      labels:
        app: ytdlp-api
    spec:
      containers:
      - name: ytdlp-api
        image: ytdlp-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: MAX_CONCURRENT_DOWNLOADS
          value: "5"
```

## 性能优化建议

1. **增加并发限制**: 根据服务器资源调整 `MAX_CONCURRENT_DOWNLOADS`
2. **使用 SSD 存储**: 临时目录使用 SSD 存储提高 IO 性能
3. **网络优化**: 确保服务器有良好的网络连接
4. **内存监控**: 监控内存使用，避免内存溢出

## 故障排除

### 常见问题

**Q: 下载速度慢**
A: 检查服务器网络连接，考虑使用代理或 CDN

**Q: 内存使用过高**
A: 降低并发下载数，增加内存限制

**Q: 磁盘空间不足**
A: 定期清理临时目录，或使用外部存储

**Q: 特定网站无法下载**
A: 检查 yt-dlp 是否支持该网站，或更新 yt-dlp 版本

### 日志查看

```bash
# Docker 日志
docker-compose logs ytdlp-api

# 详细日志
docker-compose logs -f ytdlp-api
```

## 许可证

本项目基于 MIT 许可证开源。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 免责声明

本项目仅用于学习和研究目的。请遵守相关网站的使用条款和法律法规。
