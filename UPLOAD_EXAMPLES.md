# Upload Configuration Examples

This document provides examples of how to use the upload feature with WebDAV and S3.

## WebDAV Upload Example

### Basic WebDAV Configuration

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

### WebDAV with Nextcloud

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "extract_audio": true,
  "audio_format": "mp3",
  "upload_config": {
    "type": "webdav",
    "webdav": {
      "url": "https://nextcloud.example.com/remote.php/dav/files/username",
      "username": "your-username",
      "password": "your-app-password",
      "remotePath": "/Music"
    }
  }
}
```

## S3 Upload Examples

### AWS S3 Configuration

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "upload_config": {
    "type": "s3",
    "s3": {
      "region": "us-east-1",
      "bucket": "my-video-bucket",
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      "prefix": "videos/youtube"
    }
  }
}
```

### S3 with Custom Public URL (CloudFront)

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "upload_config": {
    "type": "s3",
    "s3": {
      "region": "us-east-1",
      "bucket": "my-video-bucket",
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      "prefix": "videos",
      "publicUrl": "https://cdn.example.com"
    }
  }
}
```

### MinIO (S3-Compatible) Configuration

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "upload_config": {
    "type": "s3",
    "s3": {
      "endpoint": "https://minio.example.com",
      "region": "us-east-1",
      "bucket": "videos",
      "accessKeyId": "minioadmin",
      "secretAccessKey": "minioadmin",
      "prefix": "downloads",
      "publicUrl": "https://minio.example.com/videos"
    }
  }
}
```

### DigitalOcean Spaces Configuration

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "format": "best",
  "upload_config": {
    "type": "s3",
    "s3": {
      "endpoint": "https://nyc3.digitaloceanspaces.com",
      "region": "nyc3",
      "bucket": "my-space-name",
      "accessKeyId": "YOUR_SPACES_KEY",
      "secretAccessKey": "YOUR_SPACES_SECRET",
      "prefix": "videos",
      "publicUrl": "https://my-space-name.nyc3.cdn.digitaloceanspaces.com"
    }
  }
}
```

## Audio Extraction with Upload

### Extract MP3 and Upload to WebDAV

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "extract_audio": true,
  "audio_format": "mp3",
  "upload_config": {
    "type": "webdav",
    "webdav": {
      "url": "https://webdav.example.com",
      "username": "your-username",
      "password": "your-password",
      "remotePath": "/music"
    }
  }
}
```

### Extract AAC and Upload to S3

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "extract_audio": true,
  "audio_format": "m4a",
  "upload_config": {
    "type": "s3",
    "s3": {
      "region": "us-west-2",
      "bucket": "my-audio-bucket",
      "accessKeyId": "YOUR_ACCESS_KEY",
      "secretAccessKey": "YOUR_SECRET_KEY",
      "prefix": "audio/youtube"
    }
  }
}
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
