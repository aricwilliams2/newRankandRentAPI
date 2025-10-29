# Frontend Whisper Audio Upload Guide

This guide shows how to upload whisper audio files from your React frontend.

## 📡 API Endpoint

**POST** `/api/twilio/my-numbers/:id/whisper/upload`

**Headers:**
- `Authorization: Bearer YOUR_JWT_TOKEN`
- `Content-Type: multipart/form-data`

**Body:**
- `audio` (file): Audio file (MP3, WAV, OGG, etc.) - max 5MB

**Response:**
```json
{
  "success": true,
  "message": "Whisper audio uploaded successfully",
  "media_url": "https://your-bucket.s3.amazonaws.com/whispers/123/456/uuid.mp3",
  "whisper": {
    "enabled": true,
    "type": "play",
    "media_url": "https://your-bucket.s3.amazonaws.com/whispers/123/456/uuid.mp3"
  }
}
```

## 🎨 React Component Example

### **1. Basic Upload Component**

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const WhisperAudioUpload = ({ phoneNumberId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://newrankandrentapi.onrender.com';
  const token = localStorage.getItem('token'); // Adjust based on your auth setup

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload MP3, WAV, or OGG files.');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    }
  };

  const handleUpload = async () => {
    if (!file || !phoneNumberId) {
      setError('Please select an audio file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await axios.post(
        `${API_BASE_URL}/api/twilio/my-numbers/${phoneNumberId}/whisper/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        console.log('✅ Audio uploaded:', response.data.media_url);
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
        // Reset form
        setFile(null);
        setPreview(null);
        document.getElementById('audio-upload').value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to upload audio');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="whisper-upload-container">
      <h3>Upload Whisper Audio</h3>
      
      <div className="upload-section">
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="file-input"
        />
        
        {file && (
          <div className="file-preview">
            <p><strong>Selected:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
            {preview && (
              <audio controls src={preview} className="preview-audio" />
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="upload-button"
      >
        {uploading ? 'Uploading...' : 'Upload Audio'}
      </button>
    </div>
  );
};

export default WhisperAudioUpload;
```

### **2. Complete Whisper Settings Component**

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WhisperSettings = ({ phoneNumberId }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    type: 'say',
    text: '',
    voice: 'alice',
    language: 'en-US',
    media_url: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://newrankandrentapi.onrender.com';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSettings();
  }, [phoneNumberId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/twilio/my-numbers/${phoneNumberId}/whisper`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSettings(response.data.whisper);
      }
    } catch (err) {
      console.error('Error fetching whisper settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/twilio/my-numbers/${phoneNumberId}/whisper`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSettings(response.data.whisper);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/twilio/my-numbers/${phoneNumberId}/whisper/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSettings(response.data.whisper);
        return response.data.media_url;
      }
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Upload failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="whisper-settings">
      <h2>Whisper Settings</h2>

      {/* Enable/Disable Toggle */}
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleUpdate({ whisper_enabled: e.target.checked })}
          />
          Enable Whisper
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Type Selection */}
          <div className="setting-row">
            <label>Whisper Type:</label>
            <select
              value={settings.type}
              onChange={(e) => handleUpdate({ whisper_type: e.target.value })}
            >
              <option value="say">Text-to-Speech</option>
              <option value="play">Pre-recorded Audio</option>
            </select>
          </div>

          {/* TTS Settings */}
          {settings.type === 'say' && (
            <>
              <div className="setting-row">
                <label>Whisper Text:</label>
                <input
                  type="text"
                  value={settings.text || ''}
                  placeholder="Incoming call on {label}.{caller}"
                  onChange={(e) => handleUpdate({ whisper_text: e.target.value })}
                  style={{ width: '100%', padding: '8px' }}
                />
                <small>
                  Use {'{label}'} for phone number name and {'{caller}'} for caller number
                </small>
              </div>

              <div className="setting-row">
                <label>Voice:</label>
                <select
                  value={settings.voice}
                  onChange={(e) => handleUpdate({ whisper_voice: e.target.value })}
                >
                  <option value="alice">Alice (Default)</option>
                  <option value="Polly.Matthew">Matthew (Polly)</option>
                  <option value="Polly.Joanna">Joanna (Polly)</option>
                  <option value="Polly.Joey">Joey (Polly)</option>
                </select>
              </div>

              <div className="setting-row">
                <label>Language:</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleUpdate({ whisper_language: e.target.value })}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                </select>
              </div>
            </>
          )}

          {/* Audio Upload */}
          {settings.type === 'play' && (
            <div className="setting-row">
              <label>Audio File:</label>
              {settings.media_url ? (
                <div>
                  <audio controls src={settings.media_url} style={{ width: '100%', marginTop: '10px' }} />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Current: {settings.media_url}
                  </p>
                </div>
              ) : (
                <p style={{ color: '#666' }}>No audio file uploaded</p>
              )}
              
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      await handleFileUpload(file);
                      alert('Audio uploaded successfully!');
                    } catch (err) {
                      alert(`Upload failed: ${err.message}`);
                    }
                  }
                }}
                style={{ marginTop: '10px' }}
              />
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default WhisperSettings;
```

### **3. Using Fetch API (Alternative)**

```javascript
// Upload function using Fetch API
async function uploadWhisperAudio(phoneNumberId, audioFile, token) {
  const formData = new FormData();
  formData.append('audio', audioFile);

  try {
    const response = await fetch(
      `https://your-api.com/api/twilio/my-numbers/${phoneNumberId}/whisper/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - browser will set it with boundary
        },
        body: formData
      }
    );

    const data = await response.json();
    
    if (data.success) {
      return data.media_url;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById('audio-file');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const mediaUrl = await uploadWhisperAudio(phoneNumberId, file, token);
      console.log('Uploaded to:', mediaUrl);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }
});
```

## 📝 Notes

1. **File Size Limit**: Maximum 5MB per file
2. **Supported Formats**: MP3, WAV, OGG, WebM, M4A, AAC
3. **Storage**: Files are stored in S3 (if configured) or locally
4. **Auto-Enable**: Uploading automatically enables whisper and sets type to 'play'
5. **Public Access**: Files stored in S3 are set to public-read so Twilio can access them

## 🎯 Example Workflow

1. User selects an audio file
2. Frontend validates file (size, type)
3. Upload to `/api/twilio/my-numbers/:id/whisper/upload`
4. Backend stores file and updates whisper settings
5. Whisper is now enabled with the uploaded audio
6. When calls are forwarded, Twilio plays the audio file

## 🔒 Security

- All endpoints require authentication (JWT token)
- Users can only upload whisper audio for their own phone numbers
- File type and size validation on both frontend and backend

