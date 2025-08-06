# Frontend Recording Implementation Guide

This guide shows how to implement call history and recording playback in your React frontend using the new proxy endpoints.

## 🎯 Overview

Your backend now provides:
- **Fixed recordings data** (no more "undefined" values)
- **Proxy streaming** (no Twilio login prompts)
- **Proper user associations** (secure access)

## 📡 API Endpoints to Use

### 1. **Get Call History with Recordings**
```javascript
GET /api/twilio/recordings
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "recordings": [
    {
      "id": 123,
      "userId": 45,
      "callSid": "CA1234567890abcdef",
      "recordingSid": "RE1234567890abcdef",
      "phoneNumberId": 7,
      "duration": "21",
      "channels": 2,
      "status": "completed",
      "priceUnit": "USD",
      "recordingUrl": "https://api.twilio.com/...",
      "mediaUrl": "https://yourapi.onrender.com/api/twilio/recording/RE1234567890abcdef",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:32:00.000Z",
      "fromNumber": "+18776653167",
      "toNumber": "+19102002942",
      "callDuration": 25,
      "callStatus": "completed"
    }
  ],
  "phoneNumberStats": {
    "total_numbers": 2,
    "active_numbers": 2,
    "total_purchase_cost": "1.0000",
    "total_monthly_cost": "2.0000"
  },
  "loading": false,
  "error": null
}
```

### 2. **Stream Individual Recording**
```javascript
GET /api/twilio/recording/:recordingSid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** Audio stream (MP3) - no login required!

## 🎧 React Components

### **1. Call History Hook**

```javascript
// hooks/useCallHistory.js
import { useState, useEffect } from 'react';

export const useCallHistory = (authToken) => {
  const [recordings, setRecordings] = useState([]);
  const [phoneNumberStats, setPhoneNumberStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/twilio/recordings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRecordings(data.recordings || []);
        setPhoneNumberStats(data.phoneNumberStats || {});
      } else {
        throw new Error(data.error || 'Failed to fetch recordings');
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchRecordings();
    }
  }, [authToken]);

  return {
    recordings,
    phoneNumberStats,
    loading,
    error,
    refetch: fetchRecordings
  };
};
```

### **2. Recording Player Component**

```javascript
// components/RecordingPlayer.js
import React, { useState, useRef } from 'react';

const RecordingPlayer = ({ recording, authToken }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setIsLoading(true);
        setError(null);
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play recording');
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = percent * duration;
    }
  };

  return (
    <div className="recording-player bg-gray-50 p-4 rounded-lg">
      <audio
        ref={audioRef}
        src={recording.mediaUrl}
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={(e) => {
          console.error('Audio error:', e);
          setError('Failed to load recording');
          setIsLoading(false);
        }}
        preload="metadata"
      />

      <div className="flex items-center space-x-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full transition-colors"
        >
          {isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div 
            className="w-full bg-gray-300 rounded-full h-2 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Download Button */}
        <a
          href={recording.mediaUrl}
          download={`recording-${recording.recordingSid}.mp3`}
          className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
          title="Download recording"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </a>
      </div>

      {/* Call Info */}
      <div className="mt-3 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>From: {recording.fromNumber}</span>
          <span>To: {recording.toNumber}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Duration: {recording.callDuration}s</span>
          <span>Status: {recording.callStatus}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {new Date(recording.createdAt).toLocaleString()}
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default RecordingPlayer;
```

### **3. Call History Page**

```javascript
// pages/CallHistory.js
import React from 'react';
import { useCallHistory } from '../hooks/useCallHistory';
import RecordingPlayer from '../components/RecordingPlayer';

const CallHistory = () => {
  const authToken = localStorage.getItem('authToken'); // or however you store it
  const { recordings, phoneNumberStats, loading, error, refetch } = useCallHistory(authToken);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
          <button 
            onClick={refetch}
            className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Call History</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{recordings.length}</div>
            <div className="text-sm text-gray-600">Recordings</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{phoneNumberStats.active_numbers}</div>
            <div className="text-sm text-gray-600">Active Numbers</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">${phoneNumberStats.total_purchase_cost}</div>
            <div className="text-sm text-gray-600">Total Cost</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">${phoneNumberStats.total_monthly_cost}</div>
            <div className="text-sm text-gray-600">Monthly Cost</div>
          </div>
        </div>
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-1 16h12l-1-16M9 8v8m6-8v8" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recordings</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by making your first call.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {recordings.map((recording) => (
            <div key={recording.id} className="bg-white rounded-lg shadow">
              <RecordingPlayer recording={recording} authToken={authToken} />
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={refetch}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Refresh Recordings
        </button>
      </div>
    </div>
  );
};

export default CallHistory;
```

### **4. Simple Audio Player (Minimal Version)**

```javascript
// components/SimpleAudioPlayer.js
import React from 'react';

const SimpleAudioPlayer = ({ recording }) => {
  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">
          {recording.fromNumber} → {recording.toNumber}
        </span>
        <span className="text-sm text-gray-500">
          {new Date(recording.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <audio 
        controls 
        className="w-full"
        preload="metadata"
      >
        <source src={recording.mediaUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      
      <div className="text-xs text-gray-500 mt-2">
        Duration: {recording.duration}s | Status: {recording.status}
      </div>
    </div>
  );
};

export default SimpleAudioPlayer;
```

## 🚀 Implementation Steps

### **1. Install Dependencies (if needed)**
```bash
# Most functionality uses built-in React hooks
# No additional dependencies required!
```

### **2. Add to Your App**
```javascript
// App.js
import CallHistory from './pages/CallHistory';

function App() {
  return (
    <div className="App">
      {/* Your existing routes */}
      <CallHistory />
    </div>
  );
}
```

### **3. Environment Setup**
Make sure your frontend can reach your backend:
```javascript
// config.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://newrankandrentapi.onrender.com';
```

## 🎯 Key Features

- ✅ **No Login Prompts**: Uses your proxy endpoint
- ✅ **Real Data**: No more "undefined" values
- ✅ **Secure**: Users only see their own recordings
- ✅ **Fast Loading**: Metadata preloading
- ✅ **Progress Bar**: Visual playback progress
- ✅ **Download Option**: Users can save recordings
- ✅ **Error Handling**: Graceful failure management
- ✅ **Responsive Design**: Works on all devices

## 🔧 Customization

You can customize the components by:
- Changing the styling/colors
- Adding more call metadata
- Implementing playlists
- Adding playback speed controls
- Creating waveform visualizations

The recording playback will now work seamlessly without any Twilio login prompts! 🎉🎧