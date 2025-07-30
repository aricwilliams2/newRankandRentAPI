-- Add user_id columns to tables that don't have them yet
-- Run this SQL script to update your database schema

-- Add user_id to websites table if it doesn't exist
ALTER TABLE websites ADD COLUMN user_id INT NULL;

-- Add user_id to clients table if it doesn't exist  
ALTER TABLE clients ADD COLUMN user_id INT NULL;

-- Add user_id to tasks table if it doesn't exist
ALTER TABLE tasks ADD COLUMN user_id INT NULL;

-- Add indexes for better performance
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_leads_user_id ON leads(user_id);

-- Optional: Add foreign key constraints (uncomment if you want strict referential integrity)
-- ALTER TABLE websites ADD CONSTRAINT fk_websites_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE clients ADD CONSTRAINT fk_clients_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE leads ADD CONSTRAINT fk_leads_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;