const ffmpeg = require('fluent-ffmpeg');
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// AWS SDK v3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'rankandrent-videos';

class VideoCompositionService {
  constructor() {
    this.tempDir = path.join(__dirname, '..', 'temp');
  }

  async composeVideoOverlay({ screenKey, webcamKey, layout, outputKey }) {
    console.log('🎬 Starting video composition:', {
      screenKey,
      webcamKey,
      layout,
      outputKey
    });

    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });

    const screenPath = path.join(this.tempDir, `screen-${uuidv4()}.webm`);
    const webcamPath = path.join(this.tempDir, `webcam-${uuidv4()}.webm`);
    const outputPath = path.join(this.tempDir, `composed-${uuidv4()}.webm`);

    try {
      // Download files from S3
      console.log('📥 Downloading files from S3...');
      await this.downloadFromS3(screenKey, screenPath);
      await this.downloadFromS3(webcamKey, webcamPath);

      // Compose with FFmpeg
      console.log('🎬 Composing video with FFmpeg...');
      await this.composeWithFFmpeg(screenPath, webcamPath, outputPath, layout);

      // Upload composed file to S3
      console.log('📤 Uploading composed video to S3...');
      await this.uploadToS3(outputPath, outputKey);

      console.log('✅ Video composition completed successfully');
      return outputKey;

    } finally {
      // Clean up temp files
      console.log('🧹 Cleaning up temporary files...');
      await this.cleanupTempFiles([screenPath, webcamPath, outputPath]);
    }
  }

  async composeWithFFmpeg(screenPath, webcamPath, outputPath, layout) {
    return new Promise((resolve, reject) => {
      let filterComplex;
      
      // Define overlay position based on layout
      switch (layout) {
        case 'top-right':
          filterComplex = '[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=W-w-20:20';
          break;
        case 'top-left':
          filterComplex = '[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=20:20';
          break;
        case 'bottom-right':
          filterComplex = '[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=W-w-20:H-h-20';
          break;
        case 'bottom-left':
          filterComplex = '[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=20:H-h-20';
          break;
        case 'center':
          filterComplex = '[1:v]scale=iw*0.3:ih*0.3[pip];[0:v][pip]overlay=(W-w)/2:(H-h)/2';
          break;
        default:
          filterComplex = '[1:v]scale=iw*0.25:ih*0.25[pip];[0:v][pip]overlay=W-w-20:20';
      }

      console.log('🎬 FFmpeg composition settings:', {
        layout,
        filterComplex,
        screenPath,
        webcamPath,
        outputPath
      });

      ffmpeg()
        .input(screenPath)
        .input(webcamPath)
        .complexFilter(filterComplex)
        .outputOptions([
          '-c:a copy',  // Copy audio from screen recording
          '-c:v libvpx-vp9',  // Use VP9 for better compression
          '-b:v 8M',  // 8 Mbps video bitrate
          '-crf 23',  // Constant rate factor for quality
          '-deadline good',  // Encoding speed vs quality balance
          '-cpu-used 2'  // CPU usage for encoding
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('🎬 FFmpeg progress:', {
            percent: progress.percent,
            timemark: progress.timemark,
            fps: progress.currentFps
          });
        })
        .on('end', () => {
          console.log('✅ FFmpeg composition completed successfully');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg composition error:', err);
          reject(err);
        })
        .run();
    });
  }

  async downloadFromS3(key, localPath) {
    console.log('📥 Downloading from S3:', key, 'to', localPath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    try {
      const response = await s3Client.send(new GetObjectCommand(params));
      const fileStream = require('fs').createWriteStream(localPath);
      
      return new Promise((resolve, reject) => {
        if (response.Body) {
          response.Body.pipe(fileStream);
          fileStream.on('finish', () => {
            console.log('✅ Download completed:', key);
            resolve();
          });
          fileStream.on('error', (err) => {
            console.error('❌ Download error:', err);
            reject(err);
          });
        } else {
          reject(new Error('No body in S3 response'));
        }
      });
    } catch (error) {
      console.error('❌ S3 download error:', error);
      throw error;
    }
  }

  async uploadToS3(localPath, key) {
    console.log('📤 Uploading to S3:', localPath, 'as', key);
    
    try {
      const fileContent = await fs.readFile(localPath);
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: 'video/webm'
      };

      const result = await s3Client.send(new PutObjectCommand(params));
      console.log('✅ Upload completed:', key);
      return result;
    } catch (error) {
      console.error('❌ S3 upload error:', error);
      throw error;
    }
  }

  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log('🧹 Cleaned up:', filePath);
      } catch (error) {
        // File doesn't exist or already deleted, ignore
        console.log('⚠️ File not found for cleanup:', filePath);
      }
    }
  }

  // Get video metadata using FFmpeg
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('❌ FFprobe error:', err);
          reject(err);
        } else {
          console.log('📊 Video metadata:', {
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitrate: metadata.format.bit_rate,
            width: metadata.streams[0]?.width,
            height: metadata.streams[0]?.height
          });
          resolve(metadata);
        }
      });
    });
  }

  // Validate FFmpeg installation
  static async validateFFmpeg() {
    return new Promise((resolve) => {
      ffmpeg.getAvailableCodecs((err, codecs) => {
        if (err) {
          console.error('❌ FFmpeg not available:', err.message);
          resolve(false);
        } else {
          console.log('✅ FFmpeg is available');
          resolve(true);
        }
      });
    });
  }
}

module.exports = new VideoCompositionService();
