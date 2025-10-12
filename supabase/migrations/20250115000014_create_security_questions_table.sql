-- Create security_questions table
CREATE TABLE IF NOT EXISTS security_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  predefined_question_id INT NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (predefined_question_id) REFERENCES predefined_questions(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_predefined_question_id (predefined_question_id),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_user_question (user_id, predefined_question_id)
);

-- Add comment to table
ALTER TABLE security_questions COMMENT = 'Stores user security questions and hashed answers for password recovery';
