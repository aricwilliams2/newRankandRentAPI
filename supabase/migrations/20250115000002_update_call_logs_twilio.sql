-- Update call_logs table to support Twilio integration
ALTER TABLE call_logs 
ADD COLUMN user_id INT,
ADD COLUMN call_sid VARCHAR(255),
ADD COLUMN from_number VARCHAR(20),
ADD COLUMN to_number VARCHAR(20),
ADD COLUMN status VARCHAR(50),
ADD COLUMN direction VARCHAR(50),
ADD COLUMN price DECIMAL(10,4),
ADD COLUMN price_unit VARCHAR(10),
ADD COLUMN recording_url TEXT,
ADD COLUMN recording_sid VARCHAR(255),
ADD COLUMN recording_duration INT,
ADD COLUMN recording_channels INT,
ADD COLUMN recording_status VARCHAR(50);

-- Add indexes for better performance
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);

-- Add foreign key constraint for user_id
ALTER TABLE call_logs 
ADD CONSTRAINT fk_call_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; 