# Architecture Overview

## System Flow

```
┌─────────────┐
│ MCP Client  │
│ (e.g. Claude)│
└──────┬──────┘
       │ MCP Protocol
       │ (JSON-RPC over stdio)
       ▼
┌─────────────────────────────────────────────────────┐
│           yt-dlp MCP Server (Node.js)               │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │         YtDlpMcpServer Class                │  │
│  │                                              │  │
│  │  Tools:                                      │  │
│  │  • extract_info                              │  │
│  │  • list_formats                              │  │
│  │  • download_video (enhanced with upload)     │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
│                     ▼                               │
│  ┌─────────────────────────────────────────────┐  │
│  │       Download Handler (handleDownloadVideo)│  │
│  │  1. Validate input                           │  │
│  │  2. Run yt-dlp command                       │  │
│  │  3. Extract file path from output            │  │
│  │  4. Check for upload_config                  │  │
│  │  5. Upload if configured                     │  │
│  │  6. Return result with URL                   │  │
│  └──────────────────┬───────────────────────────┘  │
│                     │                               │
└─────────────────────┼───────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
┌──────────────┐          ┌──────────────────┐
│   yt-dlp     │          │ UploadService    │
│   (Python)   │          │  (TypeScript)    │
│              │          │                  │
│ • Downloads  │          │ Upload Logic:    │
│ • Converts   │          │ ┌──────────────┐ │
│ • Extracts   │          │ │   WebDAV?    │ │
│              │          │ └──────┬───────┘ │
└──────────────┘          │        │         │
                          │   ┌────▼────┐    │
                          │   │  Yes    │    │
                          │   └────┬────┘    │
                          │        │         │
                          │   ┌────▼──────────────┐
                          │   │ WebDAV Client     │
                          │   │ (webdav package)  │
                          │   └───────────────────┘
                          │        │         │
                          │   ┌────▼────┐    │
                          │   │   No    │    │
                          │   └────┬────┘    │
                          │        │         │
                          │   ┌────▼────┐    │
                          │   │   S3?   │    │
                          │   └────┬────┘    │
                          │        │         │
                          │   ┌────▼──────────────┐
                          │   │ S3 Client         │
                          │   │ (@aws-sdk)        │
                          │   └───────────────────┘
                          └──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
          ┌──────────────────┐        ┌────────────────────┐
          │ WebDAV Server    │        │ S3-Compatible      │
          │ • Nextcloud      │        │ • AWS S3           │
          │ • ownCloud       │        │ • MinIO            │
          │ • Box            │        │ • DigitalOcean     │
          └──────────────────┘        │ • Wasabi           │
                                      │ • Cloudflare R2     │
                                      └────────────────────┘
```

## Component Details

### 1. YtDlpMcpServer (src/index.ts)

**Responsibilities:**
- Implement MCP protocol server
- Handle tool registration and invocation
- Manage yt-dlp process execution
- Coordinate download and upload operations

**Key Methods:**
- `setupToolHandlers()` - Registers MCP tools
- `handleDownloadVideo()` - Main download logic with upload support
- `runYtDlpCommand()` - Executes yt-dlp subprocess

### 2. UploadService (src/upload-service.ts)

**Responsibilities:**
- Abstract upload logic for different storage backends
- Handle WebDAV and S3 uploads
- Generate public download URLs

**Key Methods:**
- `uploadFile(localPath)` - Main entry point for uploads
- `uploadToWebDAV(localPath)` - WebDAV-specific upload
- `uploadToS3(localPath)` - S3-specific upload

**Configuration:**
```typescript
interface UploadConfig {
  type: "webdav" | "s3";
  webdav?: {
    url: string;
    username: string;
    password: string;
    remotePath?: string;
  };
  s3?: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    prefix?: string;
    publicUrl?: string;
  };
}
```

## Data Flow: Download with Upload

```
1. Client Request
   ↓
   {
     "url": "https://youtube.com/...",
     "upload_config": { ... }
   }
   
2. yt-dlp Execution
   ↓
   yt-dlp --print after_move:filepath ...
   
3. File Path Extraction
   ↓
   /path/to/downloaded/video.mp4
   
4. Upload Decision
   ↓
   if (upload_config) { upload }
   
5. UploadService Selection
   ↓
   type === "webdav" ? WebDAV : S3
   
6. File Upload
   ↓
   Read file → Upload bytes → Get URL
   
7. Response
   ↓
   {
     content: [{
       type: "text",
       text: "Download URL: https://..."
     }]
   }
```

## Error Handling Strategy

### Download Failures
- **Behavior**: Throw error immediately
- **Impact**: Operation stops, no upload attempted
- **User sees**: Error message from yt-dlp

### Upload Failures
- **Behavior**: Catch error, log, continue
- **Impact**: Local file preserved
- **User sees**: Download success + upload failure message

### Rationale
- Downloads are critical (primary function)
- Uploads are enhancement (nice to have)
- Local file always available as fallback

## Security Considerations

### Credential Handling
- Credentials passed at runtime, never stored
- No credential logging
- Secure transport (HTTPS) enforced

### File System
- Files written to current working directory
- No path traversal vulnerabilities
- Temporary files handled by yt-dlp

### Network
- All external connections use TLS/HTTPS
- S3 requests signed with AWS Signature V4
- WebDAV uses HTTP Basic Auth over TLS

## Performance Characteristics

### Download Phase
- **Bottleneck**: Network bandwidth and video source
- **Duration**: Varies by video size (minutes for large files)
- **Memory**: Streaming, minimal memory footprint

### Upload Phase
- **Bottleneck**: Network bandwidth to storage service
- **Duration**: Depends on file size and connection speed
- **Memory**: File loaded into memory for upload (consider streaming for very large files)

### Optimization Opportunities
1. Stream uploads instead of loading entire file
2. Parallel chunk uploads for S3 multipart
3. Implement upload progress reporting
4. Add file cleanup after successful upload

## Dependencies

```json
{
  "runtime": [
    "@modelcontextprotocol/sdk",
    "webdav",
    "@aws-sdk/client-s3"
  ],
  "system": [
    "yt-dlp (Python)",
    "ffmpeg (optional, for conversions)"
  ]
}
```

## Extension Points

### Adding New Storage Backends

1. Add configuration interface:
```typescript
ftp?: {
  host: string;
  username: string;
  password: string;
  // ...
}
```

2. Implement upload method:
```typescript
private async uploadToFTP(localPath: string): Promise<string> {
  // FTP upload logic
}
```

3. Update main upload method:
```typescript
async uploadFile(localPath: string): Promise<string> {
  if (this.config.type === "ftp") {
    return this.uploadToFTP(localPath);
  }
  // ...
}
```

### Adding Upload Progress

1. Modify UploadService to emit events
2. Stream progress back through MCP protocol
3. Update client to display progress

## Testing Strategy

### Unit Tests (not yet implemented)
- UploadService configuration parsing
- URL generation logic
- Error handling paths

### Integration Tests (manual)
- End-to-end download and upload
- Various storage backends
- Error scenarios

### Current Testing
- Schema validation (automated)
- Tool registration (automated)
- Service instantiation (automated)
