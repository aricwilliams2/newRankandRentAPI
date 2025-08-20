-- Create video_recordings table
CREATE TABLE IF NOT EXISTS video_recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Recording',
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT NOT NULL COMMENT 'Duration in seconds',
  recording_type ENUM('screen', 'webcam', 'both') NOT NULL DEFAULT 'screen',
  thumbnail_path VARCHAR(500),
  shareable_id VARCHAR(12) UNIQUE NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_shareable_id (shareable_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_public (is_public),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create video_views table for analytics
CREATE TABLE IF NOT EXISTS video_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  viewer_id VARCHAR(16) NOT NULL COMMENT 'Anonymous viewer identifier',
  viewer_email VARCHAR(255),
  viewer_ip VARCHAR(45),
  user_agent TEXT,
  watch_duration INT DEFAULT 0 COMMENT 'Duration watched in seconds',
  watch_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of video watched (0-100)',
  engagement_data JSON COMMENT 'Additional engagement metrics like pauses, rewinds, etc.',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_video_id (video_id),
  INDEX idx_viewer_id (viewer_id),
  INDEX idx_viewer_email (viewer_email),
  INDEX idx_created_at (created_at),
  INDEX idx_watch_percentage (watch_percentage),
  
  FOREIGN KEY (video_id) REFERENCES video_recordings(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_video_views_video_created ON video_views(video_id, created_at);
CREATE INDEX idx_video_views_watch_percentage ON video_views(video_id, watch_percentage);
CREATE INDEX idx_video_recordings_user_created ON video_recordings(user_id, created_at);
