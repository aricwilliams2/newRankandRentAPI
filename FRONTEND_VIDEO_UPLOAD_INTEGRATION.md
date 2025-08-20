# Frontend Video Upload Integration Guide

Complete guide for integrating video recording with automatic upload to Amazon S3 via your API.

## 🎯 Quick Overview

Instead of downloading recorded videos, upload them to your API which will:
- ✅ Store videos in Amazon S3
- ✅ Generate shareable URLs
- ✅ Track analytics automatically
- ✅ Create thumbnails
- ✅ Provide engagement insights

## 📝 Prerequisites

1. **User Authentication**: User must be logged in with JWT token
2. **API Server**: Your Node.js server must be running
3. **AWS S3**: Credentials configured in your `.env` file
4. **Database**: Video tables created

## 🔧 Complete Frontend Integration

### 1. **Replace Download with Upload Function**

Replace your existing download functionality with this upload function:

```javascript
// Upload recorded video to API (replaces download)
const uploadRecordedVideo = async (videoBlob, title = 'My Recording', description = '') => {
  try {
    // Show upload progress
    const uploadStatus = document.getElementById('upload-status');
    if (uploadStatus) uploadStatus.textContent = 'Uploading video...';
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('video', videoBlob, 'recording.webm');
    formData.append('title', title);
    formData.append('description', description);
    formData.append('is_public', 'true');
    formData.append('recording_type', 'screen');

    // Get authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not authenticated. Please log in.');
    }

    // Upload to API
    const response = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      
      if (uploadStatus) uploadStatus.textContent = '✅ Upload successful!';
      
      console.log('Video uploaded successfully!');
      console.log('Share URL:', data.recording.shareable_url);
      console.log('Video ID:', data.recording.id);
      
      return data.recording;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
    const uploadStatus = document.getElementById('upload-status');
    if (uploadStatus) uploadStatus.textContent = '❌ Upload failed: ' + error.message;
    throw error;
  }
};
```

### 2. **Complete Recording Integration**

Here's how to integrate upload into your existing recording flow:

```javascript
// Complete video recording with upload integration
class VideoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
  }

  async startRecording() {
    try {
      // Request screen capture
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5 Mbps
      });

      this.chunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingComplete();
      };

      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('🎥 Recording started');
      this.updateUI('Recording... Click "Stop Recording" when done.');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.updateUI('❌ Failed to start recording: ' + error.message);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      this.updateUI('Processing recording...');
    }
  }

  async handleRecordingComplete() {
    try {
      // Create video blob
      const videoBlob = new Blob(this.chunks, { type: 'video/webm' });
      
      // Get title from user
      const title = prompt('Enter a title for your recording:') || 'My Recording';
      const description = prompt('Enter a description (optional):') || '';
      
      // Upload to API
      const recording = await uploadRecordedVideo(videoBlob, title, description);
      
      // Show success and share link
      this.showSuccessMessage(recording);
      
    } catch (error) {
      console.error('Failed to handle recording:', error);
      this.updateUI('❌ Failed to upload recording: ' + error.message);
    }
  }

  showSuccessMessage(recording) {
    const message = `
      🎉 Video uploaded successfully!
      
      Title: ${recording.title}
      Duration: ${recording.duration}s
      Share URL: ${recording.shareable_url}
      
      Click OK to open the video in a new tab.
    `;
    
    if (confirm(message)) {
      window.open(recording.shareable_url, '_blank');
    }
    
    this.updateUI('✅ Recording uploaded successfully!');
  }

  updateUI(message) {
    const statusElement = document.getElementById('recording-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }
}
```

### 3. **HTML Integration**

