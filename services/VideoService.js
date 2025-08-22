const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const VideoRecording = require('../models/VideoRecording');
const VideoView = require('../models/VideoView');
const VideoCompositionService = require('./VideoCompositionService');

// AWS SDK v3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'rankandrent-videos';

class VideoService {
  // Configure multer for file uploads
  static getUploadMiddleware() {
    const fileFilter = (req, file, cb) => {
      console.log('File upload attempt:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fieldname: file.fieldname
      });
      
      // Comprehensive list of video MIME types including WebM variants
      const allowedMimeTypes = [
        'video/webm',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/mp4', 
        'video/mp4;codecs=h264',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv',
        'video/ogg',
        'video/mpeg',
        'video/3gpp',
        'video/3gpp2',
        'video/avi',
        'video/mov'
      ];
      
      // Also check file extension as fallback for MIME type detection issues
      const allowedExtensions = ['.webm', '.mp4', '.avi', '.mov', '.ogg', '.mpeg', '.3gp', '.wmv'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      // Check if MIME type is in allowed list OR if file extension is video-related
      if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        console.log('✅ File accepted:', file.mimetype, 'Extension:', fileExtension, 'Field:', file.fieldname);
        cb(null, true);
      } else {
        console.log('❌ File rejected:', file.mimetype, 'Extension:', fileExtension, 'Field:', file.fieldname);
        cb(new Error(`Invalid file type: ${file.mimetype} (${fileExtension}). Only video files are allowed.`), false);
      }
    };

