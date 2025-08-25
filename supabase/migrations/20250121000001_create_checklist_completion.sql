-- Create checklist_completion table
CREATE TABLE IF NOT EXISTS checklist_completion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_id INT NOT NULL,
  checklist_item_id VARCHAR(50) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate entries for same user, client, and checklist item
  UNIQUE KEY unique_user_client_item (user_id, client_id, checklist_item_id),
  
  -- Indexes for better query performance
  INDEX idx_user_id (user_id),
  INDEX idx_client_id (client_id),
  INDEX idx_checklist_item_id (checklist_item_id),
  INDEX idx_user_client (user_id, client_id),
  INDEX idx_is_completed (is_completed)
);
