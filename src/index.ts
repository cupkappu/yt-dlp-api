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
import { existsSync } from "fs";
import { extname, basename, dirname, join } from "path";

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
            description: "Download a video with specified options",
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
                transcribe: {
                  type: "boolean",
                  description: "Automatically transcribe audio using Whisper after download",
                  default: false,
                },
                whisper_model: {
                  type: "string",
                  description: "Whisper model to use (tiny, base, small, medium, large)",
                  default: "base",
                },
                transcribe_language: {
                  type: "string",
                  description: "Language for transcription (optional, auto-detect if not specified)",
                },
              },
              required: ["url"],
            },
          },
          {
            name: "transcribe_audio",
            description: "Transcribe an audio file using OpenAI Whisper",
            inputSchema: {
              type: "object",
              properties: {
                audio_path: {
                  type: "string",
                  description: "Path to the audio file to transcribe",
                },
                model: {
                  type: "string",
                  description: "Whisper model to use (tiny, base, small, medium, large)",
                  default: "base",
                },
                language: {
                  type: "string",
                  description: "Language for transcription (optional, auto-detect if not specified)",
                },
                output_format: {
                  type: "string",
                  description: "Output format (txt, srt, vtt, json)",
                  default: "txt",
                },
                output_path: {
                  type: "string",
                  description: "Output file path for transcription (optional)",
                },
              },
              required: ["audio_path"],
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
          case "transcribe_audio":
            return await this.handleTranscribeAudio(args);
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

  private async runWhisperCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      // Use python3 -m whisper instead of direct whisper command for better compatibility
      const whisperProcess = spawn('python3', ['-m', 'whisper', ...args], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      whisperProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      whisperProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      whisperProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`whisper exited with code ${code}: ${stderr}`));
        }
      });

      whisperProcess.on("error", (error) => {
        reject(new Error(`Failed to start whisper: ${error.message}`));
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
    const { url, format = "best", output_path, extract_audio = false, audio_format = "mp3", transcribe = false, whisper_model = "base", transcribe_language } = args;

    if (!url || typeof url !== "string") {
      throw new Error("URL is required and must be a string");
    }

    const commandArgs = [];

    if (output_path) {
      commandArgs.push("-o", output_path);
    }

    // Detect if we're downloading audio format
    const isAudioFormat = extract_audio || 
                         format === "bestaudio" || 
                         format === "worstaudio" ||
                         (typeof format === "string" && format.includes("audio"));

    if (extract_audio) {
      commandArgs.push("-x", "--audio-format", audio_format);
    } else {
      commandArgs.push("-f", format);
    }

    commandArgs.push(url);

    const { stdout, stderr } = await this.runYtDlpCommand(commandArgs);

    let result = `Download completed successfully.\n${stdout || stderr}`;

    // If transcribe is enabled and we're downloading audio, run Whisper
    if (transcribe && isAudioFormat) {
      try {
        // Extract the downloaded file path from yt-dlp output
        const downloadedFile = this.extractDownloadedFilePath(stdout || stderr);
        if (downloadedFile) {
          const transcriptionResult = await this.handleTranscribeAudio({
            audio_path: downloadedFile,
            model: whisper_model,
            language: transcribe_language,
            output_format: "txt"
          });
          result += "\n\nTranscription:\n" + transcriptionResult.content[0].text;
        }
      } catch (transcribeError) {
        result += `\n\nTranscription failed: ${transcribeError instanceof Error ? transcribeError.message : String(transcribeError)}`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async handleTranscribeAudio(args: any) {
    const { audio_path, model = "base", language, output_format = "txt", output_path } = args;

    if (!audio_path || typeof audio_path !== "string") {
      throw new Error("audio_path is required and must be a string");
    }

    if (!existsSync(audio_path)) {
      throw new Error(`Audio file not found: ${audio_path}`);
    }

    const commandArgs = [audio_path, "--model", model];

    if (language) {
      commandArgs.push("--language", language);
    }

    if (output_format && output_format !== "txt") {
      commandArgs.push("--output_format", output_format);
    }

    if (output_path) {
      commandArgs.push("--output_dir", dirname(output_path));
    }

    const { stdout, stderr } = await this.runWhisperCommand(commandArgs);

    // Whisper typically outputs the transcription to stdout or creates files
    let transcriptionText = stdout;

    // If output_format is txt and no custom output_path, try to read the generated file
    if (!transcriptionText && output_format === "txt") {
      const baseFileName = basename(audio_path, extname(audio_path));
      const transcriptionFile = join(dirname(audio_path), `${baseFileName}.txt`);
      
      if (existsSync(transcriptionFile)) {
        const fs = await import('fs');
        transcriptionText = fs.readFileSync(transcriptionFile, 'utf-8');
      }
    }

    return {
      content: [
        {
          type: "text",
          text: transcriptionText || stderr || "Transcription completed, but no text output found.",
        },
      ],
    };
  }

  private extractDownloadedFilePath(output: string): string | null {
    // Parse yt-dlp output to find the downloaded file path
    const lines = output.split('\n');
    for (const line of lines) {
      // Look for patterns like "[download] Destination: filename" or similar
      if (line.includes('[download]') && (line.includes('Destination:') || line.includes('has already been downloaded'))) {
        const match = line.match(/[\/\w\-_\.]+\.\w+/);
        if (match) {
          return match[0];
        }
      }
      // Also look for final output file mentions
      if (line.includes('[ExtractAudio]') && line.includes('Destination:')) {
        const match = line.match(/[\/\w\-_\.]+\.\w+/);
        if (match) {
          return match[0];
        }
      }
    }
    return null;
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
