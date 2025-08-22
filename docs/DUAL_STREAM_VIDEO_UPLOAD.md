# Backend Dual-Stream Video Upload Support

## Overview

The backend now supports dual-stream recording for "Screen + Webcam" mode to avoid browser throttling issues. Instead of real-time canvas compositing, the frontend records two separate streams and uploads both files for server-side composition using FFmpeg.

## Features

- **Dual-stream uploads** - Accept both screen and webcam recordings
- **Server-side composition** - Use FFmpeg for high-quality video overlay
- **Multiple layouts** - Support for 5 different overlay positions
- **Fallback handling** - Graceful degradation if composition fails
- **Comprehensive logging** - Detailed progress tracking throughout the process
- **Backward compatibility** - Existing single-file uploads continue to work

## API Endpoints

### 1. Single File Upload (Existing)
```
POST /api/videos/upload
Content-Type: multipart/form-data

Fields:
- video: Video file (required)
- title: Recording title (optional)
- description: Recording description (optional)
- recording_type: 'screen' | 'webcam' | 'both' (optional)
- is_public: 'true' | 'false' (optional)
- metadata: JSON string (optional)
```

### 2. Dual-Stream Upload (New)
```
POST /api/videos/upload-dual
Content-Type: multipart/form-data

Fields:
- video: Screen recording file (required)
- webcam: Webcam recording file (optional)
- title: Recording title (optional)
- description: Recording description (optional)
- recording_type: 'screen' | 'webcam' | 'both' (optional)
- layout: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center' (optional)
- is_public: 'true' | 'false' (optional)
- metadata: JSON string (optional)
```

## Supported Layouts

| Layout | Description | FFmpeg Filter |
|--------|-------------|---------------|
| `top-right` | Webcam in top-right corner (default) | `overlay=W-w-20:20` |
| `top-left` | Webcam in top-left corner | `overlay=20:20` |
| `bottom-right` | Webcam in bottom-right corner | `overlay=W-w-20:H-h-20` |
| `bottom-left` | Webcam in bottom-left corner | `overlay=20:H-h-20` |
| `center` | Webcam centered on screen | `overlay=(W-w)/2:(H-h)/2` |

## Implementation Details

### 1. VideoService Updates

**Enhanced File Filter:**
```javascript
// Now includes fieldname logging for dual-stream support
console.log('File upload attempt:', {
  originalname: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
  fieldname: file.fieldname  // New field
});
```

**New Dual-Stream Processing Method:**
```javascript
static async processDualStreamUpload(files, userId, metadata = {}) {
  // Process screen recording first
  const screenRecording = await this.processVideoUpload(screenFile, userId, {
    ...metadata,
    recording_type: 'screen'
  });

  // If webcam exists, compose videos
  if (webcamFile) {
    const webcamRecording = await this.processVideoUpload(webcamFile, userId, {
      ...metadata,
      recording_type: 'webcam'
    });

    // Compose using VideoCompositionService
    const composedVideoKey = await compositionService.composeVideoOverlay({
      screenKey: screenRecording.file_path,
      webcamKey: webcamRecording.file_path,
      layout: metadata.layout || 'top-right',
      outputKey: `composed/${Date.now()}-${uuidv4()}.webm`
    });

    // Update database and cleanup
    await VideoRecording.update(screenRecording.id, {
      file_path: composedVideoKey,
      recording_type: 'both'
    });
    await VideoRecording.destroy(webcamRecording.id);
    await this.deleteFromS3(webcamRecording.file_path);
  }

  return screenRecording;
}
```

### 2. VideoCompositionService

**Core Composition Method:**
```javascript
async composeVideoOverlay({ screenKey, webcamKey, layout, outputKey }) {
  // Download files from S3
  await this.downloadFromS3(screenKey, screenPath);
  await this.downloadFromS3(webcamKey, webcamPath);

  // Compose with FFmpeg
  await this.composeWithFFmpeg(screenPath, webcamPath, outputPath, layout);

  // Upload composed file to S3
  await this.uploadToS3(outputPath, outputKey);

  return outputKey;
}
```

**FFmpeg Configuration:**
```javascript
ffmpeg()
  .input(screenPath)
  .input(webcamPath)
  .complexFilter(filterComplex)
  .outputOptions([
    '-c:a copy',           // Copy audio from screen recording
    '-c:v libvpx-vp9',     // Use VP9 for better compression
    '-b:v 8M',             // 8 Mbps video bitrate
    '-crf 23',             // Constant rate factor for quality
    '-deadline good',      // Encoding speed vs quality balance
    '-cpu-used 2'          // CPU usage for encoding
  ])
  .output(outputPath)
```

### 3. Route Updates

**New Dual-Stream Endpoint:**
```javascript
router.post('/upload-dual', authenticate, 
  VideoService.getDualStreamUploadMiddleware().fields([
    { name: 'video', maxCount: 1 },    // Main screen recording
    { name: 'webcam', maxCount: 1 }    // Webcam overlay (optional)
  ]), 
  async (req, res) => {
    // Process dual-stream upload
    const recording = await VideoService.processDualStreamUpload(files, req.user.id, {
      title: body.title,
      description: body.description,
      layout: body.layout || 'top-right',
      // ... other metadata
    });
  }
);
```

## Error Handling

