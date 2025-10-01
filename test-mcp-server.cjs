#!/usr/bin/env node

// Test MCP server functionality
const { spawn } = require('child_process');

console.log('🧪 Testing MCP Server with Real YouTube Video');
console.log('=' .repeat(50));

// Test MCP server with extract_info tool
async function testExtractInfo() {
  console.log('\n1️⃣  Testing extract_info tool...');
  
  return new Promise((resolve) => {
    const serverProcess = spawn('docker', [
      'run', '--rm', '-i', 'yt-dlp-mcp-server:latest',
      'node', 'dist/index.js'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let stderr = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Send MCP request
    const mcpRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "extract_info",
        arguments: {
          url: "https://www.youtube.com/watch?v=z1xaK8VMm-0",
          include_formats: false
        }
      }
    };
    
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      serverProcess.stdin.end();
    }, 1000);
    
    serverProcess.on('close', (code) => {
      if (stderr.includes('yt-dlp MCP server running on stdio')) {
        console.log('✅ MCP server started successfully');
        if (output.includes('特斯拉') || output.includes('Tesla')) {
          console.log('✅ extract_info tool working - video info extracted');
          resolve(true);
        } else {
          console.log('❌ extract_info tool failed - no video info');
          console.log('Output:', output);
          resolve(false);
        }
      } else {
        console.log('❌ MCP server startup failed');
        console.log('Error:', stderr);
        resolve(false);
      }
    });
  });
}

// Test transcribe_audio tool
async function testTranscribeAudio() {
  console.log('\n2️⃣  Testing transcribe_audio tool...');
  
  // First check if we have the downloaded audio file
  const fs = require('fs');
  const audioFiles = fs.readdirSync('.').filter(f => f.endsWith('.mp3'));
  
  if (audioFiles.length === 0) {
    console.log('❌ No audio file found for transcription test');
    return false;
  }
  
  const audioFile = audioFiles[0];
  console.log(`📁 Using audio file: ${audioFile}`);
  
  return new Promise((resolve) => {
    const serverProcess = spawn('docker', [
      'run', '--rm', '-i', '-v', `${process.cwd()}:/workspace`,
      'yt-dlp-mcp-server:latest',
      'node', 'dist/index.js'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let stderr = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Send MCP request for transcription
    const mcpRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "transcribe_audio",
        arguments: {
          audio_path: `/workspace/${audioFile}`,
          model: "tiny",
          language: "zh",
          output_format: "txt"
        }
      }
    };
    
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      serverProcess.stdin.end();
    }, 1000);
    
    serverProcess.on('close', (code) => {
      if (output.includes('特斯拉') || output.includes('Tesla') || output.includes('transcription')) {
        console.log('✅ transcribe_audio tool working - audio transcribed');
        console.log('📝 Transcription preview:', output.substring(0, 200) + '...');
        resolve(true);
      } else {
        console.log('❌ transcribe_audio tool failed');
        console.log('Output:', output);
        console.log('Error:', stderr);
        resolve(false);
      }
    });
  });
}

// Test integrated download + transcribe
async function testIntegratedFunction() {
  console.log('\n3️⃣  Testing integrated download_video with transcribe...');
  
  return new Promise((resolve) => {
    const serverProcess = spawn('docker', [
      'run', '--rm', '-i', '-v', `${process.cwd()}:/workspace`,
      'yt-dlp-mcp-server:latest',
      'node', 'dist/index.js'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let stderr = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Send MCP request for integrated download + transcribe
    const mcpRequest = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "download_video",
        arguments: {
          url: "https://www.youtube.com/watch?v=z1xaK8VMm-0",
          extract_audio: true,
          audio_format: "mp3",
          transcribe: true,
          whisper_model: "tiny",
          transcribe_language: "zh",
          output_path: "/workspace/test_integrated.%(ext)s"
        }
      }
    };
    
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      serverProcess.stdin.end();
    }, 2000);
    
    // Give more time for download + transcription
    setTimeout(() => {
      if (serverProcess.exitCode === null) {
        serverProcess.kill();
      }
    }, 60000); // 60 seconds timeout
    
    serverProcess.on('close', (code) => {
      if (output.includes('Download completed') && (output.includes('Transcription') || output.includes('特斯拉'))) {
        console.log('✅ Integrated download + transcribe working!');
        console.log('📝 Result preview:', output.substring(0, 300) + '...');
        resolve(true);
      } else {
        console.log('❌ Integrated function may have issues');
        console.log('Output:', output.substring(0, 500));
        resolve(false);
      }
    });
  });
}

// Main test runner
async function runMCPTests() {
  console.log('\n⏳ Waiting for audio download to complete...');
  
  // Wait a bit for the audio download to complete
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const results = [];
  
  results.push(await testExtractInfo());
  results.push(await testTranscribeAudio());
  results.push(await testIntegratedFunction());
  
  console.log('\n📊 MCP Server Test Results:');
  console.log('=' .repeat(40));
  
  const tests = [
    'Extract Video Info',
    'Audio Transcription',
    'Integrated Download+Transcribe'
  ];
  
  results.forEach((result, index) => {
    console.log(`${result ? '✅' : '❌'} ${tests[index]}`);
  });
  
  const passed = results.filter(r => r).length;
  console.log(`\n🎯 Summary: ${passed}/${results.length} tests passed`);
  
  if (passed === results.length) {
    console.log('🎉 All MCP server tests passed! Whisper integration is fully functional!');
  } else if (passed > 0) {
    console.log('⚠️  Some tests passed - partial functionality confirmed');
  } else {
    console.log('❌ All tests failed - check configuration');
  }
}

runMCPTests().catch(console.error);
