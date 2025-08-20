# Frontend Video Recording Implementation Guide

This guide provides a complete implementation for the video recording feature including screen recording, webcam overlay, video storage, playback, and analytics dashboard.

## 🎯 Features Overview

- **Screen Recording**: Record browser tab, entire screen, or app window
- **Webcam Overlay**: Optional small bubble overlay during recording
- **Audio Recording**: Include microphone audio
- **Video Storage**: Cloud storage with shareable links
- **Analytics Dashboard**: View tracking, engagement heatmaps, viewer insights
- **Custom Player**: Branded video player with analytics tracking

## 📦 Required Dependencies

```bash
npm install recordrtc react-media-recorder react-player react-webcam
npm install @mui/material @emotion/react @emotion/styled
npm install recharts axios react-router-dom
```

## 🎥 Core Components

### 1. VideoRecorder Component

```tsx
// components/VideoRecorder.tsx
import React, { useState, useRef, useCallback } from 'react';
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc';
import Webcam from 'react-webcam';

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob, metadata: any) => void;
  onError: (error: string) => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'screen' | 'webcam' | 'both'>('screen');
  const [showWebcam, setShowWebcam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<RecordRTCPromisesHandler | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const screenRef = useRef<HTMLVideoElement>(null);

  const startRecording = async () => {
    try {
      let mediaStream: MediaStream;
      
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
        
        // Combine streams
        const tracks = [...screenStream.getTracks(), ...webcamStream.getTracks()];
        mediaStream = new MediaStream(tracks);
        setShowWebcam(true);
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

      // Display preview
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
      
      // Get metadata
      const metadata = {
        recordingType,
        duration: Date.now() - (recorder as any).startTime,
        resolution: '1920x1080',
        frameRate: 30,
        quality: 'high'
      };

      onRecordingComplete(blob, metadata);
      
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setRecorder(null);
      setIsRecording(false);
      setShowWebcam(false);

    } catch (error) {
      onError('Failed to stop recording: ' + error.message);
    }
  };

  return (
    <div className="video-recorder">
      <div className="recorder-controls">
        <select 
          value={recordingType} 
          onChange={(e) => setRecordingType(e.target.value as any)}
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
        
        {showWebcam && (
          <div className="webcam-overlay">
            <Webcam
              ref={webcamRef}
              audio={false}
              width={200}
              height={150}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                borderRadius: '8px',
                border: '2px solid #fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoRecorder;
```

### 2. VideoUploader Component

```tsx
// components/VideoUploader.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface VideoUploaderProps {
  blob: Blob;
  metadata: any;
  onUploadComplete: (recording: any) => void;
  onUploadError: (error: string) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ 
  blob, 
  metadata, 
  onUploadComplete, 
  onUploadError 
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const uploadVideo = async () => {
    if (!title.trim()) {
      onUploadError('Please enter a title for your recording');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', blob, 'recording.webm');
      formData.append('title', title);
      formData.append('description', description);
      formData.append('is_public', isPublic.toString());
      formData.append('recording_type', metadata.recordingType);
      formData.append('metadata', JSON.stringify(metadata));

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

      onUploadComplete(response.data.recording);
    } catch (error) {
      onUploadError('Upload failed: ' + error.response?.data?.error || error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="video-uploader">
      <h3>Upload Your Recording</h3>
      
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

        <button 
          onClick={uploadVideo} 
          disabled={uploading || !title.trim()}
          className="upload-btn"
        >
          {uploading ? 'Uploading...' : 'Upload Recording'}
        </button>
      </div>
    </div>
  );
};

export default VideoUploader;
```

### 3. VideoPlayer Component

