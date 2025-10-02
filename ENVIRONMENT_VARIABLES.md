# Environment Variables Configuration

This document describes the environment variables that can be used to configure the yt-dlp MCP server.

## Upload Configuration

The server supports automatic upload of downloaded videos to WebDAV or S3-compatible storage services. Upload is configured entirely through environment variables on the server side.

### General Upload Settings

- `UPLOAD_TYPE`: Specifies the upload destination type. Supported values:
  - `webdav` - Upload to WebDAV server
  - `s3` - Upload to S3 or S3-compatible storage
  - Leave empty or unset to disable upload functionality

### WebDAV Configuration

When `UPLOAD_TYPE=webdav`, the following variables are required:

- `WEBDAV_URL`: WebDAV server URL (e.g., `https://your-webdav-server.com`)
- `WEBDAV_USERNAME`: WebDAV username
- `WEBDAV_PASSWORD`: WebDAV password

Optional WebDAV variables:

- `WEBDAV_REMOTE_PATH`: Remote directory path (default: `/`)

### S3 Configuration

When `UPLOAD_TYPE=s3`, the following variables are required:

- `S3_REGION`: AWS region (e.g., `us-east-1`)
- `S3_BUCKET`: S3 bucket name
- `S3_ACCESS_KEY_ID`: AWS access key ID
- `S3_SECRET_ACCESS_KEY`: AWS secret access key

Optional S3 variables:

- `S3_ENDPOINT`: S3 endpoint URL (for S3-compatible services like MinIO)
- `S3_PREFIX`: S3 key prefix for uploaded files
- `S3_PUBLIC_URL`: Public URL base for constructing download URLs

## Example Configurations

### WebDAV Example

```bash
UPLOAD_TYPE=webdav
WEBDAV_URL=https://your-webdav-server.com
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password
WEBDAV_REMOTE_PATH=/videos
```

### S3 Example (AWS)

```bash
UPLOAD_TYPE=s3
S3_REGION=us-east-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_PREFIX=videos
```

### S3 Example (MinIO)

```bash
UPLOAD_TYPE=s3
S3_ENDPOINT=https://your-minio-server.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=minioaccesskey
S3_SECRET_ACCESS_KEY=miniosecretkey
S3_PREFIX=videos
S3_PUBLIC_URL=https://your-minio-server.com/your-bucket
```

## Usage

1. Set the appropriate environment variables for your chosen upload method
2. Start the MCP server
3. Use the `download_video` tool - files will be automatically uploaded if upload is configured
4. The server will return both the local file path and the upload URL (if upload was successful)

## Security Notes

- Store sensitive credentials (passwords, secret keys) securely
- Consider using environment variable files (`.env`) that are not committed to version control
- For production deployments, use proper secret management systems