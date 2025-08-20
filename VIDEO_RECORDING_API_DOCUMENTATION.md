# Video Recording API Documentation

Complete API documentation for the video recording feature including screen recording, webcam overlay, video storage, playback, and analytics.

## 🎯 Features Overview

- **Screen Recording**: Record browser tab, entire screen, or app window
- **Webcam Overlay**: Optional small bubble overlay during recording
- **Audio Recording**: Include microphone audio
- **Video Storage**: Cloud storage with shareable links
- **Analytics Dashboard**: View tracking, engagement heatmaps, viewer insights
- **Custom Player**: Branded video player with analytics tracking

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📹 Video Recording Endpoints

### 1. Upload Video Recording
**POST** `/api/videos/upload`

Upload a recorded video file with metadata.

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN
```

**Form Data:**
- `video` (file) - Video file (MP4, WebM, AVI, MOV)
- `title` (string) - Video title
- `description` (string, optional) - Video description
- `is_public` (boolean) - Make video publicly accessible
- `recording_type` (string) - 'screen', 'webcam', or 'both'
- `metadata` (JSON string, optional) - Additional metadata

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@recording.webm" \
  -F "title=My Screen Recording" \
  -F "description=Demo of the new feature" \
  -F "is_public=true" \
  -F "recording_type=screen" \
  -F "metadata={\"resolution\":\"1920x1080\",\"frameRate\":30}"
```

**Response:**
```json
{
  "message": "Video uploaded successfully",
  "recording": {
    "id": 1,
    "title": "My Screen Recording",
    "shareable_id": "abc123def456",
    "shareable_url": "https://rankandrenttool.com/v/abc123def456",
    "thumbnail_url": "https://s3.amazonaws.com/bucket/thumb.jpg",
    "duration": 120,
    "file_size": 5242880,
    "created_at": "2024-01-20T10:30:00Z"
  }
}
```

### 2. Get User's Video Recordings
**GET** `/api/videos/recordings`