    return multer({
      storage: multer.memoryStorage(), // Use memory storage for better multipart handling
      fileFilter: fileFilter,
      limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit per file
      }
    });
  }

  // Get multer middleware for dual-stream uploads
  static getDualStreamUploadMiddleware() {
    const fileFilter = (req, file, cb) => {
      console.log('Dual-stream upload attempt:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fieldname: file.fieldname
      });
      
      // Comprehensive list of video MIME types including WebM variants
      const allowedMimeTypes = [
        'video/webm',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/mp4', 
        'video/mp4;codecs=h264',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv',
        'video/ogg',
        'video/mpeg',
        'video/3gpp',
        'video/3gpp2',
        'video/avi',
        'video/mov'
      ];
      
      // Also check file extension as fallback for MIME type detection issues
      const allowedExtensions = ['.webm', '.mp4', '.avi', '.mov', '.ogg', '.mpeg', '.3gp', '.wmv'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      // Check if MIME type is in allowed list OR if file extension is video-related
      if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        console.log('✅ Dual-stream file accepted:', file.mimetype, 'Extension:', fileExtension, 'Field:', file.fieldname);
        cb(null, true);
      } else {
        console.log('❌ Dual-stream file rejected:', file.mimetype, 'Extension:', fileExtension, 'Field:', file.fieldname);
        cb(new Error(`Invalid file type: ${file.mimetype} (${fileExtension}). Only video files are allowed.`), false);
      }
    };

    return multer({
      storage: multer.memoryStorage(),
      fileFilter: fileFilter,
      limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit per file
      }
    });
  }

  // Upload video to S3
  static async uploadToS3(filePath, fileName, contentType) {
    try {
      const fileContent = await fs.readFile(filePath);
      const key = `videos/${Date.now()}-${fileName}`;
      
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: contentType
        // ACL removed - bucket has Object Ownership = Bucket owner enforced
      };

      const result = await s3Client.send(new PutObjectCommand(params));
      
      // Clean up temp file
      await fs.unlink(filePath);
      
      return {
        key: key,
        url: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
        etag: result.ETag
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  // Generate thumbnail from video
  static async generateThumbnail(videoPath, outputPath) {
    try {
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['50%'],
            filename: path.basename(outputPath),
            folder: path.dirname(outputPath),
            size: '320x240'
          })
          .on('end', () => {
            console.log('✅ Thumbnail generated successfully');
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.log('⚠️ FFmpeg thumbnail generation failed:', err.message);
            resolve(null); // Return null instead of rejecting
          });
      });
    } catch (error) {
      console.log('⚠️ FFmpeg error, skipping thumbnail:', error.message);
      return null; // Return null instead of throwing
    }
  }

  // Get video duration
  static async getVideoDuration(videoPath) {
    try {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) {
            console.log('⚠️ FFmpeg not available, using default duration');
            resolve(0); // Default duration if FFmpeg fails
          } else {
            resolve(Math.round(metadata.format.duration));
          }
        });
      });
    } catch (error) {
      console.log('⚠️ FFmpeg error, using default duration:', error.message);
      return 0; // Default duration
    }
  }

  // Create video recording record
  static async createRecording(recordingData) {
    try {
      const shareableId = await VideoRecording.generateShareableId();
      
      const recording = await VideoRecording.create({
        ...recordingData,
        shareable_id: shareableId
      });

      return recording;
    } catch (error) {
      console.error('Error creating recording:', error);
      throw error;
    }
  }

  // Process uploaded video file
  static async processVideoUpload(file, userId, metadata = {}) {
    try {
      console.log('🎬 Processing video upload for user:', userId);
      console.log('📁 File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer ? file.buffer.length : 0
      });
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${uuidv4()}${fileExtension}`;
      const tempPath = path.join(__dirname, '..', 'uploads', 'temp', fileName);
      
      console.log('📂 Temp file path:', tempPath);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      
      // Write buffer to temp file (since we're using memory storage)
      await fs.writeFile(tempPath, file.buffer);
      console.log('💾 File written to temp location');
      
      // Get video duration
      const duration = await this.getVideoDuration(tempPath);
      
      // Generate thumbnail (optional)
      let thumbnailPath = null;
      try {
        const thumbnailFileName = `${path.parse(fileName).name}-thumb.jpg`;
        const thumbnailOutputPath = path.join(__dirname, '..', 'uploads', 'temp', thumbnailFileName);
        thumbnailPath = await this.generateThumbnail(tempPath, thumbnailOutputPath);
      } catch (thumbnailError) {
        console.log('⚠️ Thumbnail generation failed, continuing without thumbnail:', thumbnailError.message);
      }
      
      // Upload to S3
      console.log('☁️ Uploading to S3...');
      const s3Result = await this.uploadToS3(tempPath, fileName, file.mimetype);
      console.log('✅ S3 upload successful:', s3Result.url);
      
      // Upload thumbnail if generated
      let thumbnailUrl = null;
      if (thumbnailPath) {
        try {
          const thumbnailS3Result = await this.uploadToS3(thumbnailPath, path.basename(thumbnailPath), 'image/jpeg');
          thumbnailUrl = thumbnailS3Result.url;
          // Clean up temp thumbnail
          await fs.unlink(thumbnailPath);
        } catch (thumbnailUploadError) {
          console.log('⚠️ Thumbnail upload failed:', thumbnailUploadError.message);
        }
      }
      
      // Create database record
      console.log('💾 Creating database record...');
      const recording = await this.createRecording({
        user_id: userId,
        title: metadata.title || 'Untitled Recording',
        description: metadata.description || '',
        file_path: s3Result.key,
        file_size: file.size,
        duration: duration,
        recording_type: metadata.recording_type || 'screen',
        thumbnail_path: thumbnailUrl,
        shareable_id: await VideoRecording.generateShareableId(),
        is_public: metadata.is_public || false,
        metadata: metadata.metadata || {}
      });
      
      console.log('✅ Video upload processing completed successfully');
      return recording;
    } catch (error) {
      console.error('❌ Error processing video upload:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        userId: userId,
        fileName: file?.originalname
      });
      throw error;
    }
  }

  // Process dual-stream video upload (screen + webcam)
  static async processDualStreamUpload(files, userId, metadata = {}) {
    try {
      console.log('🎬🎥 Processing dual-stream upload for user:', userId);
      console.log('📁 Files received:', {
        screen: files.video?.[0]?.originalname,
        webcam: files.webcam?.[0]?.originalname,
        totalFiles: Object.keys(files).length
      });
      
      const screenFile = files.video?.[0];
      const webcamFile = files.webcam?.[0];
      
      if (!screenFile) {
        throw new Error('No screen recording file provided');
      }

      // Process screen file first
      console.log('📺 Processing screen recording...');
      const screenRecording = await this.processVideoUpload(screenFile, userId, {
        ...metadata,
        recording_type: 'screen',
        title: metadata.title || 'Screen Recording'
      });

      // If webcam file exists, compose the videos
      if (webcamFile) {
        console.log('📹 Processing webcam recording...');
        const webcamRecording = await this.processVideoUpload(webcamFile, userId, {
          ...metadata,
          recording_type: 'webcam',
          title: metadata.title || 'Webcam Recording'
        });

        // Compose the videos using VideoCompositionService
        console.log('🎬 Composing dual-stream video...');
        const layout = metadata.layout || 'top-right';
        
        try {
          const composedVideoKey = await VideoCompositionService.composeVideoOverlay({
            screenKey: screenRecording.file_path,
            webcamKey: webcamRecording.file_path,
            layout: layout,
            outputKey: `composed/${Date.now()}-${uuidv4()}.webm`
          });

          // Update the screen recording with the composed video
          await VideoRecording.update(screenRecording.id, {
            file_path: composedVideoKey,
            recording_type: 'both',
            title: metadata.title || 'Screen + Webcam Recording',
            metadata: {
              ...metadata.metadata,
              composition: {
                layout: layout,
                screen_recording_id: screenRecording.id,
                webcam_recording_id: webcamRecording.id,
                composed_at: new Date().toISOString()
              }
            }
          });

          // Delete the individual webcam recording from database and S3
          await VideoRecording.delete(webcamRecording.id, userId);
          await this.deleteFromS3(webcamRecording.file_path);

          console.log('✅ Dual-stream composition completed successfully');
          
          // Return the updated screen recording (now contains composed video)
          return await VideoRecording.findById(screenRecording.id, userId);

        } catch (compositionError) {
          console.error('❌ Video composition failed:', compositionError);
          console.log('⚠️ Falling back to screen recording only');
          
          // Delete the webcam recording from database and S3
          await VideoRecording.delete(webcamRecording.id, userId);
          await this.deleteFromS3(webcamRecording.file_path);
          
          // Return the screen recording as fallback
          return screenRecording;
        }
      }

      // If no webcam file, return the screen recording
      return screenRecording;

    } catch (error) {
      console.error('❌ Error processing dual-stream upload:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        userId: userId,
        files: Object.keys(files || {})
      });
      throw error;
    }
  }

  // Delete video from S3
  static async deleteFromS3(s3Key) {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key
      };

      await s3Client.send(new DeleteObjectCommand(params));
      return true;
    } catch (error) {
      console.error('Error deleting from S3:', error);
      return false;
    }
  }

  // Get signed URL for private videos
  static async getSignedUrl(s3Key, expiresIn = 3600) {
    try {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });
      
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Track video view
  static async trackView(videoId, viewerData) {
    try {
      const viewerId = viewerData.viewer_id || await VideoView.generateViewerId();
      
      const view = await VideoView.create({
        video_id: videoId,
        viewer_id: viewerId,
        viewer_email: viewerData.viewer_email,
        viewer_ip: viewerData.viewer_ip,
        user_agent: viewerData.user_agent,
        watch_duration: viewerData.watch_duration || 0,
        watch_percentage: viewerData.watch_percentage || 0,
        engagement_data: viewerData.engagement_data || {}
      });

      return view;
    } catch (error) {
      console.error('Error tracking view:', error);
      throw error;
    }
  }

  // Update view with watch progress
  static async updateViewProgress(viewId, progressData) {
    try {
      await VideoView.updateView(viewId, {
        watch_duration: progressData.watch_duration,
        watch_percentage: progressData.watch_percentage,
        engagement_data: JSON.stringify(progressData.engagement_data || {})
      });

      return true;
    } catch (error) {
      console.error('Error updating view progress:', error);
      throw error;
    }
  }

  // Get video analytics
  static async getVideoAnalytics(videoId, userId) {
    try {
      const [analytics, views, heatmap, topViewers] = await Promise.all([
        VideoRecording.getAnalytics(videoId, userId),
        VideoView.findByVideoId(videoId, { limit: 100 }),
        VideoView.getEngagementHeatmap(videoId),
        VideoView.getTopViewers(videoId, 10)
      ]);

      return {
        analytics,
        recent_views: views,
        engagement_heatmap: heatmap,
        top_viewers: topViewers
      };
    } catch (error) {
      console.error('Error getting video analytics:', error);
      throw error;
    }
  }
}

module.exports = VideoService;
