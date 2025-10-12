-- Create predefined_questions table
CREATE TABLE IF NOT EXISTS predefined_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL UNIQUE,
  category VARCHAR(100) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
);

-- Insert 10 predefined security questions
INSERT INTO predefined_questions (question, category) VALUES
('What was the name of your first pet?', 'childhood'),
('What was the name of the street you grew up on?', 'childhood'),
('What was your mother\'s maiden name?', 'family'),
('What was the name of your elementary school?', 'education'),
('What was your childhood nickname?', 'childhood'),
('What was the make of your first car?', 'personal'),
('What was your favorite teacher\'s name?', 'education'),
('What city were you born in?', 'personal'),
('What was your favorite food as a child?', 'childhood'),
('What was the name of your first employer?', 'work');

-- Add comment to table
ALTER TABLE predefined_questions COMMENT = 'Stores predefined security questions that users can choose from';