Get all video recordings for the authenticated user.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `sort_by` (string, default: 'created_at') - Sort field
- `sort_dir` (string, default: 'DESC') - Sort direction

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/videos/recordings?page=1&limit=20&sort_by=created_at&sort_dir=DESC"
```

**Response:**
```json
{
  "recordings": [
    {
      "id": 1,
      "title": "My Screen Recording",
      "description": "Demo of the new feature",
      "file_path": "https://s3.amazonaws.com/bucket/video.mp4",
      "thumbnail_path": "https://s3.amazonaws.com/bucket/thumb.jpg",
      "duration": 120,
      "file_size": 5242880,
      "recording_type": "screen",
      "shareable_id": "abc123def456",
      "shareable_url": "https://rankandrenttool.com/v/abc123def456",
      "is_public": true,
      "view_count": 5,
      "unique_viewers": 3,
      "created_at": "2024-01-20T10:30:00Z",
      "updated_at": "2024-01-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### 3. Get Specific Video Recording
**GET** `/api/videos/recordings/:id`

Get details of a specific video recording.

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/videos/recordings/1
```

**Response:**
```json
{
  "id": 1,
  "title": "My Screen Recording",
  "description": "Demo of the new feature",
  "file_path": "https://s3.amazonaws.com/bucket/video.mp4",
  "thumbnail_path": "https://s3.amazonaws.com/bucket/thumb.jpg",
  "duration": 120,
  "file_size": 5242880,
  "recording_type": "screen",
  "shareable_id": "abc123def456",
  "shareable_url": "https://rankandrenttool.com/v/abc123def456",
  "is_public": true,
  "metadata": {
    "resolution": "1920x1080",
    "frameRate": 30
  },
  "created_at": "2024-01-20T10:30:00Z",
  "updated_at": "2024-01-20T10:30:00Z"
}
```

### 4. Update Video Recording
**PUT** `/api/videos/recordings/:id`

Update video recording metadata.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "is_public": false
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:3000/api/videos/recordings/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "Updated description",
    "is_public": false
  }'
```

**Response:**
```json
{
  "message": "Recording updated successfully",
  "recording": {
    "id": 1,
    "title": "Updated Title",
    "description": "Updated description",
    "is_public": false,
    "updated_at": "2024-01-20T11:00:00Z"
  }
}
```

### 5. Delete Video Recording
**DELETE** `/api/videos/recordings/:id`

Delete a video recording and its associated files from S3.

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/videos/recordings/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "message": "Recording deleted successfully"
}
```

## 🌐 Public Video Endpoints

### 6. Public Video View
**GET** `/api/videos/v/:shareableId`

Get public video information for viewing.

**Query Parameters:**
- `email` (string, optional) - Viewer's email for tracking

**Example Request:**
```bash
curl "http://localhost:3000/api/videos/v/abc123def456?email=viewer@example.com"
```

**Response:**
```json
{
  "recording": {
    "id": 1,
    "title": "My Screen Recording",
    "description": "Demo of the new feature",
    "video_url": "https://s3.amazonaws.com/bucket/video.mp4",
    "thumbnail_url": "https://s3.amazonaws.com/bucket/thumb.jpg",
    "duration": 120,
    "created_at": "2024-01-20T10:30:00Z",
    "user_name": "John Doe"
  },
  "view_id": 1,
  "viewer_id": "viewer123456789"
}
```

### 7. Track Video Progress
**POST** `/api/videos/track-progress`

Track viewer's progress through the video.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "view_id": 1,
  "watch_duration": 60,
  "watch_percentage": 50.0,
  "engagement_data": {
    "volume": 0.8,
    "playing": true,
    "timestamp": 1642672800000
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/videos/track-progress \
  -H "Content-Type: application/json" \
  -d '{
    "view_id": 1,
    "watch_duration": 60,
    "watch_percentage": 50.0,
    "engagement_data": {
      "volume": 0.8,
      "playing": true,
      "timestamp": 1642672800000
    }
  }'
```

**Response:**
```json
{
  "message": "Progress tracked successfully"
}
```

## 📊 Analytics Endpoints

### 8. Get Video Analytics
**GET** `/api/videos/recordings/:id/analytics`

Get comprehensive analytics for a video.

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/videos/recordings/1/analytics
```

**Response:**
```json
{
  "analytics": {
    "id": 1,
    "title": "My Screen Recording",
    "duration": 120,
    "total_views": 15,
    "unique_viewers": 8,
    "avg_watch_percentage": 65.5,
    "avg_watch_duration": 78.3,
    "first_view": "2024-01-20T10:30:00Z",
    "last_view": "2024-01-20T15:45:00Z"
  },
  "recent_views": [
    {
      "id": 1,
      "viewer_email": "viewer@example.com",
      "watch_percentage": 85.0,
      "watch_duration": 102,
      "created_at": "2024-01-20T15:45:00Z"
    }
  ],
  "engagement_heatmap": [
    {
      "watch_percentage": 10,
      "viewer_count": 3
    },
    {
      "watch_percentage": 20,
      "viewer_count": 5
    }
  ],
  "top_viewers": [
    {
      "viewer_email": "viewer@example.com",
      "view_count": 3,
      "avg_watch_percentage": 85.0,
      "best_watch_percentage": 95.0,
      "last_view": "2024-01-20T15:45:00Z"
    }
  ]
}
```

### 9. Get Video Views
**GET** `/api/videos/recordings/:id/views`

Get detailed view data for a video.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Items per page

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/videos/recordings/1/views?page=1&limit=20"
```

**Response:**
```json
{
  "views": [
    {
      "id": 1,
      "viewer_email": "viewer@example.com",
      "viewer_ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "watch_percentage": 85.0,
      "watch_duration": 102,
      "engagement_data": {
        "volume": 0.8,
        "playing": true
      },
      "created_at": "2024-01-20T15:45:00Z"
    }
  ]
}
```

### 10. Get Viewer Stats
**GET** `/api/videos/recordings/:id/stats`

Get aggregated viewer statistics.

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/videos/recordings/1/stats
```

**Response:**
```json
{
  "total_views": 15,
  "unique_viewers": 8,
  "unique_emails": 5,
  "avg_watch_percentage": 65.5,
  "avg_watch_duration": 78.3,
  "first_view": "2024-01-20T10:30:00Z",
  "last_view": "2024-01-20T15:45:00Z"
}
```

### 11. Get Engagement Heatmap
**GET** `/api/videos/recordings/:id/heatmap`

Get engagement data showing where viewers drop off.

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/videos/recordings/1/heatmap
```

**Response:**
```json
{
  "heatmap": [
    {
      "watch_percentage": 10,
      "viewer_count": 3
    },
    {
      "watch_percentage": 20,
      "viewer_count": 5
    },
    {
      "watch_percentage": 30,
      "viewer_count": 4
    }
  ]
}
```

### 12. Get Top Viewers
**GET** `/api/videos/recordings/:id/top-viewers`

Get list of top viewers by engagement.

**Query Parameters:**
- `limit` (number, default: 10) - Number of viewers to return

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/videos/recordings/1/top-viewers?limit=5"
```

**Response:**
```json
{
  "top_viewers": [
    {
      "viewer_email": "viewer@example.com",
      "view_count": 3,
      "avg_watch_percentage": 85.0,
      "best_watch_percentage": 95.0,
      "last_view": "2024-01-20T15:45:00Z"
    }
  ]
}
```

### 13. Get Signed URL for Private Videos
**GET** `/api/videos/recordings/:id/signed-url`

Get a signed URL for accessing private videos.

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/videos/recordings/1/signed-url
```

**Response:**
```json
{
  "signed_url": "https://s3.amazonaws.com/bucket/video.mp4?X-Amz-Algorithm=..."
}
```

## 🔧 Frontend Integration

### Video Recording Flow

1. **Start Recording**: Use MediaRecorder API to capture screen/webcam
2. **Store Temporarily**: Save video blob to localStorage or IndexedDB
3. **Upload**: Send to `/api/videos/upload` endpoint
4. **Track Progress**: Use `/api/videos/track-progress` during playback
5. **View Analytics**: Access analytics via `/api/videos/recordings/:id/analytics`

### Example Frontend Code

```javascript
// Store video blob temporarily
const storeVideoBlob = (blob) => {
  const reader = new FileReader();
  reader.onload = () => {
    localStorage.setItem('tempVideoData', reader.result);
    localStorage.setItem('tempVideoMetadata', JSON.stringify({
      title: 'My Recording',
      recordingType: 'screen',
      timestamp: Date.now()
    }));
  };
  reader.readAsDataURL(blob);
};

// Upload video
const uploadVideo = async (blob, metadata) => {
  const formData = new FormData();
  formData.append('video', blob, 'recording.webm');
  formData.append('title', metadata.title);
  formData.append('is_public', 'true');
  formData.append('recording_type', metadata.recordingType);
  
  const response = await fetch('/api/videos/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });
  
  return response.json();
};
```

## 🚀 Complete Implementation

The video recording API provides:

- ✅ **Screen/Webcam Recording** with MediaRecorder API
- ✅ **Cloud Storage** with AWS S3
- ✅ **Shareable Links** with branded URLs
- ✅ **Analytics Tracking** with detailed insights
- ✅ **Public/Private Videos** with access control
- ✅ **Thumbnail Generation** with FFmpeg
- ✅ **Progress Tracking** with real-time updates
- ✅ **Engagement Heatmaps** showing drop-off points
- ✅ **Viewer Analytics** with email capture

## 📱 Mobile Support

All endpoints are mobile-responsive and support:
- Touch-friendly video controls
- Mobile screen recording
- Responsive analytics dashboard
- Cross-platform compatibility

## 🔒 Security Features

- JWT authentication for protected endpoints
- User-specific data isolation
- S3 signed URLs for private videos
- Rate limiting and file size restrictions
- Secure file upload validation

This API provides a complete video recording solution ready for production use!
