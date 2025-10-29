-- Create phone_number_whispers table for storing audio files in database
CREATE TABLE phone_number_whispers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number_id INT NOT NULL,
  mime VARCHAR(100) NOT NULL DEFAULT 'audio/webm',
  duration_seconds INT NULL,
  bytes LONGBLOB NOT NULL,
  size_bytes INT NOT NULL,
  note VARCHAR(255) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (phone_number_id) REFERENCES user_phone_numbers(id) ON DELETE CASCADE,
  INDEX idx_phone_number_whispers_phone_number_id (phone_number_id),
  INDEX idx_phone_number_whispers_active (is_active)
);

-- Add column to user_phone_numbers to reference active whisper
ALTER TABLE user_phone_numbers
  ADD COLUMN active_whisper_id INT NULL,
  ADD FOREIGN KEY (active_whisper_id) REFERENCES phone_number_whispers(id) ON DELETE SET NULL;

