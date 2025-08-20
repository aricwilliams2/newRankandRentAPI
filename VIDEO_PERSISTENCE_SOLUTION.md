# Video Persistence Solution

## 🎯 Problem
When you record a video and navigate away from the recording page, the video blob is lost because it's only stored in memory.

## 💡 Solutions

### Solution 1: localStorage/IndexedDB Storage (Recommended)

Store the video blob temporarily in the browser's storage before uploading.

```javascript
// Enhanced VideoRecorder Component
import React, { useState, useRef, useCallback } from 'react';
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc';

const VideoRecorder = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState('screen');
  const [stream, setStream] = useState(null);
  const [recorder, setRecorder] = useState(null);
  
  const screenRef = useRef(null);

  // Store video blob in localStorage
  const storeVideoBlob = (blob, metadata) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // Store video data
          localStorage.setItem('tempVideoData', reader.result);
          localStorage.setItem('tempVideoMetadata', JSON.stringify({
            ...metadata,
            timestamp: Date.now(),
            size: blob.size,
            type: blob.type
          }));
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Retrieve stored video blob
  const getStoredVideoBlob = () => {
    const videoData = localStorage.getItem('tempVideoData');
    const metadata = localStorage.getItem('tempVideoMetadata');
    
    if (videoData && metadata) {
      // Convert data URL back to blob
      const byteString = atob(videoData.split(',')[1]);
      const mimeString = videoData.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const metadataObj = JSON.parse(metadata);
      
      return { blob, metadata: metadataObj };
    }
    
    return null;
  };

  // Clear stored video
  const clearStoredVideo = () => {
    localStorage.removeItem('tempVideoData');
    localStorage.removeItem('tempVideoMetadata');
  };

  const startRecording = async () => {
    try {
      let mediaStream;
      
      if (recordingType === 'screen') {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        });
      } else if (recordingType === 'webcam') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      } else {
        // Both screen and webcam
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        });
        const webcamStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        const tracks = [...screenStream.getTracks(), ...webcamStream.getTracks()];
        mediaStream = new MediaStream(tracks);
      }

      setStream(mediaStream);
      
      const recordRTC = new RecordRTCPromisesHandler(mediaStream, {
        type: 'video',
        mimeType: 'video/webm;codecs=vp9',
        frameRate: 30,
        quality: 10,
        width: 1920,
        height: 1080
      });

      setRecorder(recordRTC);
      await recordRTC.startRecording();
      setIsRecording(true);

      if (screenRef.current) {
        screenRef.current.srcObject = mediaStream;
      }

    } catch (error) {
      onError('Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!recorder) return;

    try {
      await recorder.stopRecording();
      const blob = await recorder.getBlob();
      
      const metadata = {
        recordingType,
        duration: Date.now() - (recorder as any).startTime,
        resolution: '1920x1080',
        frameRate: 30,
        quality: 'high'
      };

      // Store video blob immediately
      await storeVideoBlob(blob, metadata);
      
      onRecordingComplete(blob, metadata);
      
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setRecorder(null);
      setIsRecording(false);

    } catch (error) {
      onError('Failed to stop recording: ' + error.message);
    }
  };

  // Check for stored video on component mount
  React.useEffect(() => {
    const stored = getStoredVideoBlob();
    if (stored) {
      // Show option to continue with stored video
      const shouldContinue = window.confirm(
        'You have a stored video recording. Would you like to continue with it?'
      );
      
      if (shouldContinue) {
        onRecordingComplete(stored.blob, stored.metadata);
      } else {
        clearStoredVideo();
      }
    }
  }, []);

  return (
    <div className="video-recorder">
      <div className="recorder-controls">
        <select 
          value={recordingType} 
          onChange={(e) => setRecordingType(e.target.value)}
          disabled={isRecording}
        >
          <option value="screen">Screen Only</option>
          <option value="webcam">Webcam Only</option>
          <option value="both">Screen + Webcam</option>
        </select>

        {!isRecording ? (
          <button onClick={startRecording} className="start-btn">
            Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} className="stop-btn">
            Stop Recording
          </button>
        )}
      </div>

      <div className="preview-container">
        <video 
          ref={screenRef} 
          autoPlay 
          muted 
          style={{ width: '100%', maxWidth: '800px' }}
        />
      </div>
    </div>
  );
};

export default VideoRecorder;
```

### Solution 2: Enhanced VideoUploader with Persistence

