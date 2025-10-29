#!/usr/bin/env node

// Test script to verify audio transcoding works
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

console.log('🎵 Testing Audio Transcoding');
console.log('============================');
console.log(`FFmpeg path: ${ffmpegPath}`);

// Create a simple test audio buffer (sine wave)
const createTestAudio = () => {
  const sampleRate = 44100;
  const duration = 2; // 2 seconds
  const frequency = 440; // A4 note
  const samples = sampleRate * duration;
  const buffer = Buffer.alloc(samples * 2); // 16-bit samples
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, i * 2);
  }
  
  return buffer;
};

// Transcode to phone-grade WAV
const transcodeToPhoneWav = (inputBuffer) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const stream = require('stream');
    const inStream = new stream.PassThrough();
    inStream.end(inputBuffer);

    console.log('🔄 Transcoding test audio to phone-grade WAV...');
    console.log(`   Input: ${inputBuffer.length} bytes`);

    ffmpeg(inStream)
      .format('wav')
      .audioCodec('pcm_mulaw')
      .audioChannels(1)
      .audioFrequency(8000)
      .on('error', (err) => {
        console.error('❌ FFmpeg transcode error:', err.message);
        reject(err);
      })
      .on('end', () => {
        const result = Buffer.concat(chunks);
        console.log(`✅ Transcode complete: ${result.length} bytes`);
        console.log(`   Compression ratio: ${(inputBuffer.length / result.length).toFixed(2)}x`);
        resolve(result);
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });

// Test the transcoding
async function testTranscoding() {
  try {
    // Create test audio
    const testAudio = createTestAudio();
    console.log(`📊 Created test audio: ${testAudio.length} bytes (44.1kHz stereo)`);
    
    // Transcode it
    const phoneWav = await transcodeToPhoneWav(testAudio);
    
    // Save the result
    fs.writeFileSync('test-phone-audio.wav', phoneWav);
    console.log('💾 Saved transcoded audio as test-phone-audio.wav');
    
    console.log('\n✅ Transcoding test successful!');
    console.log('   - Input: 44.1kHz stereo PCM');
    console.log('   - Output: 8kHz mono WAV (µ-law)');
    console.log('   - Phone-grade quality for PSTN');
    
  } catch (err) {
    console.error('❌ Transcoding test failed:', err.message);
  }
}

testTranscoding();
