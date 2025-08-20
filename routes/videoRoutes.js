const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const VideoService = require('../services/VideoService');
const VideoRecording = require('../models/VideoRecording');
const VideoView = require('../models/VideoView');
const path = require('path');
const fs = require('fs').promises;

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../uploads/temp');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

ensureUploadsDir();

// Upload video recording
router.post('/upload', authenticate, VideoService.getUploadMiddleware().single('video'), async (req, res) => {
  try {
    console.log('📹 Video upload request received');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('User ID:', req.user?.id);
    
    // SAFELY access body and file after Multer has processed them
    const body = req.body || {};
    const file = req.file || null;
    
    console.log('Body fields:', Object.keys(body));
    console.log('File meta:', file && {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    console.log('📹 Processing video upload...');
    console.log('File:', file?.originalname, 'Size:', file?.size);
    console.log('Form data received:', {
      title: body.title,
      description: body.description,
      recording_type: body.recording_type,
      is_public: body.is_public
    });

    // Validate that a file was uploaded
    if (!file) {
      return res.status(400).json({
        error: 'No video file provided',
        details: 'Please include a video file with the field name "video"'
      });
    }

    // Check if AWS S3 is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('⚠️ AWS S3 not configured, using local storage for testing');
      
      // Create a simple response for testing without S3
      const testRecording = {
        id: Date.now(),
        title: body.title || 'Test Recording',
        description: body.description || '',
        file_path: `/uploads/${file.originalname}`,
        file_size: file.size,
        duration: 0, // Will be calculated if FFmpeg is available
        recording_type: body.recording_type || 'screen',
        shareable_id: Math.random().toString(36).substring(2, 15),
        is_public: body.is_public === 'true',
        created_at: new Date().toISOString(),
        shareable_url: `http://localhost:3000/api/videos/v/${Math.random().toString(36).substring(2, 15)}`
      };

      return res.status(200).json({
        message: 'Video uploaded successfully (local storage - S3 not configured)',
        recording: testRecording
      });
    }

    // Original S3 upload logic
    const recording = await VideoService.processVideoUpload(file, req.user.id, {
      title: body.title || 'Untitled Recording',
      description: body.description || '',
      is_public: body.is_public === 'true',
      recording_type: body.recording_type || 'screen',
      metadata: body.metadata ? JSON.parse(body.metadata) : {}
    });

    res.status(201).json({
      message: 'Video uploaded successfully',
      recording
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload video',
      details: error.message 
    });
  }
});

// Get user's video recordings
router.get('/recordings', authenticate, async (req, res) => {
  try {
    // Ensure numeric types and provide safe defaults
    const userId = Number(req.user.id);
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit ?? '10', 10))); // Max 100 per page
    const sort_by = req.query.sort_by || 'created_at';
    const sort_dir = req.query.sort_dir || 'DESC';
    
    console.log('[recordings] Request params:', { userId, page, limit, sort_by, sort_dir });
    console.log('[recordings] Types:', { userId: typeof userId, page: typeof page, limit: typeof limit });
    
    const recordings = await VideoRecording.findByUserId(userId, {
      page,
      limit,
      sort_by,
      sort_dir
    });

    res.json({
      recordings: recordings.map(recording => ({
        ...recording,
        shareable_url: `${process.env.FRONTEND_URL || 'https://rankandrenttool.com'}/v/${recording.shareable_id}`
      })),
      pagination: {
        page,
        limit,
        total: recordings.length,
        has_more: recordings.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recordings',
      details: error.message 
    });
  }
});

