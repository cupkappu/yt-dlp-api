#!/usr/bin/env node

import { Server } from "../node_modules/@modelcontextprotocol/sdk/dist/server/index.js";
import { StdioServerTransport } from "../node_modules/@modelcontextprotocol/sdk/dist/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "../node_modules/@modelcontextprotocol/sdk/dist/types.js";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { UploadService, UploadConfig } from "./upload-service.js";
import { resolve } from "path";

const exec = promisify(execCallback);

class YtDlpMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "yt-dlp-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "extract_info",
            description: "Extract video information (title, duration, formats) without downloading",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "Video URL to extract information from",
                },
                include_formats: {
                  type: "boolean",
                  description: "Whether to include format information",
                  default: true,
                },
              },
              required: ["url"],
            },
          },
          {
            name: "list_formats",
            description: "List available video formats for a given URL",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "Video URL to list formats for",
                },
              },
              required: ["url"],
            },
          },
          {
            name: "download_video",
            description: "Download a video with specified options, optionally upload to WebDAV or S3",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "Video URL to download",
                },
                format: {
                  type: "string",
                  description: "Format selector (e.g., 'best', 'worst', '22')",
                  default: "best",
                },
                output_path: {
                  type: "string",
                  description: "Output file path (optional, uses yt-dlp default if not specified)",
                },
                extract_audio: {
                  type: "boolean",
                  description: "Extract audio only",
                  default: false,
                },
                audio_format: {
                  type: "string",
                  description: "Audio format when extracting audio (mp3, m4a, etc.)",
                  default: "mp3",
                },
                upload_config: {
                  type: "object",
                  description: "Upload configuration for WebDAV or S3",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["webdav", "s3"],
                      description: "Upload destination type",
                    },
                    webdav: {
                      type: "object",
                      properties: {
                        url: { type: "string", description: "WebDAV server URL" },
                        username: { type: "string", description: "WebDAV username" },
                        password: { type: "string", description: "WebDAV password" },
                        remotePath: { type: "string", description: "Remote directory path (optional)" },
                      },
                    },
                    s3: {
                      type: "object",
                      properties: {
                        endpoint: { type: "string", description: "S3 endpoint URL (optional, for S3-compatible services)" },
                        region: { type: "string", description: "AWS region" },
                        bucket: { type: "string", description: "S3 bucket name" },
                        accessKeyId: { type: "string", description: "AWS access key ID" },
                        secretAccessKey: { type: "string", description: "AWS secret access key" },
                        prefix: { type: "string", description: "S3 key prefix (optional)" },
                        publicUrl: { type: "string", description: "Public URL base for downloaded files (optional)" },
                      },
                    },
                  },
                },
              },
              required: ["url"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "extract_info":
            return await this.handleExtractInfo(args);
          case "list_formats":
            return await this.handleListFormats(args);
          case "download_video":
            return await this.handleDownloadVideo(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async runYtDlpCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const ytDlpProcess = spawn('yt-dlp', args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      ytDlpProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      ytDlpProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      ytDlpProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });

      ytDlpProcess.on("error", (error) => {
        reject(new Error(`Failed to start yt-dlp: ${error.message}`));
      });
    });
  }

  private async handleExtractInfo(args: any) {
    const { url, include_formats = true } = args;

    if (!url || typeof url !== "string") {
      throw new Error("URL is required and must be a string");
    }

    const commandArgs = [
      "--dump-json",
      "--no-download",
      url
    ];

    // Note: include_formats parameter is kept for API compatibility
    // but yt-dlp --dump-json always includes format information
    // To exclude formats, we would need to parse and filter the JSON

    const { stdout } = await this.runYtDlpCommand(commandArgs);

    try {
      const info = JSON.parse(stdout.trim());
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to parse yt-dlp output: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleListFormats(args: any) {
    const { url } = args;

    if (!url || typeof url !== "string") {
      throw new Error("URL is required and must be a string");
    }

    const commandArgs = [
      "--list-formats",
      "--no-download",
      url
    ];

    const { stdout, stderr } = await this.runYtDlpCommand(commandArgs);

    return {
      content: [
        {
          type: "text",
          text: stdout || stderr,
        },
      ],
    };
  }

  private async handleDownloadVideo(args: any) {
    const { url, format = "best", output_path, extract_audio = false, audio_format = "mp3", upload_config } = args;

    if (!url || typeof url !== "string") {
      throw new Error("URL is required and must be a string");
    }

    // Generate a unique output path if not specified
    const outputTemplate = output_path || "%(title)s.%(ext)s";
    
    const commandArgs = [
      "-o", outputTemplate,
      "--print", "after_move:filepath"  // Print the final file path after download
    ];

    if (extract_audio) {
      commandArgs.push("-x", "--audio-format", audio_format);
    } else {
      commandArgs.push("-f", format);
    }

    commandArgs.push(url);

    const { stdout, stderr } = await this.runYtDlpCommand(commandArgs);

    // Extract the downloaded file path from stdout
    const downloadedFilePath = stdout.trim().split('\n').pop()?.trim() || "";
    
    if (!downloadedFilePath) {
      throw new Error("Could not determine downloaded file path");
    }

    // Resolve to absolute path
    const absolutePath = resolve(process.cwd(), downloadedFilePath);

    let response = `Download completed successfully.\nFile saved to: ${absolutePath}`;

    // Upload if configuration is provided
    if (upload_config) {
      try {
        const uploadService = new UploadService(upload_config as UploadConfig);
        const downloadUrl = await uploadService.uploadFile(absolutePath);
        response += `\n\nFile uploaded successfully!\nDownload URL: ${downloadUrl}`;
      } catch (uploadError) {
        response += `\n\nUpload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("yt-dlp MCP server running on stdio");
  }
}

const server = new YtDlpMcpServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
