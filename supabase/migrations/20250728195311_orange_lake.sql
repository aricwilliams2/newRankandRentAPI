/*
# Add user_id columns to all tables

1. Table Updates
  - Add user_id column to leads, clients, websites, tasks, activity_log, phone_numbers tables
  - Add foreign key constraints referencing users table
  - Add indexes for better query performance

2. Security
  - All data now belongs to specific users
  - Proper referential integrity with foreign keys
*/

-- Add user_id to leads table
ALTER TABLE leads ADD COLUMN user_id VARCHAR(36) AFTER id;
ALTER TABLE leads ADD INDEX idx_user_id (user_id);
ALTER TABLE leads ADD CONSTRAINT fk_leads_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to clients table  
ALTER TABLE clients ADD COLUMN user_id VARCHAR(36) AFTER id;
ALTER TABLE clients ADD INDEX idx_clients_user_id (user_id);
ALTER TABLE clients ADD CONSTRAINT fk_clients_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to websites table
ALTER TABLE websites ADD COLUMN user_id VARCHAR(36) AFTER id;
ALTER TABLE websites ADD INDEX idx_websites_user_id (user_id);
ALTER TABLE websites ADD CONSTRAINT fk_websites_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to tasks table
ALTER TABLE tasks ADD COLUMN user_id VARCHAR(36) AFTER id;
ALTER TABLE tasks ADD INDEX idx_tasks_user_id (user_id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to activity_log table
ALTER TABLE activity_log ADD COLUMN user_id VARCHAR(36) AFTER id;
ALTER TABLE activity_log ADD INDEX idx_activity_user_id (user_id);
ALTER TABLE activity_log ADD CONSTRAINT fk_activity_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to phone_numbers table
ALTER TABLE phone_numbers ADD COLUMN user_id VARCHAR(36) AFTER id;
ALTER TABLE phone_numbers ADD INDEX idx_phone_user_id (user_id);
ALTER TABLE phone_numbers ADD CONSTRAINT fk_phone_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;