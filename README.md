# yt-dlp MCP Server

A Model Context Protocol (MCP) server that provides tools for video downloading and information extraction using yt-dlp.

## Features

- **extract_info**: Extract video information without downloading
- **list_formats**: List available video formats and qualities
- **download_video**: Download videos with customizable options

## Docker Usage (Recommended)

### Prerequisites

- Docker installed on your system

### Quick Start

1. **Build the Docker image:**
   ```bash
   docker build -t yt-dlp-mcp-server:latest .
   ```

2. **Run with Docker Compose (recommended):**
   ```bash
   docker-compose up -d
   ```

3. **Run directly with Docker:**
   ```bash
   docker run -d --name yt-dlp-mcp yt-dlp-mcp-server:latest
   ```

### Using with MCP Clients

The MCP server communicates over stdio. To use it with an MCP client:

```bash
# Interactive mode
docker run --rm -i yt-dlp-mcp-server:latest

# With docker-compose
docker-compose exec yt-dlp-mcp-server sh
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

## Tools

### extract_info
Extract video information without downloading.

**Parameters:**
- `url` (string, required): Video URL to extract information from
- `include_formats` (boolean, optional): Whether to include format information (default: true)

### list_formats
List available video formats for a given URL.

**Parameters:**
- `url` (string, required): Video URL to list formats for

### download_video
Download a video with specified options.

**Parameters:**
- `url` (string, required): Video URL to download
- `format` (string, optional): Format selector (e.g., 'best', 'worst', '22') (default: 'best')
- `output_path` (string, optional): Output file path (uses yt-dlp default if not specified)
- `extract_audio` (boolean, optional): Extract audio only (default: false)
- `audio_format` (string, optional): Audio format when extracting audio (mp3, m4a, etc.) (default: 'mp3')

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

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure the container has proper permissions for file operations
2. **Network issues**: Some sites may block requests; try with different user agents
3. **Format not available**: Check available formats first with `list_formats`

### Logs

View container logs:
```bash
docker-compose logs yt-dlp-mcp-server
# or
docker logs yt-dlp-mcp
```

## Example

The server has been tested with YouTube videos and successfully extracts detailed video information including formats, metadata, and download URLs.