### 1. Composition Failures
If video composition fails, the system gracefully falls back to the screen recording:

```javascript
try {
  const composedVideoKey = await compositionService.composeVideoOverlay({...});
  // Update with composed video
} catch (compositionError) {
  console.error('❌ Video composition failed:', compositionError);
  console.log('⚠️ Falling back to screen recording only');
  
  // Clean up webcam recording
  await VideoRecording.destroy(webcamRecording.id);
  await this.deleteFromS3(webcamRecording.file_path);
  
  // Return screen recording as fallback
  return screenRecording;
}
```

### 2. FFmpeg Validation
The service validates FFmpeg availability:

```javascript
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
```

## File Management

### 1. Temporary Files
- Temporary files are created in `./temp/` directory
- Unique filenames using UUID to prevent conflicts
- Automatic cleanup after composition

### 2. S3 Storage
- Individual recordings stored temporarily
- Composed video replaces screen recording
- Webcam recording deleted after composition
- Cleanup of temporary S3 objects

## Performance Considerations

### 1. File Size Limits
- **Per file limit:** 500MB
- **Total upload limit:** 1GB (2 × 500MB)
- **Memory storage** for better multipart handling

### 2. FFmpeg Optimization
- **VP9 codec** for better compression
- **8 Mbps bitrate** for quality/size balance
- **CRF 23** for consistent quality
- **Good deadline** for speed/quality balance

### 3. Processing Time
- **Download:** ~30-60 seconds per GB
- **Composition:** ~2-5 minutes for 10-minute video
- **Upload:** ~30-60 seconds per GB
- **Total:** ~5-10 minutes for typical recordings

## Testing

### 1. Single File Upload Test
```bash
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@screen-recording.webm" \
  -F "title=Test Recording" \
  -F "recording_type=screen"
```

### 2. Dual-Stream Upload Test
```bash
curl -X POST http://localhost:3000/api/videos/upload-dual \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@screen-recording.webm" \
  -F "webcam=@webcam-recording.webm" \
  -F "title=Test Dual Recording" \
  -F "recording_type=both" \
  -F "layout=top-right"
```

### 3. Expected Response
```json
{
  "message": "Dual-stream video composed and uploaded successfully",
  "recording": {
    "id": 123,
    "title": "Test Dual Recording",
    "file_path": "composed/1234567890-uuid.webm",
    "recording_type": "both",
    "duration": 600,
    "file_size": 52428800,
    "shareable_id": "abc123def456",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "composition": {
    "layout": "top-right",
    "status": "completed"
  }
}
```

## Dependencies

### 1. Required Packages
```json
{
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2",
    "@aws-sdk/client-s3": "^3.0.0",
    "multer": "^1.4.5",
    "uuid": "^9.0.0"
  }
}
```

### 2. FFmpeg Installation
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### 3. Environment Variables
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-video-bucket
```

## Monitoring and Logging

### 1. Upload Process Logs
```
🎬🎥 Dual-stream upload request received
📁 Files received: { video: 'screen.webm', webcam: 'webcam.webm', totalFiles: 2 }
📺 Processing screen recording...
📹 Processing webcam recording...
🎬 Composing dual-stream video...
📥 Downloading files from S3...
🎬 Composing video with FFmpeg...
📤 Uploading composed video to S3...
✅ Video composition completed successfully
🧹 Cleaning up temporary files...
```

### 2. FFmpeg Progress Logs
```
🎬 FFmpeg command: ffmpeg -i screen.webm -i webcam.webm -filter_complex ...
🎬 FFmpeg progress: { percent: 25, timemark: '00:02:30', fps: 30 }
🎬 FFmpeg progress: { percent: 50, timemark: '00:05:00', fps: 30 }
🎬 FFmpeg progress: { percent: 75, timemark: '00:07:30', fps: 30 }
✅ FFmpeg composition completed successfully
```

## Troubleshooting

### 1. Common Issues

**FFmpeg not found:**
```bash
# Check FFmpeg installation
ffmpeg -version

# Install if missing
sudo apt install ffmpeg  # Ubuntu/Debian
```

**S3 permissions:**
```bash
# Verify AWS credentials
aws s3 ls s3://your-bucket-name
```

**Memory issues:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js
```

### 2. Debug Mode
Enable detailed logging by setting:
```env
DEBUG=ffmpeg:*
NODE_ENV=development
```

### 3. Performance Tuning
For high-volume processing:
- Use dedicated video processing servers
- Implement queue system for composition jobs
- Use GPU acceleration if available
- Optimize FFmpeg parameters for your use case

## Migration Notes

- **Backward compatible** - Existing single-file uploads work unchanged
- **Database schema** - No changes required
- **Frontend integration** - Use new `/upload-dual` endpoint for dual-stream
- **Gradual rollout** - Can be deployed alongside existing upload endpoint

## Benefits

1. **No browser throttling** - Screen recording continues when switching windows
2. **Better quality** - Server-side composition with FFmpeg
3. **Reliable** - No canvas/requestAnimationFrame dependencies
4. **Flexible** - Multiple overlay positions supported
5. **Scalable** - Composition happens on server, not client
6. **Robust** - Graceful fallback if composition fails

This implementation provides a complete solution for dual-stream video recording with server-side composition, offering better performance and reliability compared to client-side canvas compositing.