```tsx
// components/VideoPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  viewId?: string;
  viewerId?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title,
  viewId,
  viewerId,
  onProgress,
  onComplete
}) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [seeking, setSeeking] = useState(false);
  
  const playerRef = useRef<ReactPlayer>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  // Track progress to backend
  const trackProgress = async (currentProgress: number) => {
    if (!viewId) return;

    try {
      await axios.post('/api/videos/track-progress', {
        view_id: viewId,
        watch_duration: (duration * currentProgress) / 100,
        watch_percentage: currentProgress,
        engagement_data: {
          volume,
          playing,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to track progress:', error);
    }
  };

  // Send progress updates every 5 seconds
  useEffect(() => {
    if (viewId && playing) {
      progressInterval.current = setInterval(() => {
        trackProgress(progress);
      }, 5000);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [viewId, playing, progress, duration, volume]);

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    if (!seeking) {
      const newProgress = state.played * 100;
      setProgress(newProgress);
      onProgress?.(newProgress);

      // Track completion
      if (newProgress >= 90) {
        onComplete?.();
      }
    }
  };

  const handleSeek = (value: number) => {
    setSeeking(true);
    setProgress(value);
    if (playerRef.current) {
      playerRef.current.seekTo(value / 100);
    }
  };

  const handleSeekMouseUp = () => {
    setSeeking(false);
    trackProgress(progress);
  };

  return (
    <div className="video-player">
      <div className="player-container">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={playing}
          volume={volume}
          width="100%"
          height="100%"
          onProgress={handleProgress}
          onDuration={setDuration}
          onEnded={() => {
            setPlaying(false);
            onComplete?.();
          }}
          controls={false}
          style={{ backgroundColor: '#000' }}
        />
      </div>

      <div className="player-controls">
        <div className="control-row">
          <button 
            onClick={() => setPlaying(!playing)}
            className="play-btn"
          >
            {playing ? '⏸️' : '▶️'}
          </button>

          <div className="progress-container">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => handleSeek(Number(e.target.value))}
              onMouseUp={handleSeekMouseUp}
              onTouchEnd={handleSeekMouseUp}
              className="progress-slider"
            />
            <span className="time-display">
              {Math.floor((duration * progress) / 100)}s / {Math.floor(duration)}s
            </span>
          </div>

          <div className="volume-control">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="volume-slider"
            />
          </div>
        </div>

        <div className="video-info">
          <h3>{title}</h3>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
```

### 4. VideoAnalytics Component

