#!/usr/bin/env node

import { spawn } from 'child_process';

async function testServer() {
  console.log('Testing yt-dlp MCP server...');

  // Start the server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test list tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  let response = '';
  server.stdout.on('data', (data) => {
    response += data.toString();
    try {
      const parsed = JSON.parse(response.trim());
      console.log('Server response:', JSON.stringify(parsed, null, 2));
      response = ''; // Reset for next response
    } catch (e) {
      // Response not complete yet
    }
  });

  // Wait for list tools response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test extract_info tool
  const extractInfoRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'extract_info',
      arguments: {
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        include_formats: false
      }
    }
  };

  console.log('Testing extract_info tool...');
  server.stdin.write(JSON.stringify(extractInfoRequest) + '\n');

  // Wait for extract_info response
  await new Promise(resolve => setTimeout(resolve, 5000));

  server.kill();
  console.log('Test completed');
}

testServer().catch(console.error);
