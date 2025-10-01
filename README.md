# yt-dlp MCP Server

A Model Context Protocol (MCP) server that provides tools for video downloading and information extraction using yt-dlp.

## Features

- **extract_info**: Extract video information without downloading
- **list_formats**: List available video formats and qualities
- **download_video**: Download videos with customizable options and optional Whisper transcription
- **transcribe_audio**: Transcribe audio files using OpenAI Whisper

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
- `transcribe` (boolean, optional): Automatically transcribe audio using Whisper after download (default: false)
- `whisper_model` (string, optional): Whisper model to use (tiny, base, small, medium, large) (default: 'base')
- `transcribe_language` (string, optional): Language for transcription (optional, auto-detect if not specified)

### transcribe_audio
Transcribe an audio file using OpenAI Whisper.

**Parameters:**
- `audio_path` (string, required): Path to the audio file to transcribe
- `model` (string, optional): Whisper model to use (tiny, base, small, medium, large) (default: 'base')
- `language` (string, optional): Language for transcription (optional, auto-detect if not specified)
- `output_format` (string, optional): Output format (txt, srt, vtt, json) (default: 'txt')
- `output_path` (string, optional): Output file path for transcription (optional)

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
- **OpenAI Whisper**: For audio transcription and speech recognition
- **Node.js 18**: Runtime for the MCP server
- **Python 3**: Required by yt-dlp and Whisper

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

### Audio Transcription Examples

**Download audio and transcribe automatically:**
```json
{
  "tool": "download_video",
  "arguments": {
    "url": "https://example.com/video",
    "extract_audio": true,
    "audio_format": "mp3",
    "transcribe": true,
    "whisper_model": "base",
    "transcribe_language": "en"
  }
}
```

**Transcribe an existing audio file:**
```json
{
  "tool": "transcribe_audio",
  "arguments": {
    "audio_path": "/path/to/audio.mp3",
    "model": "small",
    "language": "zh",
    "output_format": "srt"
  }
}
```

### Whisper Model Options

- **tiny**: Fastest, least accurate (~39 MB)
- **base**: Good balance of speed and accuracy (~74 MB)  
- **small**: Better accuracy (~244 MB)
- **medium**: High accuracy (~769 MB)
- **large**: Best accuracy (~1550 MB)

The model size affects both transcription quality and processing time. Choose based on your accuracy requirements and available resources.
