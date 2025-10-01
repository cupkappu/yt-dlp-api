import { createClient, WebDAVClient } from "webdav";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import { basename } from "path";

export interface UploadConfig {
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

export class UploadService {
  private webdavClient?: WebDAVClient;
  private s3Client?: S3Client;
  private config: UploadConfig;

  constructor(config: UploadConfig) {
    this.config = config;

    if (config.type === "webdav" && config.webdav) {
      this.webdavClient = createClient(config.webdav.url, {
        username: config.webdav.username,
        password: config.webdav.password,
      });
    } else if (config.type === "s3" && config.s3) {
      this.s3Client = new S3Client({
        region: config.s3.region,
        endpoint: config.s3.endpoint,
        credentials: {
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey,
        },
      });
    }
  }

  async uploadFile(localPath: string): Promise<string> {
    if (this.config.type === "webdav") {
      return this.uploadToWebDAV(localPath);
    } else if (this.config.type === "s3") {
      return this.uploadToS3(localPath);
    }
    throw new Error("Invalid upload configuration");
  }

  private async uploadToWebDAV(localPath: string): Promise<string> {
    if (!this.webdavClient || !this.config.webdav) {
      throw new Error("WebDAV client not initialized");
    }

    const fileName = basename(localPath);
    const remotePath = this.config.webdav.remotePath || "/";
    const remoteFilePath = `${remotePath.endsWith("/") ? remotePath : remotePath + "/"}${fileName}`;

    const fileBuffer = await readFile(localPath);
    await this.webdavClient.putFileContents(remoteFilePath, fileBuffer);

    // Construct the download URL
    const baseUrl = this.config.webdav.url.replace(/\/$/, "");
    return `${baseUrl}${remoteFilePath}`;
  }

  private async uploadToS3(localPath: string): Promise<string> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error("S3 client not initialized");
    }

    const fileName = basename(localPath);
    const prefix = this.config.s3.prefix || "";
    const key = prefix ? `${prefix}/${fileName}` : fileName;

    const fileBuffer = await readFile(localPath);

    const command = new PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: key,
      Body: fileBuffer,
    });

    await this.s3Client.send(command);

    // Construct the download URL
    if (this.config.s3.publicUrl) {
      return `${this.config.s3.publicUrl}/${key}`;
    } else if (this.config.s3.endpoint) {
      return `${this.config.s3.endpoint}/${this.config.s3.bucket}/${key}`;
    } else {
      return `https://${this.config.s3.bucket}.s3.${this.config.s3.region}.amazonaws.com/${key}`;
    }
  }
}
