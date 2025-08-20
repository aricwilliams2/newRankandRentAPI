const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const VideoRecording = require('../models/VideoRecording');
const VideoView = require('../models/VideoView');

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
      const allowedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only video files are allowed.'), false);
      }
    };

    return multer({
      storage: multer.memoryStorage(), // Use memory storage for better multipart handling
      fileFilter: fileFilter,
      limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
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
        // Removed ACL: 'public-read' to avoid bucket ACL issues
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
      console.log('Processing video upload for user:', userId);
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${uuidv4()}${fileExtension}`;
      const tempPath = path.join(__dirname, '..', 'uploads', 'temp', fileName);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      
      // Write buffer to temp file (since we're using memory storage)
      await fs.writeFile(tempPath, file.buffer);
      
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
      const s3Result = await this.uploadToS3(tempPath, fileName, file.mimetype);
      
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
      
      return recording;
    } catch (error) {
      console.error('Error processing video upload:', error);
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
