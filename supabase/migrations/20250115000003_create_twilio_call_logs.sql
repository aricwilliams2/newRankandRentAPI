-- Create a dedicated table for Twilio call logs
CREATE TABLE twilio_call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    call_sid VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    direction VARCHAR(50),
    price DECIMAL(10,4),
    price_unit VARCHAR(10),
    recording_url TEXT,
    recording_sid VARCHAR(255),
    recording_duration INT,
    recording_channels INT,
    recording_status VARCHAR(50),
    duration INT,
    start_time DATETIME,
    end_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint for user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_twilio_call_logs_user_id ON twilio_call_logs(user_id);
CREATE INDEX idx_twilio_call_logs_call_sid ON twilio_call_logs(call_sid);
CREATE INDEX idx_twilio_call_logs_status ON twilio_call_logs(status);
CREATE INDEX idx_twilio_call_logs_created_at ON twilio_call_logs(created_at);
CREATE INDEX idx_twilio_call_logs_from_number ON twilio_call_logs(from_number);
CREATE INDEX idx_twilio_call_logs_to_number ON twilio_call_logs(to_number); 