```tsx
// components/VideoAnalytics.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

interface VideoAnalyticsProps {
  videoId: string;
}

const VideoAnalytics: React.FC<VideoAnalyticsProps> = ({ videoId }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [videoId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, viewsRes, heatmapRes, topViewersRes] = await Promise.all([
        axios.get(`/api/videos/recordings/${videoId}/analytics`),
        axios.get(`/api/videos/recordings/${videoId}/views`),
        axios.get(`/api/videos/recordings/${videoId}/heatmap`),
        axios.get(`/api/videos/recordings/${videoId}/top-viewers`)
      ]);

      setAnalytics({
        ...analyticsRes.data,
        views: viewsRes.data.views,
        heatmap: heatmapRes.data.heatmap,
        topViewers: topViewersRes.data.top_viewers
      });
    } catch (error) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analytics) return <div>No analytics available</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="video-analytics">
      <h2>Video Analytics</h2>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Views</h3>
          <p>{analytics.analytics?.total_views || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Unique Viewers</h3>
          <p>{analytics.analytics?.unique_viewers || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Avg Watch %</h3>
          <p>{Math.round(analytics.analytics?.avg_watch_percentage || 0)}%</p>
        </div>
        <div className="stat-card">
          <h3>Avg Duration</h3>
          <p>{Math.round(analytics.analytics?.avg_watch_duration || 0)}s</p>
        </div>
      </div>

      {/* Engagement Heatmap */}
      <div className="chart-section">
        <h3>Engagement Heatmap</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.heatmap}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="watch_percentage" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="viewer_count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Views */}
      <div className="chart-section">
        <h3>Recent Views</h3>
        <div className="views-list">
          {analytics.views?.slice(0, 10).map((view: any) => (
            <div key={view.id} className="view-item">
              <span>{view.viewer_email || 'Anonymous'}</span>
              <span>{Math.round(view.watch_percentage)}% watched</span>
              <span>{new Date(view.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Viewers */}
      <div className="chart-section">
        <h3>Top Viewers</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={analytics.topViewers}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ viewer_email, avg_watch_percentage }) => 
                `${viewer_email}: ${Math.round(avg_watch_percentage)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="avg_watch_percentage"
            >
              {analytics.topViewers?.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VideoAnalytics;
```

### 5. VideoLibrary Component

```tsx
// components/VideoLibrary.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: number;
  shareable_url: string;
  view_count: number;
  unique_viewers: number;
  created_at: string;
}

const VideoLibrary: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, [page]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`/api/videos/recordings?page=${page}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (page === 1) {
        setVideos(response.data.recordings);
      } else {
        setVideos(prev => [...prev, ...response.data.recordings]);
      }

      setHasMore(response.data.recordings.length === 12);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="video-library">
      <div className="library-header">
        <h2>My Video Recordings</h2>
        <Link to="/record" className="new-recording-btn">
          New Recording
        </Link>
      </div>

      {loading && page === 1 ? (
        <div className="loading">Loading videos...</div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="video-thumbnail">
                <img src={video.thumbnail_url} alt={video.title} />
                <div className="video-duration">{formatDuration(video.duration)}</div>
              </div>
              
              <div className="video-info">
                <h3>{video.title}</h3>
                <p>{video.description}</p>
                
                <div className="video-stats">
                  <span>{video.view_count} views</span>
                  <span>{video.unique_viewers} unique viewers</span>
                </div>
                
                <div className="video-actions">
                  <Link to={`/videos/${video.id}`} className="view-btn">
                    View Details
                  </Link>
                  <Link to={`/videos/${video.id}/analytics`} className="analytics-btn">
                    Analytics
                  </Link>
                  <a href={video.shareable_url} target="_blank" rel="noopener noreferrer" className="share-btn">
                    Share
                  </a>
                </div>
                
                <div className="video-date">
                  Created: {formatDate(video.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="load-more">
          <button 
            onClick={() => setPage(prev => prev + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoLibrary;
```

## 🎨 CSS Styles

```css
/* Video Recording Styles */
.video-recorder {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.recorder-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.recorder-controls select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.start-btn, .stop-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn {
  background: #4CAF50;
  color: white;
}

.start-btn:hover {
  background: #45a049;
}

.stop-btn {
  background: #f44336;
  color: white;
}

.stop-btn:hover {
  background: #da190b;
}

.preview-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.webcam-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* Video Uploader Styles */
.video-uploader {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group textarea {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.upload-btn {
  padding: 15px 30px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.upload-btn:hover:not(:disabled) {
  background: #1976D2;
}

.upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Video Player Styles */
.video-player {
  max-width: 1000px;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.player-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
}

.player-controls {
  background: #1a1a1a;
  padding: 15px;
  color: white;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.play-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
}

.progress-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-slider {
  flex: 1;
  height: 4px;
  background: #444;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.time-display {
  font-size: 12px;
  color: #ccc;
  min-width: 80px;
}

.volume-control {
  display: flex;
  align-items: center;
}

.volume-slider {
  width: 80px;
  height: 4px;
  background: #444;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.video-info h3 {
  margin: 0;
  font-size: 18px;
  color: white;
}

/* Video Analytics Styles */
.video-analytics {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
  text-transform: uppercase;
}

.stat-card p {
  margin: 0;
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.chart-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.chart-section h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.views-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.view-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
  font-size: 14px;
}

/* Video Library Styles */
.video-library {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.new-recording-btn {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: 600;
  transition: background 0.3s ease;
}

.new-recording-btn:hover {
  background: #45a049;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.video-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.video-card:hover {
  transform: translateY(-2px);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.video-info {
  padding: 15px;
}

.video-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.video-info p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.video-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #888;
}

.video-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.view-btn, .analytics-btn, .share-btn {
  padding: 6px 12px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.view-btn {
  background: #2196F3;
  color: white;
}

.analytics-btn {
  background: #FF9800;
  color: white;
}

.share-btn {
  background: #4CAF50;
  color: white;
}

.video-date {
  font-size: 12px;
  color: #999;
}

.load-more {
  text-align: center;
  margin-top: 30px;
}

.load-more button {
  padding: 12px 24px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.load-more button:hover:not(:disabled) {
  background: #e0e0e0;
}

.load-more button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

## 🚀 Usage Examples

### Main Recording Page

```tsx
// pages/RecordPage.tsx
import React, { useState } from 'react';
import VideoRecorder from '../components/VideoRecorder';
import VideoUploader from '../components/VideoUploader';

const RecordPage: React.FC = () => {
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingMetadata, setRecordingMetadata] = useState<any>(null);
  const [uploadedRecording, setUploadedRecording] = useState<any>(null);

  const handleRecordingComplete = (blob: Blob, metadata: any) => {
    setRecordingBlob(blob);
    setRecordingMetadata(metadata);
  };

  const handleUploadComplete = (recording: any) => {
    setUploadedRecording(recording);
    setRecordingBlob(null);
    setRecordingMetadata(null);
  };

  const handleError = (error: string) => {
    alert(error);
  };

  return (
    <div className="record-page">
      <h1>Record Your Screen</h1>
      
      {!recordingBlob ? (
        <VideoRecorder
          onRecordingComplete={handleRecordingComplete}
          onError={handleError}
        />
      ) : (
        <VideoUploader
          blob={recordingBlob}
          metadata={recordingMetadata}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleError}
        />
      )}

      {uploadedRecording && (
        <div className="upload-success">
          <h3>Recording uploaded successfully!</h3>
          <p>Share URL: {uploadedRecording.shareable_url}</p>
          <a href={uploadedRecording.shareable_url} target="_blank" rel="noopener noreferrer">
            View Recording
          </a>
        </div>
      )}
    </div>
  );
};

