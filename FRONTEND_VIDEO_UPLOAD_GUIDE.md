# Frontend Video Upload Implementation Guide

## Problem
The video upload endpoint expects `multipart/form-data` but your frontend is sending JSON data. This causes `req.body.title` and other fields to be `undefined`.

**Fixed:** The backend route has been updated to properly handle multipart form data with correct middleware ordering and safe property access.

## Solution
Use `FormData` to send multipart form data instead of JSON.

## Frontend Implementation

### React/JavaScript Example

```javascript
// ✅ CORRECT: Using FormData for multipart upload
const uploadVideo = async (file, title, description) => {
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('recording_type', 'screen');
    formData.append('is_public', 'false');
    formData.append('video', file); // file is a File object from input

    const response = await fetch('http://localhost:3000/api/videos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Your JWT token
        // ⚠️ DON'T set Content-Type - browser will set it automatically for FormData
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// ❌ WRONG: Sending JSON data
const uploadVideoWrong = async (file, title, description) => {
  const response = await fetch('http://localhost:3000/api/videos/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // ❌ This won't work with file uploads
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ // ❌ JSON won't work with file uploads
      title,
      description,
      video: file // ❌ File objects can't be serialized to JSON
    })
  });
};
```

### React Component Example

```jsx
import React, { useState } from 'react';

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please select a video file.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title || 'Untitled Video');
      formData.append('description', description);
      formData.append('recording_type', 'screen');
      formData.append('is_public', 'false');
      formData.append('video', file);

      const token = localStorage.getItem('token'); // Get your auth token

      const response = await fetch('http://localhost:3000/api/videos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      
      // Show success message or redirect
      alert('Video uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="video-upload">
      <h2>Upload Video</h2>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
          />
        </div>

        <div>
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description"
          />
        </div>

        <div>
          <label htmlFor="video">Video File:</label>
          <input
            type="file"
            id="video"
            accept="video/*"
            onChange={handleFileChange}
            required
          />
          {file && (
            <p>Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
};

export default VideoUpload;
```

### Vanilla JavaScript Example

```javascript
// HTML form
<form id="videoUploadForm">
  <input type="text" name="title" placeholder="Video Title" required>
  <textarea name="description" placeholder="Video Description"></textarea>
  <input type="file" name="video" accept="video/*" required>
  <button type="submit">Upload Video</button>
</form>

// JavaScript
document.getElementById('videoUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  formData.append('recording_type', 'screen');
  formData.append('is_public', 'false');
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch('http://localhost:3000/api/videos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Upload successful:', result);
      alert('Video uploaded successfully!');
    } else {
      const error = await response.json();
      alert(`Upload failed: ${error.error}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed');
  }
});
```

## Key Points

1. **Use FormData**: Always use `FormData` for file uploads
2. **Don't set Content-Type**: Let the browser set it automatically for FormData
3. **Include Authorization**: Add your JWT token in the Authorization header
4. **File field name**: The file must be appended with the field name `'video'`
5. **Form fields**: All other data (title, description, etc.) should be appended as form fields

## Backend Expectations

The backend expects these fields in the multipart form data:
- `video`: The video file (required)
- `title`: Video title (optional, defaults to 'Untitled Recording')
- `description`: Video description (optional)
- `recording_type`: Type of recording (optional, defaults to 'screen')
- `is_public`: Whether video is public (optional, defaults to false)
- `metadata`: Additional metadata as JSON string (optional)

## Testing

You can test the endpoint using the provided test script:
```bash
node test-video-upload.js
```

Or use tools like Postman with multipart form data.
