# Frontend Integration Guide for Video Recording API

## 🎯 Quick Start - Make Your First API Call

### 1. **Get User's Video Recordings**
```javascript
// Get all recordings for the current user
const getRecordings = async () => {
  try {
    const response = await fetch('/api/videos/recordings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Recordings:', data.recordings);
      return data.recordings;
    } else {
      throw new Error('Failed to fetch recordings');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2. **Upload a Video Recording**
```javascript
// Upload a video file
const uploadVideo = async (videoFile, title, description = '') => {
  try {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('is_public', 'true');
    formData.append('recording_type', 'screen');

    const response = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Upload successful:', data.recording);
      return data.recording;
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
  }
};
```

### 3. **Get Video Analytics**
```javascript
// Get analytics for a specific video
const getVideoAnalytics = async (videoId) => {
  try {
    const response = await fetch(`/api/videos/recordings/${videoId}/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Analytics:', data);
      return data;
    } else {
      throw new Error('Failed to fetch analytics');
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
};
```

## 🔧 Complete Frontend Integration Examples

### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const VideoLibrary = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos/recordings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings);
      } else {
        setError('Failed to fetch recordings');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', 'My Recording');
      formData.append('is_public', 'true');
      formData.append('recording_type', 'screen');

      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        fetchRecordings(); // Refresh the list
      } else {
        setError('Upload failed');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Video Library</h2>
      
      <div>
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileUpload}
        />
      </div>

      <div>
        {recordings.map(recording => (
          <div key={recording.id}>
            <h3>{recording.title}</h3>
            <p>{recording.description}</p>
            <p>Duration: {recording.duration}s</p>
            <p>Views: {recording.view_count}</p>
            <a href={recording.shareable_url} target="_blank">
              View Video
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoLibrary;
```

### Vanilla JavaScript Example
```html
<!DOCTYPE html>
<html>
<head>
    <title>Video Recording API Test</title>
</head>
<body>
    <h1>Video Recording API Test</h1>
    
    <div>
        <input type="file" id="videoFile" accept="video/*">
        <button onclick="uploadVideo()">Upload Video</button>
    </div>
    
    <div>
        <button onclick="getRecordings()">Get Recordings</button>
        <div id="recordingsList"></div>
    </div>

    <script>
        // Get recordings
        async function getRecordings() {
            try {
                const response = await fetch('/api/videos/recordings', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    displayRecordings(data.recordings);
                } else {
                    alert('Failed to fetch recordings');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error fetching recordings');
            }
        }

        // Display recordings
        function displayRecordings(recordings) {
            const container = document.getElementById('recordingsList');
            container.innerHTML = '';
            
            recordings.forEach(recording => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <h3>${recording.title}</h3>
                    <p>${recording.description || 'No description'}</p>
                    <p>Duration: ${recording.duration}s</p>
                    <p>Views: ${recording.view_count || 0}</p>
                    <a href="${recording.shareable_url}" target="_blank">View Video</a>
                `;
                container.appendChild(div);
            });
        }

        // Upload video
        async function uploadVideo() {
            const fileInput = document.getElementById('videoFile');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select a video file');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('video', file);
                formData.append('title', 'Test Recording');
                formData.append('is_public', 'true');
                formData.append('recording_type', 'screen');

                const response = await fetch('/api/videos/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    alert('Upload successful!');
                    getRecordings(); // Refresh the list
                } else {
                    alert('Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload error: ' + error.message);
            }
        }

        // Load recordings on page load
        window.onload = function() {
            getRecordings();
        };
    </script>
</body>
</html>
```

## 🚀 API Endpoints Summary

### **Protected Endpoints (Require JWT Token)**
- `GET /api/videos/recordings` - Get user's recordings
- `GET /api/videos/recordings/:id` - Get specific recording
- `POST /api/videos/upload` - Upload video
- `PUT /api/videos/recordings/:id` - Update recording
- `DELETE /api/videos/recordings/:id` - Delete recording
- `GET /api/videos/recordings/:id/analytics` - Get analytics
- `GET /api/videos/recordings/:id/views` - Get views
- `GET /api/videos/recordings/:id/stats` - Get stats
- `GET /api/videos/recordings/:id/heatmap` - Get heatmap
- `GET /api/videos/recordings/:id/top-viewers` - Get top viewers

### **Public Endpoints (No Token Required)**
- `GET /api/videos/v/:shareableId` - View public video
- `POST /api/videos/track-progress` - Track viewing progress

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:
```javascript
headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

## 📝 Common Issues & Solutions

### 1. **CORS Issues**
If you get CORS errors, make sure your server has CORS enabled:
```javascript
// In your server.js
app.use(cors({
    origin: 'http://localhost:3000', // Your frontend URL
    credentials: true
}));
```

### 2. **File Upload Issues**
- Make sure the file is a valid video format (MP4, WebM, AVI, MOV)
- Check file size limits
- Ensure FormData is used for file uploads

### 3. **Authentication Issues**
- Verify the JWT token is valid
- Check if the token is stored correctly in localStorage
- Ensure the token hasn't expired

### 4. **API Base URL**
If your frontend is on a different port/domain, update the fetch URLs:
```javascript
const API_BASE = 'http://localhost:3000/api';
const response = await fetch(`${API_BASE}/videos/recordings`, {
    // ... rest of the code
});
```

## 🧪 Testing Your Integration

1. **Test Authentication**: Make sure you can log in and get a token
2. **Test GET Request**: Try fetching recordings first
3. **Test File Upload**: Upload a small video file
4. **Test Analytics**: Check if analytics endpoints work

## 📱 Mobile Considerations

- Use `navigator.mediaDevices.getUserMedia()` for mobile recording
- Handle file size limits for mobile uploads
- Consider using `fetch` with progress tracking for large files

This guide should help you integrate the video recording API with any frontend framework!
