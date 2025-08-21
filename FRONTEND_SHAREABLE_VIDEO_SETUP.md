# Frontend Shareable Video Setup Guide

## 🎯 Overview

Your API is working perfectly! The 404 error on `https://rankandrenttool.com/v/yFzvO4kv5lwF` is because your frontend doesn't have the route handler for shareable video URLs. This guide will help you set up the frontend to handle these URLs.

## ✅ API Status

- **API Endpoint**: `https://newrankandrentapi.onrender.com/api/videos/v/yFzvO4kv5lwF` ✅ Working
- **CORS**: ✅ Fixed and deployed
- **Video Upload**: ✅ Working with AWS S3
- **Database**: ✅ Records created successfully

## 🔧 Frontend Setup Required

### 1. Add Route Handler

Add this route to your React Router configuration:

```jsx
// App.jsx or your main router file
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoPlayer from './components/VideoPlayer';

function App() {
  return (
    <Router>
      <Routes>
        {/* Your existing routes */}
        <Route path="/v/:shareableId" element={<VideoPlayer />} />
        {/* Other routes */}
      </Routes>
    </Router>
  );
}
```

### 2. Create VideoPlayer Component

Create a new file `components/VideoPlayer.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function VideoPlayer() {
  const { shareableId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://newrankandrentapi.onrender.com/api/videos/v/${shareableId}`);
        
        if (!response.ok) {
          throw new Error('Video not found');
        }
        
        const data = await response.json();
        setVideo(data.recording);
      } catch (err) {
        console.error('Error loading video:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [shareableId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Video Not Found</h1>
          <p className="text-gray-600">The requested video could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Video Header */}
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{video.title}</h1>
          {video.description && (
            <p className="text-gray-600">{video.description}</p>
          )}
          <div className="flex items-center mt-4 text-sm text-gray-500">
            <span>Uploaded: {new Date(video.created_at).toLocaleDateString()}</span>
            {video.duration > 0 && (
              <span className="ml-4">Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
            )}
            {video.view_count > 0 && (
              <span className="ml-4">{video.view_count} views</span>
            )}
          </div>
        </div>

        {/* Video Player */}
        <div className="relative">
          <video 
            controls 
            className="w-full h-auto max-h-[70vh]"
            poster={video.thumbnail_url}
            preload="metadata"
          >
            <source src={video.video_url} type="video/webm" />
            <source src={video.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video Info */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">File Size:</span>
              <p className="text-gray-600">{(video.file_size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Type:</span>
              <p className="text-gray-600 capitalize">{video.recording_type}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Public:</span>
              <p className="text-gray-600">{video.is_public ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Shareable ID:</span>
              <p className="text-gray-600 font-mono text-xs">{video.shareable_id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
```

### 3. Update Shareable URL Generation

In your video library component, update how you generate shareable URLs:

```jsx
// In your VideoLibrary component
const generateShareableUrl = (shareableId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/v/${shareableId}`;
};

// Usage in your component
const handleShare = (video) => {
  const shareableUrl = generateShareableUrl(video.shareable_id);
  navigator.clipboard.writeText(shareableUrl);
  // Show success message
};

const handleView = (video) => {
  const shareableUrl = generateShareableUrl(video.shareable_id);
  window.open(shareableUrl, '_blank');
};
```

## 🎨 Styling (Optional)

If you're using Tailwind CSS, the component above includes styling. If not, add your own CSS classes or inline styles.

## 🧪 Testing

### 1. Test Locally

1. Add the route and component to your frontend
2. Start your frontend development server
3. Visit: `http://localhost:3000/v/yFzvO4kv5lwF`
4. Should display the video player

### 2. Test Production

1. Deploy your frontend changes
2. Visit: `https://rankandrenttool.com/v/yFzvO4kv5lwF`
3. Should display the video player

## 📊 API Response Format

Your API returns this structure:

```json
{
  "recording": {
    "id": 7,
    "title": "test11",
    "description": "none",
    "video_url": "videos/1755720352269-1755720352102-8584b855-1cd3-489f-a92c-69c0397585a2.webm",
    "thumbnail_url": null,
    "duration": 0,
    "file_size": 820990,
    "recording_type": "both",
    "shareable_id": "yFzvO4kv5lwF",
    "is_public": true,
    "created_at": "2025-08-20T16:05:55.000Z",
    "view_count": 0
  }
}
```

## 🔗 URL Structure

- **Shareable URLs**: `https://rankandrenttool.com/v/{shareableId}`
- **API Endpoint**: `https://newrankandrentapi.onrender.com/api/videos/v/{shareableId}`
- **Video Files**: Stored in AWS S3 bucket `rankandrent-videos-2024`

## 🚀 Deployment Checklist

- [ ] Add `/v/:shareableId` route to React Router
- [ ] Create VideoPlayer component
- [ ] Update shareable URL generation
- [ ] Test locally
- [ ] Deploy frontend
- [ ] Test production URL

## 🎉 Expected Result

After implementing these changes, visiting `https://rankandrenttool.com/v/yFzvO4kv5lwF` should:

1. ✅ Load the video player page
2. ✅ Fetch video data from your API
3. ✅ Display the video with controls
4. ✅ Show video metadata (title, description, etc.)

## 🆘 Troubleshooting

### If you still get 404:

1. **Check route configuration** - Make sure the route is added to your router
2. **Check component import** - Ensure VideoPlayer is imported correctly
3. **Check deployment** - Make sure frontend changes are deployed
4. **Check browser console** - Look for JavaScript errors

### If video doesn't play:

1. **Check video_url** - Should be a valid S3 URL
2. **Check CORS** - S3 bucket needs public read access
3. **Check file format** - Browser should support .webm files

## 📞 Support

Your API is working perfectly! The issue is purely frontend routing. Once you implement these changes, your shareable video URLs will work seamlessly.

