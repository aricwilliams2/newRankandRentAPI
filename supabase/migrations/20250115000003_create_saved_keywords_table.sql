-- Create saved_keywords table
CREATE TABLE IF NOT EXISTS saved_keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  difficulty VARCHAR(50),
  volume VARCHAR(50),
  last_updated DATETIME,
  search_engine VARCHAR(50) DEFAULT 'google',
  country VARCHAR(10) DEFAULT 'us',
  category ENUM('idea', 'question') DEFAULT 'idea',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for better performance
  INDEX idx_user_id (user_id),
  INDEX idx_keyword (keyword),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at),
  
  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate keywords per user
  UNIQUE KEY unique_user_keyword (user_id, keyword, category)
);

-- Add some sample data for testing (optional)
-- INSERT INTO saved_keywords (user_id, keyword, difficulty, volume, last_updated, search_engine, country, category) VALUES
-- (1, 'local seo services', 'Hard', '>10k', '2025-08-22T14:14:07Z', 'google', 'us', 'idea'),
-- (1, 'how to do local seo', 'Hard', '>100', '2025-08-22T03:07:45Z', 'google', 'us', 'question');
