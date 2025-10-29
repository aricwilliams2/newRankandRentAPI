#!/usr/bin/env node

// Script to transcode existing WebM whisper audio to phone-grade WAV
const db = require('./config/database');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Helper: transcode audio to phone-grade WAV (8kHz mono µ-law)
const transcodeToPhoneWav = (inputBuffer) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const stream = require('stream');
    const inStream = new stream.PassThrough();
    inStream.end(inputBuffer);

    console.log(`🔄 Transcoding audio: ${inputBuffer.length} bytes input`);

    ffmpeg(inStream)
      .inputFormat('webm') // Explicitly specify WebM input format
      .format('wav')
      .audioCodec('pcm_mulaw')
      .audioChannels(1)
      .audioFrequency(8000)
      .on('error', (err) => {
        console.error('FFmpeg transcode error:', err.message);
        reject(err);
      })
      .on('end', () => {
        const result = Buffer.concat(chunks);
        console.log(`✅ Audio transcoded to phone-grade WAV: ${result.length} bytes`);
        resolve(result);
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });

async function transcodeExistingWhisper() {
  try {
    console.log('🎵 Transcoding Existing Whisper Audio');
    console.log('=====================================');
    
    // Get the existing whisper audio
    const rows = await db.query('SELECT id, phone_number_id, mime, bytes, size_bytes FROM phone_number_whispers WHERE id = 3');
    
    if (!rows || rows.length === 0) {
      console.log('❌ No whisper audio found with ID 3');
      return;
    }
    
    const whisper = rows[0];
    console.log(`📊 Found whisper audio: ${whisper.size_bytes} bytes, ${whisper.mime}`);
    
    if (whisper.mime === 'audio/wav') {
      console.log('✅ Audio is already in WAV format');
      return;
    }
    
    // Transcode to phone-grade WAV
    console.log('🔄 Transcoding to phone-grade WAV...');
    const wavBuffer = await transcodeToPhoneWav(whisper.bytes);
    
    // Update the database with transcoded audio
    const result = await db.query(
      'UPDATE phone_number_whispers SET mime = ?, bytes = ?, size_bytes = ? WHERE id = ?',
      ['audio/wav', wavBuffer, wavBuffer.length, 3]
    );
    
    console.log(`✅ Updated whisper audio in database: ${result.affectedRows} rows affected`);
    console.log(`📊 New size: ${wavBuffer.length} bytes (was ${whisper.size_bytes} bytes)`);
    console.log(`📈 Compression ratio: ${(whisper.size_bytes / wavBuffer.length).toFixed(2)}x`);
    
    console.log('\n🎯 Transcoding complete!');
    console.log('The whisper audio is now in phone-grade WAV format.');
    console.log('This should eliminate static/crackle on PSTN calls.');
    
  } catch (err) {
    console.error('❌ Error transcoding whisper audio:', err.message);
  }
  
  process.exit(0);
}

transcodeExistingWhisper();
