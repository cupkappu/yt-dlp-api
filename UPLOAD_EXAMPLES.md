# Upload Configuration Examples

This document provides examples of how to configure and use the upload feature with WebDAV and S3 via environment variables.

## WebDAV Upload Examples

### Basic WebDAV Configuration

**Environment Variables:**
```bash
UPLOAD_TYPE=webdav
WEBDAV_URL=https://webdav.example.com
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password
WEBDAV_REMOTE_PATH=/videos
```

**MCP Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best"
}
```

### WebDAV with Nextcloud

**Environment Variables:**
```bash
UPLOAD_TYPE=webdav
WEBDAV_URL=https://nextcloud.example.com/remote.php/dav/files/username
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-app-password
WEBDAV_REMOTE_PATH=/Music
```

**MCP Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "extract_audio": true,
  "audio_format": "mp3"
}
```

## S3 Upload Examples

### AWS S3 Configuration

**Environment Variables:**
```bash
UPLOAD_TYPE=s3
S3_REGION=us-east-1
S3_BUCKET=my-video-bucket
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_PREFIX=downloads
```

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best"
}
```

### S3 with Custom Public URL (CloudFront)

**Environment Variables:**
```bash
UPLOAD_TYPE=s3
S3_REGION=us-east-1
S3_BUCKET=my-video-bucket
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_PREFIX=videos
S3_PUBLIC_URL=https://cdn.example.com
```

**MCP Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best"
}
```

### MinIO (S3-Compatible) Configuration

**Environment Variables:**
```bash
UPLOAD_TYPE=s3
S3_ENDPOINT=https://minio.example.com
S3_REGION=us-east-1
S3_BUCKET=videos
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin123
S3_PREFIX=youtube
S3_PUBLIC_URL=https://minio.example.com/videos
```

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best"
}
```

### DigitalOcean Spaces Configuration

**Environment Variables:**
```bash
UPLOAD_TYPE=s3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=my-space-name
S3_ACCESS_KEY_ID=YOUR_SPACES_KEY
S3_SECRET_ACCESS_KEY=YOUR_SPACES_SECRET
S3_PREFIX=videos
S3_PUBLIC_URL=https://my-space-name.nyc3.cdn.digitaloceanspaces.com
```

**MCP Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best"
}
```

## Audio Extraction with Upload

### Extract MP3 and Upload to WebDAV

**Environment Variables:**
```bash
UPLOAD_TYPE=webdav
WEBDAV_URL=https://webdav.example.com
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password
WEBDAV_REMOTE_PATH=/music
```

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "extract_audio": true,
  "audio_format": "mp3"
}
```

### Extract AAC and Upload to S3

**Environment Variables:**
```bash
UPLOAD_TYPE=s3
S3_REGION=us-west-2
S3_BUCKET=my-audio-bucket
S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
S3_PREFIX=audio/youtube
```

**MCP Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "extract_audio": true,
  "audio_format": "m4a"
}
```

## Using with Docker

### Setting Environment Variables with Docker

**Using docker run:**
```bash
docker run -d \
  -e UPLOAD_TYPE=s3 \
  -e S3_REGION=us-east-1 \
  -e S3_BUCKET=my-bucket \
  -e S3_ACCESS_KEY_ID=YOUR_KEY \
  -e S3_SECRET_ACCESS_KEY=YOUR_SECRET \
  yt-dlp-mcp-server:latest
```

**Using docker-compose with .env file:**

Create a `.env` file:
```bash
UPLOAD_TYPE=webdav
WEBDAV_URL=https://webdav.example.com
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password
WEBDAV_REMOTE_PATH=/videos
```

Update `docker-compose.yml`:
```yaml
version: '3.8'
services:
  yt-dlp-mcp-server:
    build: .
    env_file:
      - .env
    restart: unless-stopped
```

## Response Format

When a download and upload is successful, you will receive a response like:

```
Download completed successfully.
File saved to: /path/to/downloaded/file.mp4

File uploaded successfully!
Download URL: https://webdav.example.com/videos/file.mp4
```

Or for S3:

```
Download completed successfully.
File saved to: /path/to/downloaded/file.mp4

File uploaded successfully!
Download URL: https://my-bucket.s3.us-east-1.amazonaws.com/videos/file.mp4
```

## Security Notes

1. **Never commit credentials**: Keep your credentials in environment variables or secure configuration management
2. **Use IAM roles**: For AWS S3, consider using IAM roles instead of access keys when running in AWS
3. **App passwords**: For WebDAV services like Nextcloud, use app-specific passwords
4. **Environment files**: Use `.env` files for local development but never commit them to version control
5. **Secret management**: For production deployments, use proper secret management systems like AWS Secrets Manager, Azure Key Vault, or Kubernetes Secrets
4. **Bucket permissions**: Ensure your S3 bucket has appropriate public read permissions if you want the URLs to be accessible
5. **HTTPS**: Always use HTTPS endpoints for security

## Troubleshooting

### WebDAV Issues
- Verify the WebDAV URL is correct and accessible
- Check that the username and password are correct
- Ensure the remote path exists or the user has permission to create it
- Some WebDAV servers require trailing slashes in paths

### S3 Issues
- Verify AWS credentials are correct and have PutObject permission
- Check that the bucket exists and is in the specified region
- For S3-compatible services, ensure the endpoint URL is correct
- Verify the bucket has appropriate ACL settings for public access if needed

### General Issues
- Check file was downloaded successfully before upload attempt
- Ensure sufficient disk space for the download
- Check network connectivity to the upload destination