Add this HTML to your recording page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Recording & Upload</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .recording-controls {
            text-align: center;
            margin: 20px 0;
        }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .btn-danger {
            background: #dc3545;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .status {
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            text-align: center;
            font-weight: bold;
        }
        .preview {
            margin: 20px 0;
            text-align: center;
        }
        .preview video {
            max-width: 100%;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .upload-progress {
            margin: 20px 0;
            padding: 15px;
            background: #e9ecef;
            border-radius: 5px;
            display: none;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #dee2e6;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: #007bff;
            width: 0%;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎥 Screen Recording & Upload</h1>
        
        <div class="recording-controls">
            <button id="startBtn" class="btn" onclick="startRecording()">
                🎬 Start Recording
            </button>
            <button id="stopBtn" class="btn btn-danger" onclick="stopRecording()" disabled>
                ⏹️ Stop Recording
            </button>
        </div>
        
        <div id="recording-status" class="status">
            Ready to record. Click "Start Recording" to begin.
        </div>
        
        <div class="preview">
            <video id="preview" autoplay muted style="display: none;"></video>
        </div>
        
        <div id="upload-progress" class="upload-progress">
            <h3>Uploading Video...</h3>
            <div class="progress-bar">
                <div id="progress-fill" class="progress-fill"></div>
            </div>
            <p id="progress-text">0%</p>
        </div>
    </div>

    <script>
        // Initialize video recorder
        const recorder = new VideoRecorder();
        
        // Start recording function
        function startRecording() {
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            recorder.startRecording();
        }
        
        // Stop recording function
        function stopRecording() {
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            recorder.stopRecording();
        }
        
        // Check authentication on page load
        window.onload = function() {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to record videos.');
                // Redirect to login page or show login form
                // window.location.href = '/login';
            }
        };
    </script>
</body>
</html>
```

### 4. **Get User's Videos**

Add this to display all uploaded videos:

```javascript
// Get all user's videos
const getUserVideos = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/videos/recordings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.recordings;
    } else {
      throw new Error('Failed to fetch videos');
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

// Display videos in UI
const displayUserVideos = async () => {
  const videos = await getUserVideos();
  const container = document.getElementById('videos-container');
  
  if (videos.length === 0) {
    container.innerHTML = '<p>No videos uploaded yet.</p>';
    return;
  }
  
  let html = '<h2>Your Videos</h2>';
  videos.forEach(video => {
    html += `
      <div class="video-item" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3>${video.title}</h3>
        <p><strong>Duration:</strong> ${video.duration}s</p>
        <p><strong>Views:</strong> ${video.view_count || 0}</p>
        <p><strong>Created:</strong> ${new Date(video.created_at).toLocaleString()}</p>
        <a href="${video.shareable_url}" target="_blank" class="btn">View Video</a>
        <button onclick="getVideoAnalytics(${video.id})" class="btn">View Analytics</button>
      </div>
    `;
  });
  
  container.innerHTML = html;
};
```

### 5. **Get Video Analytics**

```javascript
// Get analytics for a specific video
const getVideoAnalytics = async (videoId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/videos/recordings/${videoId}/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      const analyticsText = `
        📊 Analytics for Video #${videoId}
        
        Total Views: ${data.analytics.total_views}
        Unique Viewers: ${data.analytics.unique_viewers}
        Average Watch Percentage: ${data.analytics.avg_watch_percentage}%
        Average Watch Duration: ${data.analytics.avg_watch_duration}s
        
        First View: ${data.analytics.first_view}
        Last View: ${data.analytics.last_view}
      `;
      
      alert(analyticsText);
      return data;
    } else {
      throw new Error('Failed to get analytics');
    }
  } catch (error) {
    console.error('Analytics error:', error);
    alert('Failed to get analytics: ' + error.message);
  }
};
```

### 6. **API Configuration**

Make sure your API base URL is correct:

```javascript
// Configure API base URL
const API_BASE = 'http://localhost:3000/api'; // Update this to your server URL

// Update all fetch calls to use API_BASE
const response = await fetch(`${API_BASE}/videos/upload`, {
  // ... rest of the code
});
```

## 🚀 Complete Integration Checklist

### ✅ **Frontend Setup**
- [ ] Replace download functionality with upload
- [ ] Add authentication check
- [ ] Configure API base URL
- [ ] Add error handling
- [ ] Add progress indicators

### ✅ **Backend Requirements**
- [ ] Server running on correct port
- [ ] CORS configured for your frontend domain
- [ ] AWS S3 credentials in `.env`
- [ ] Database tables created
- [ ] Video routes registered

### ✅ **Testing**
- [ ] Test authentication
- [ ] Test video recording
- [ ] Test upload to API
- [ ] Test shareable URL
- [ ] Test analytics

## 🔧 Common Issues & Solutions

### **CORS Errors**
```javascript
// In your server.js
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));
```

### **Authentication Errors**
- Check if JWT token exists in localStorage
- Verify token hasn't expired
- Ensure token is sent in Authorization header

### **Upload Failures**
- Check file size limits
- Verify video format (WebM, MP4, etc.)
- Check AWS S3 credentials
- Verify database connection

### **API URL Issues**
- Update `API_BASE` to match your server URL
- Check if server is running
- Verify port configuration

## 📱 Mobile Considerations

For mobile devices, use this modified recording setup:

```javascript
// Mobile-friendly recording setup
const startMobileRecording = async () => {
  try {
    // For mobile, use getUserMedia instead of getDisplayMedia
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    });
    
    // Rest of recording logic...
  } catch (error) {
    console.error('Mobile recording error:', error);
  }
};
```

## 🎯 What You Get

After integration, your videos will have:
- ✅ **Automatic S3 storage**
- ✅ **Shareable URLs** (e.g., `rankandrenttool.com/v/abc123`)
- ✅ **Analytics tracking** (views, watch time, engagement)
- ✅ **Thumbnail generation**
- ✅ **Public/private access control**
- ✅ **Mobile compatibility**

This complete integration will transform your video recording from local downloads to cloud-hosted, shareable videos with full analytics!
