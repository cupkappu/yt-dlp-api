#!/usr/bin/env node

// Comprehensive test script to verify Whisper integration
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Whisper Integration for yt-dlp-mcp-server');
console.log('=' .repeat(50));

// Test 1: Check if Docker image exists
async function testDockerImage() {
  console.log('\n1️⃣  Checking Docker image...');
  
  return new Promise((resolve) => {
    const checkProcess = spawn('docker', ['images', 'yt-dlp-mcp-server:latest'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    checkProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    checkProcess.on('close', (code) => {
      if (output.includes('yt-dlp-mcp-server')) {
        console.log('✅ Docker image found');
        resolve(true);
      } else {
        console.log('❌ Docker image not found. Building...');
        resolve(false);
      }
    });
  });
}

// Test 2: Test Whisper in container
async function testWhisperInContainer() {
  console.log('\n2️⃣  Testing Whisper in container...');
  
  return new Promise((resolve) => {
    const testProcess = spawn('docker', [
      'run', '--rm', 'yt-dlp-mcp-server:latest', 
      'python3', '-m', 'whisper', '--help'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0 && output.includes('usage:')) {
        console.log('✅ Whisper is working in container');
        resolve(true);
      } else {
        console.log('❌ Whisper failed in container');
        console.log(`Error: ${error}`);
        resolve(false);
      }
    });
  });
}

// Test 3: Test yt-dlp in container  
async function testYtDlpInContainer() {
  console.log('\n3️⃣  Testing yt-dlp in container...');
  
  return new Promise((resolve) => {
    const testProcess = spawn('docker', [
      'run', '--rm', 'yt-dlp-mcp-server:latest', 
      'yt-dlp', '--version'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ yt-dlp is working:', output.trim());
        resolve(true);
      } else {
        console.log('❌ yt-dlp failed in container');
        resolve(false);
      }
    });
  });
}

// Test 4: Test MCP server startup
async function testMCPServer() {
  console.log('\n4️⃣  Testing MCP server startup...');
  
  return new Promise((resolve) => {
    const serverProcess = spawn('docker', [
      'run', '--rm', 'yt-dlp-mcp-server:latest',
      'timeout', '3s', 'node', 'dist/index.js'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stderr = '';
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    serverProcess.on('close', (code) => {
      // Timeout exits with code 124, which is expected
      if (stderr.includes('yt-dlp MCP server running on stdio') || code === 124) {
        console.log('✅ MCP server starts successfully');
        resolve(true);
      } else {
        console.log('❌ MCP server startup failed');
        console.log(`Error: ${stderr}`);
        resolve(false);
      }
    });
  });
}

// Test 5: Create test audio and transcribe
async function testAudioTranscription() {
  console.log('\n5️⃣  Testing audio transcription...');
  
  return new Promise((resolve) => {
    const testProcess = spawn('docker', [
      'run', '--rm', '-v', `${process.cwd()}:/workspace`, 
      'yt-dlp-mcp-server:latest',
      'sh', '-c', 
      'cd /workspace && ' +
      'ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -ar 16000 test.wav -y 2>/dev/null && ' +
      'python3 -m whisper test.wav --model tiny --language en 2>/dev/null && ' +
      'echo "Transcription completed"'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.on('close', (code) => {
      // Clean up
      ['test.wav', 'test.txt', 'test.srt', 'test.vtt', 'test.tsv', 'test.json'].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      
      if (output.includes('Transcription completed')) {
        console.log('✅ Audio transcription pipeline works');
        resolve(true);
      } else {
        console.log('❌ Audio transcription failed');
        resolve(false);
      }
    });
  });
}

// Main test runner
async function runAllTests() {
  const results = [];
  
  results.push(await testDockerImage());
  
  if (results[0]) {
    results.push(await testWhisperInContainer());
    results.push(await testYtDlpInContainer());
    results.push(await testMCPServer());
    results.push(await testAudioTranscription());
  } else {
    console.log('\n⚠️  Docker image not found. Please run: docker build -t yt-dlp-mcp-server:latest .');
    return;
  }
  
  console.log('\n📊 Test Results:');
  console.log('=' .repeat(30));
  
  const testNames = [
    'Docker Image Check',
    'Whisper Functionality', 
    'yt-dlp Functionality',
    'MCP Server Startup',
    'Audio Transcription'
  ];
  
  results.forEach((result, index) => {
    console.log(`${result ? '✅' : '❌'} ${testNames[index]}`);
  });
  
  const passed = results.filter(r => r).length;
  console.log(`\n🎯 Summary: ${passed}/${results.length} tests passed`);
  
  if (passed === results.length) {
    console.log('🎉 All tests passed! Whisper integration is ready!');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.');
  }
}

runAllTests().catch(console.error);
