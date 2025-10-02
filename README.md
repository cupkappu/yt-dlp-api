# yt-dlp MCP Server

A Model Context Protocol (MCP) server that provides tools for video downloading and information extraction using yt-dlp. Supports automatic upload to WebDAV and S3-compatible storage services configured via environment variable  ]
}
```

## 🏗️ Development & Testing

### Local Development
## 🚀 Quick Start

### Using Pre-built Docker Image

The easiest way to use this MCP server is with the pre-built Docker image from GitHub Container Registry:

```bash
docker pull ghcr.io/cupkappu/yt-dlp-mcp:latest
```

### Basic Usage

```bash
# Run without upload (local downloads only)
docker run --rm -i ghcr.io/cupkappu/yt-dlp-mcp:latest

# Run with S3 upload
docker run --rm -i \
  -e UPLOAD_TYPE=s3 \
  -e S3_REGION=us-east-1 \
  -e S3_BUCKET=my-bucket \
  -e S3_ACCESS_KEY_ID=your-key \
  -e S3_SECRET_ACCESS_KEY=your-secret \
  ghcr.io/cupkappu/yt-dlp-mcp:latest

# Run with WebDAV upload
docker run --rm -i \
  -e UPLOAD_TYPE=webdav \
  -e WEBDAV_URL=https://webdav.example.com \
  -e WEBDAV_USERNAME=username \
  -e WEBDAV_PASSWORD=password \
  ghcr.io/cupkappu/yt-dlp-mcp:latest
```

## Features

- **extract_info**: Extract video information without downloading
- **list_formats**: List available video formats and qualities
- **download_video**: Download videos with customizable options and automatic upload to WebDAV or S3

## 🤖 Using with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yt-dlp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "UPLOAD_TYPE=s3",
        "-e", "S3_REGION=us-east-1",
        "-e", "S3_BUCKET=your-bucket", 
        "-e", "S3_ACCESS_KEY_ID=your-key",
        "-e", "S3_SECRET_ACCESS_KEY=your-secret",
        "ghcr.io/cupkappu/yt-dlp-mcp:latest"
      ]
    }
  }
}
```

### Other MCP Clients

The server communicates via stdio using the standard MCP protocol. You can integrate it with any MCP-compatible client.

## Docker Usage (Alternative)

### Build from Source (Optional)

If you prefer to build the Docker image yourself:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cupkappu/yt-dlp-mcp.git
   cd yt-dlp-mcp
   ```

2. **Build the Docker image:**
   ```bash
   docker build -t yt-dlp-mcp-server:latest .
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

## 📊 MCP Tools Reference

### extract_info
Extract detailed video information without downloading.

**Parameters:**
- `url` (string, required): Video URL to extract information from
- `include_formats` (boolean, optional): Whether to include format information (default: true)

**Example Request:**
```json
{
  "name": "extract_info",
  "arguments": {
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
  }
}
```

### list_formats
List all available video formats and qualities for a given URL.

**Parameters:**
- `url` (string, required): Video URL to list formats for

**Example Request:**
### download
Download video(s) with configurable quality, format, and optional upload to cloud storage.

**Parameters:**
- `url` (string, required): Video URL to download
- `quality` (string, optional): Video quality preference (default: "best")
  - Values: "best", "worst", "bestvideo", "bestaudio", or specific height like "720p", "1080p"
- `format` (string, optional): Specific format selector for advanced users
- `output_path` (string, optional): Custom output file path template
- `extract_audio` (boolean, optional): Extract audio only (default: false)
- `audio_format` (string, optional): Audio format when extracting audio ("mp3", "wav", "aac", "flac", "ogg", "m4a")

**Example Requests:**
```json
{
  "name": "download",
  "arguments": {
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "quality": "720p"
  }
}
```

```json
{
  "name": "download",
  "arguments": {
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "extract_audio": true,
    "audio_format": "mp3"
  }
}
```

**Auto-Upload Feature:**
When environment variables are configured, downloaded files are automatically uploaded to the configured storage service (WebDAV or S3/MinIO) and the local file is cleaned up.

## 🔧 Environment Variables Configuration

The server supports automatic upload to cloud storage services via environment variables:

### WebDAV Configuration
```bash
UPLOAD_TYPE=webdav
WEBDAV_URL=https://your-webdav-server.com/dav
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password
```

### S3/MinIO Configuration
```bash
UPLOAD_TYPE=s3
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_ENDPOINT=your-s3-endpoint  # Optional, for MinIO or other S3-compatible services
S3_REGION=us-east-1           # Optional, defaults to us-east-1
```

## 💻 Usage Examples

### Claude Desktop Configuration

