# Upload Feature Implementation Summary

## Overview

This implementation adds the ability to automatically upload downloaded videos, audio files, and subtitles to WebDAV servers or S3-compatible storage, and return a public download URL to the MCP client.

## What's New

### Core Functionality

1. **Upload Service** (`src/upload-service.ts`)
   - New service class that handles file uploads
   - Supports WebDAV protocol (Nextcloud, ownCloud, etc.)
   - Supports S3 API (AWS S3, MinIO, DigitalOcean Spaces, etc.)
   - Returns public download URLs after successful upload

2. **Enhanced download_video Tool** (`src/index.ts`)
   - New optional `upload_config` parameter
   - Automatically detects downloaded file path using yt-dlp's `--print after_move:filepath`
   - Uploads file after successful download
   - Returns both local path and remote download URL

### Dependencies Added

- `webdav` - WebDAV client library
- `@aws-sdk/client-s3` - AWS S3 SDK for JavaScript

## Usage

### Basic Download (No Upload)

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best"
}
```

### Download with WebDAV Upload

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "upload_config": {
    "type": "webdav",
    "webdav": {
      "url": "https://webdav.example.com",
      "username": "your-username",
      "password": "your-password",
      "remotePath": "/videos"
    }
  }
}
```

### Download with S3 Upload

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "upload_config": {
    "type": "s3",
    "s3": {
      "region": "us-east-1",
      "bucket": "my-bucket",
      "accessKeyId": "YOUR_ACCESS_KEY",
      "secretAccessKey": "YOUR_SECRET_KEY",
      "prefix": "videos"
    }
  }
}
```

## Response Format

### Without Upload

```
Download completed successfully.
File saved to: /path/to/file.mp4
```

### With Successful Upload

```
Download completed successfully.
File saved to: /path/to/file.mp4

File uploaded successfully!
Download URL: https://webdav.example.com/videos/file.mp4
```

### With Upload Failure

```
Download completed successfully.
File saved to: /path/to/file.mp4

Upload failed: Connection timeout
```

Note: Download always succeeds even if upload fails, ensuring file is preserved locally.

## Supported Storage Services

### WebDAV
- Nextcloud
- ownCloud
- Box
- Any WebDAV-compliant server

### S3-Compatible
- AWS S3
- MinIO
- DigitalOcean Spaces
- Wasabi
- Backblaze B2 (with S3-compatible API)
- Cloudflare R2
- Any S3-compatible object storage

## Configuration Options

### WebDAV Configuration

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | WebDAV server URL |
| `username` | string | Yes | Authentication username |
| `password` | string | Yes | Authentication password |
| `remotePath` | string | No | Remote directory path (default: `/`) |

### S3 Configuration

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `region` | string | Yes | AWS region or equivalent |
| `bucket` | string | Yes | Bucket name |
| `accessKeyId` | string | Yes | Access key ID |
| `secretAccessKey` | string | Yes | Secret access key |
| `endpoint` | string | No | Custom endpoint URL (for S3-compatible services) |
| `prefix` | string | No | Object key prefix |
| `publicUrl` | string | No | Custom public URL base (e.g., CDN URL) |

## Implementation Details

### File Path Detection

The implementation uses yt-dlp's `--print after_move:filepath` option to accurately detect the final file path after download and any post-processing (like audio extraction). This ensures the correct file is uploaded regardless of format conversions.

### Error Handling

- Download failures throw errors and stop execution
- Upload failures are caught and reported, but don't fail the entire operation
- Local file is always preserved even if upload fails
- Detailed error messages help diagnose issues

### Security Considerations

1. **Credentials**: Never commit credentials to source control
2. **HTTPS**: Always use HTTPS endpoints for secure transmission
3. **IAM Roles**: For AWS, prefer IAM roles over access keys when possible
4. **App Passwords**: Use app-specific passwords for WebDAV services
5. **Bucket ACLs**: Configure S3 bucket permissions appropriately

## Testing

Run the build and test:

```bash
npm install
npm run build
node /tmp/integration-test.js  # Verify tool schema
```

## Documentation

- See [README.md](README.md) for general usage
- See [UPLOAD_EXAMPLES.md](UPLOAD_EXAMPLES.md) for detailed examples with various services

## Future Enhancements

Possible future improvements (not implemented):

1. Support for additional protocols (FTP, SFTP)
2. Progress reporting during upload
3. Automatic file cleanup after successful upload
4. Batch upload support
5. Retry logic for failed uploads
6. Support for private/signed URLs

## Backward Compatibility

This implementation is fully backward compatible:
- Existing download_video calls without `upload_config` work unchanged
- No breaking changes to API or behavior
- Optional feature - doesn't affect users who don't need uploads