// Get specific video recording
router.get('/recordings/:id', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    res.json({
      ...recording,
      shareable_url: `${process.env.FRONTEND_URL || 'https://rankandrenttool.com'}/v/${recording.shareable_id}`
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

// Update video recording
router.put('/recordings/:id', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      is_public: req.body.is_public
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const success = await VideoRecording.update(req.params.id, updateData);
    
    if (success) {
      const updatedRecording = await VideoRecording.findById(req.params.id, req.user.id);
      res.json({
        message: 'Recording updated successfully',
        recording: updatedRecording
      });
    } else {
      res.status(500).json({ error: 'Failed to update recording' });
    }
  } catch (error) {
    console.error('Error updating recording:', error);
    res.status(500).json({ error: 'Failed to update recording' });
  }
});

// Delete video recording
router.delete('/recordings/:id', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    // Delete from S3 if metadata contains S3 keys
    if (recording.metadata && recording.metadata.s3_key) {
      try {
        await VideoService.deleteFromS3(recording.metadata.s3_key);
        if (recording.metadata.thumbnail_s3_key) {
          await VideoService.deleteFromS3(recording.metadata.thumbnail_s3_key);
        }
      } catch (s3Error) {
        console.error('Error deleting from S3:', s3Error);
      }
    }

    const success = await VideoRecording.delete(req.params.id, req.user.id);
    
    if (success) {
      res.json({ message: 'Recording deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete recording' });
    }
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

// Public video viewing endpoint
router.get('/v/:shareableId', async (req, res) => {
  try {
    const recording = await VideoRecording.findByShareableId(req.params.shareableId);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video not found or not public' });
    }

    // Track view
    const viewerData = {
      viewer_ip: req.ip,
      user_agent: req.get('User-Agent'),
      viewer_email: req.query.email || null
    };

    const view = await VideoService.trackView(recording.id, viewerData);

    res.json({
      recording: {
        id: recording.id,
        title: recording.title,
        description: recording.description,
        video_url: recording.file_path,
        thumbnail_url: recording.thumbnail_path,
        duration: recording.duration,
        created_at: recording.created_at,
        user_name: recording.user_name
      },
      view_id: view.id,
      viewer_id: view.viewer_id
    });
  } catch (error) {
    console.error('Error fetching public video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Track video view progress
router.post('/track-progress', async (req, res) => {
  try {
    const { view_id, watch_duration, watch_percentage, engagement_data } = req.body;

    if (!view_id) {
      return res.status(400).json({ error: 'view_id is required' });
    }

    await VideoService.updateViewProgress(view_id, {
      watch_duration,
      watch_percentage,
      engagement_data
    });

    res.json({ message: 'Progress tracked successfully' });
  } catch (error) {
    console.error('Error tracking progress:', error);
    res.status(500).json({ error: 'Failed to track progress' });
  }
});

// Get video analytics
router.get('/recordings/:id/analytics', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    const analytics = await VideoService.getVideoAnalytics(req.params.id, req.user.id);

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get video views
router.get('/recordings/:id/views', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    const { page = 1, limit = 50 } = req.query;
    const views = await VideoView.findByVideoId(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({ views });
  } catch (error) {
    console.error('Error fetching views:', error);
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

// Get viewer stats
router.get('/recordings/:id/stats', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    const stats = await VideoView.getViewerStats(req.params.id);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get engagement heatmap
router.get('/recordings/:id/heatmap', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    const heatmap = await VideoView.getEngagementHeatmap(req.params.id);

    res.json({ heatmap });
  } catch (error) {
    console.error('Error fetching heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

// Get top viewers
router.get('/recordings/:id/top-viewers', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    const { limit = 10 } = req.query;
    const topViewers = await VideoView.getTopViewers(req.params.id, parseInt(limit));

    res.json({ top_viewers: topViewers });
  } catch (error) {
    console.error('Error fetching top viewers:', error);
    res.status(500).json({ error: 'Failed to fetch top viewers' });
  }
});

// Generate signed URL for private videos
router.get('/recordings/:id/signed-url', authenticate, async (req, res) => {
  try {
    const recording = await VideoRecording.findById(req.params.id, req.user.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Video recording not found' });
    }

    if (!recording.metadata || !recording.metadata.s3_key) {
      return res.status(400).json({ error: 'Video file not found in storage' });
    }

    const signedUrl = await VideoService.getSignedUrl(recording.metadata.s3_key);

    res.json({ signed_url: signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

module.exports = router;