Add this to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "yt-dlp-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "UPLOAD_TYPE=webdav",
        "-e", "WEBDAV_URL=https://your-webdav-server.com/dav",
        "-e", "WEBDAV_USERNAME=your-username", 
        "-e", "WEBDAV_PASSWORD=your-password",
        "ghcr.io/cupkappu/yt-dlp-mcp:latest"
      ]
    }
  }
}
```

### Direct Docker Usage

```bash
# Without upload (files saved locally)
docker run --rm -i ghcr.io/cupkappu/yt-dlp-mcp:latest

# With WebDAV upload
docker run --rm -i \
  -e UPLOAD_TYPE=webdav \
  -e WEBDAV_URL=https://your-webdav-server.com/dav \
  -e WEBDAV_USERNAME=your-username \
  -e WEBDAV_PASSWORD=your-password \
  ghcr.io/cupkappu/yt-dlp-mcp:latest

# With S3/MinIO upload
docker run --rm -i \
  -e UPLOAD_TYPE=s3 \
  -e S3_BUCKET=your-bucket \
  -e S3_ACCESS_KEY=your-access-key \
  -e S3_SECRET_KEY=your-secret-key \
  -e S3_ENDPOINT=http://your-minio-server:9000 \
  ghcr.io/cupkappu/yt-dlp-mcp:latest
```

### Continue.dev Integration

Add to your `continue.json` config:

```json
{
  "mcpServers": [
    {
      "name": "yt-dlp-mcp", 
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "UPLOAD_TYPE=s3",
        "-e", "S3_BUCKET=my-videos",
        "-e", "S3_ACCESS_KEY=your-key",
        "-e", "S3_SECRET_KEY=your-secret",
        "ghcr.io/cupkappu/yt-dlp-mcp:latest"
      ]
    }
  ]
}
```

## Local Development

### Prerequisites

- Node.js 18+
- yt-dlp installed

### Installation

1. Install yt-dlp:
   ```bash
   brew install yt-dlp
   # or
   pip install yt-dlp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Usage

Start the MCP server:
```bash
node dist/index.js
```

The server communicates via stdio using the MCP protocol.

### Testing Environment

Set up a local testing environment with WebDAV and MinIO:

```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Test WebDAV upload
docker-compose -f docker-compose.test.yml exec yt-dlp-mcp sh
export UPLOAD_TYPE=webdav
export WEBDAV_URL=http://webdav:80/webdav
export WEBDAV_USERNAME=test
export WEBDAV_PASSWORD=test
node dist/index.js

# Test S3/MinIO upload  
docker-compose -f docker-compose.test.yml exec yt-dlp-mcp sh
export UPLOAD_TYPE=s3
export S3_BUCKET=testbucket
export S3_ACCESS_KEY=minioadmin
export S3_SECRET_KEY=minioadmin
export S3_ENDPOINT=http://minio:9000
node dist/index.js

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

**Access Test Services:**
- **WebDAV**: http://localhost:8080/webdav (test/test)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **MinIO API**: http://localhost:9000

## 🐳 Docker Information

Pre-built Docker images are automatically built and published via GitHub Actions:

- **Registry**: `ghcr.io/cupkappu/yt-dlp-mcp:latest`
- **Architectures**: linux/amd64, linux/arm64
- **Auto-build**: On every push to main branch

### Build Locally

```bash
# Build the image
docker build -t yt-dlp-mcp .

# Run with environment variables
docker run --rm -i \
  -e UPLOAD_TYPE=webdav \
  -e WEBDAV_URL=https://your-server.com/dav \
  -e WEBDAV_USERNAME=user \
  -e WEBDAV_PASSWORD=pass \
  yt-dlp-mcp
```

## 📋 Requirements
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

## Docker Compose Configuration

The `docker-compose.yml` file provides a complete setup with:

- Automatic container restart
- Health checks
- Proper labeling for container management
- Volume mounts (commented out by default)

## Dependencies

The Docker container includes:

- **ffmpeg**: For audio/video processing
- **yt-dlp**: Latest version for video downloading
- **Node.js 18**: Runtime for the MCP server
- **Python 3**: Required by yt-dlp

## 🔍 Troubleshooting

### Common Issues

1. **Permission denied**: Ensure the container has proper permissions for file operations
2. **Network issues**: Some sites may block requests; try with different user agents
3. **Format not available**: Check available formats first with `list_formats`

### Logs

View container logs:
```bash
docker-compose logs yt-dlp-mcp
# or for standalone container
docker logs <container-id>
```

## 📚 Additional Documentation

- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - Detailed environment variable configuration
- [UPLOAD_EXAMPLES.md](UPLOAD_EXAMPLES.md) - WebDAV and S3 upload examples
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Technical implementation details
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview

## 🤝 Contributing

This MCP server has been tested with YouTube videos and supports WebDAV and S3-compatible storage services for automatic file uploads.
