-- Create keyword_tracking table for tracking keyword rankings
CREATE TABLE IF NOT EXISTS keyword_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  target_url VARCHAR(500) NOT NULL,
  current_rank INT NULL COMMENT 'Current ranking position (null if not found)',
  previous_rank INT NULL COMMENT 'Previous ranking position for comparison',
  rank_change INT NULL COMMENT 'Change in ranking (positive = improved, negative = declined)',
  search_engine VARCHAR(50) DEFAULT 'google',
  country VARCHAR(10) DEFAULT 'us',
  location VARCHAR(100) NULL COMMENT 'Geographic location for local searches',
  last_checked DATETIME NULL,
  check_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'weekly',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for better performance
  INDEX idx_user_id (user_id),
  INDEX idx_client_id (client_id),
  INDEX idx_keyword (keyword),
  INDEX idx_current_rank (current_rank),
  INDEX idx_last_checked (last_checked),
  INDEX idx_is_active (is_active),
  INDEX idx_user_client (user_id, client_id),
  INDEX idx_keyword_client (keyword, client_id),
  
  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate tracking for same keyword/client/user
  UNIQUE KEY unique_user_client_keyword (user_id, client_id, keyword, search_engine, country)
);

-- Create keyword_rank_history table for tracking ranking changes over time
CREATE TABLE IF NOT EXISTS keyword_rank_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword_tracking_id INT NOT NULL,
  rank_position INT NULL COMMENT 'Ranking position at this check (null if not found)',
  check_date DATETIME NOT NULL,
  search_volume VARCHAR(50) NULL,
  competition_level VARCHAR(50) NULL,
  cpc DECIMAL(10,2) NULL COMMENT 'Cost per click',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for better performance
  INDEX idx_keyword_tracking_id (keyword_tracking_id),
  INDEX idx_check_date (check_date),
  INDEX idx_rank_position (rank_position),
  
  -- Foreign key constraint
  FOREIGN KEY (keyword_tracking_id) REFERENCES keyword_tracking(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_keyword_rank_history_tracking_date ON keyword_rank_history(keyword_tracking_id, check_date);
CREATE INDEX idx_keyword_tracking_active_keywords ON keyword_tracking(user_id, is_active, last_checked);