export default RecordPage;
```

### Public Video View Page

```tsx
// pages/PublicVideoPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';

const PublicVideoPage: React.FC = () => {
  const { shareableId } = useParams<{ shareableId: string }>();
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerEmail, setViewerEmail] = useState('');

  useEffect(() => {
    fetchVideo();
  }, [shareableId]);

  const fetchVideo = async () => {
    try {
      const url = viewerEmail 
        ? `/api/videos/v/${shareableId}?email=${encodeURIComponent(viewerEmail)}`
        : `/api/videos/v/${shareableId}`;
        
      const response = await axios.get(url);
      setVideoData(response.data);
    } catch (error) {
      setError('Video not found or not public');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideo();
  };

  if (loading) return <div>Loading video...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!videoData) return <div>Video not found</div>;

  return (
    <div className="public-video-page">
      <div className="video-container">
        <VideoPlayer
          videoUrl={videoData.recording.video_url}
          title={videoData.recording.title}
          viewId={videoData.view_id}
          viewerId={videoData.viewer_id}
        />
      </div>

      <div className="video-details">
        <h1>{videoData.recording.title}</h1>
        <p>{videoData.recording.description}</p>
        <p>Created by: {videoData.recording.user_name}</p>
      </div>

      {!viewerEmail && (
        <div className="email-capture">
          <h3>Get notified about new videos</h3>
          <form onSubmit={handleEmailSubmit}>
            <input
              type="email"
              value={viewerEmail}
              onChange={(e) => setViewerEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PublicVideoPage;
```

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-video-bucket-name

# Frontend URL for shareable links
FRONTEND_URL=https://rankandrenttool.com

# API Base URL
REACT_APP_API_URL=http://localhost:3000/api
```

## 📱 Mobile Responsiveness

The components are designed to be mobile-responsive. Key considerations:

1. **Touch-friendly controls**: Large buttons and sliders for mobile
2. **Responsive grid**: Videos grid adapts to screen size
3. **Mobile recording**: Optimized for mobile screen recording
4. **Touch gestures**: Swipe controls for video player

## 🎯 Next Steps

1. **Install dependencies** and set up the environment
2. **Run database migrations** to create video tables
3. **Configure AWS S3** for video storage
4. **Implement the components** in your React app
5. **Add routing** for video pages
6. **Test recording functionality** across different browsers
7. **Deploy and monitor** video uploads and analytics

This implementation provides a complete video recording solution with professional-grade features for screen recording, webcam overlay, analytics, and sharing capabilities.