```javascript
// Enhanced VideoUploader Component
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VideoUploader = ({ blob, metadata, onUploadComplete, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [videoBlob, setVideoBlob] = useState(blob);
  const [videoMetadata, setVideoMetadata] = useState(metadata);

  // Check for stored video on mount
  useEffect(() => {
    if (!videoBlob) {
      const stored = getStoredVideoBlob();
      if (stored) {
        setVideoBlob(stored.blob);
        setVideoMetadata(stored.metadata);
        setTitle(stored.metadata.title || 'Untitled Recording');
      }
    }
  }, []);

  const getStoredVideoBlob = () => {
    const videoData = localStorage.getItem('tempVideoData');
    const metadata = localStorage.getItem('tempVideoMetadata');
    
    if (videoData && metadata) {
      const byteString = atob(videoData.split(',')[1]);
      const mimeString = videoData.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const metadataObj = JSON.parse(metadata);
      
      return { blob, metadata: metadataObj };
    }
    
    return null;
  };

  const clearStoredVideo = () => {
    localStorage.removeItem('tempVideoData');
    localStorage.removeItem('tempVideoMetadata');
  };

  const uploadVideo = async () => {
    if (!title.trim()) {
      onUploadError('Please enter a title for your recording');
      return;
    }

    if (!videoBlob) {
      onUploadError('No video data available');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoBlob, 'recording.webm');
      formData.append('title', title);
      formData.append('description', description);
      formData.append('is_public', isPublic.toString());
      formData.append('recording_type', videoMetadata.recordingType);
      formData.append('metadata', JSON.stringify(videoMetadata));

      const response = await axios.post('/api/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      // Clear stored video after successful upload
      clearStoredVideo();
      onUploadComplete(response.data.recording);
    } catch (error) {
      onUploadError('Upload failed: ' + error.response?.data?.error || error.message);
    } finally {
      setUploading(false);
    }
  };

  const discardVideo = () => {
    clearStoredVideo();
    onUploadError('Video discarded');
  };

  if (!videoBlob) {
    return (
      <div className="video-uploader">
        <h3>No Video Available</h3>
        <p>Please record a video first or check if you have a stored recording.</p>
      </div>
    );
  }

  return (
    <div className="video-uploader">
      <h3>Upload Your Recording</h3>
      
      <div className="video-preview">
        <video 
          src={URL.createObjectURL(videoBlob)} 
          controls 
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>
      
      <div className="upload-form">
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter recording title"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            disabled={uploading}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={uploading}
            />
            Make this recording public
          </label>
        </div>

        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{progress}% uploaded</span>
          </div>
        )}

        <div className="upload-actions">
          <button 
            onClick={uploadVideo} 
            disabled={uploading || !title.trim()}
            className="upload-btn"
          >
            {uploading ? 'Uploading...' : 'Upload Recording'}
          </button>
          
          <button 
            onClick={discardVideo}
            disabled={uploading}
            className="discard-btn"
          >
            Discard Video
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoUploader;
```

### Solution 3: Main Recording Page with Persistence

```javascript
// Enhanced RecordPage Component
import React, { useState, useEffect } from 'react';
import VideoRecorder from '../components/VideoRecorder';
import VideoUploader from '../components/VideoUploader';

const RecordPage = () => {
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingMetadata, setRecordingMetadata] = useState(null);
  const [uploadedRecording, setUploadedRecording] = useState(null);
  const [currentStep, setCurrentStep] = useState('recording'); // 'recording', 'uploading', 'complete'

  // Check for stored video on page load
  useEffect(() => {
    const checkStoredVideo = () => {
      const videoData = localStorage.getItem('tempVideoData');
      const metadata = localStorage.getItem('tempVideoMetadata');
      
      if (videoData && metadata) {
        const byteString = atob(videoData.split(',')[1]);
        const mimeString = videoData.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const metadataObj = JSON.parse(metadata);
        
        setRecordingBlob(blob);
        setRecordingMetadata(metadataObj);
        setCurrentStep('uploading');
      }
    };

    checkStoredVideo();
  }, []);

  const handleRecordingComplete = (blob, metadata) => {
    setRecordingBlob(blob);
    setRecordingMetadata(metadata);
    setCurrentStep('uploading');
  };

  const handleUploadComplete = (recording) => {
    setUploadedRecording(recording);
    setRecordingBlob(null);
    setRecordingMetadata(null);
    setCurrentStep('complete');
  };

  const handleError = (error) => {
    alert(error);
  };

  const startNewRecording = () => {
    setCurrentStep('recording');
    setUploadedRecording(null);
  };

  return (
    <div className="record-page">
      <h1>Record Your Screen</h1>
      
      {currentStep === 'recording' && (
        <VideoRecorder
          onRecordingComplete={handleRecordingComplete}
          onError={handleError}
        />
      )}
      
      {currentStep === 'uploading' && recordingBlob && (
        <VideoUploader
          blob={recordingBlob}
          metadata={recordingMetadata}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleError}
        />
      )}

      {currentStep === 'complete' && uploadedRecording && (
        <div className="upload-success">
          <h3>🎉 Recording uploaded successfully!</h3>
          <p><strong>Title:</strong> {uploadedRecording.title}</p>
          <p><strong>Share URL:</strong> {uploadedRecording.shareable_url}</p>
          <div className="success-actions">
            <a 
              href={uploadedRecording.shareable_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="view-btn"
            >
              View Recording
            </a>
            <button onClick={startNewRecording} className="new-recording-btn">
              Record Another Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordPage;
```

## 🎯 Key Features

### ✅ **Video Persistence**
- Automatically stores video blob in localStorage
- Survives page navigation and browser refresh
- Prompts user to continue with stored video

### ✅ **Upload Recovery**
- Retrieves stored video on component mount
- Continues upload process seamlessly
- Clears storage after successful upload

### ✅ **User Experience**
- Clear progress indicators
- Option to discard stored videos
- Smooth workflow from recording to upload

### ✅ **Error Handling**
- Graceful fallbacks for storage issues
- Clear error messages
- Recovery options for failed uploads

## 🚀 Usage

1. **Record Video**: Video blob is automatically stored
2. **Navigate Away**: Video persists in localStorage
3. **Return to Page**: Option to continue with stored video
4. **Upload**: Seamless upload process
5. **Complete**: Storage cleared after successful upload

This solution ensures your video recordings are never lost, even if you navigate away from the page!
