-- Create user_phone_numbers table for multi-user calling platform
CREATE TABLE user_phone_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    twilio_sid VARCHAR(255) UNIQUE NOT NULL,
    friendly_name VARCHAR(255),
    country VARCHAR(10) DEFAULT 'US',
    region VARCHAR(100),
    locality VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    purchase_price DECIMAL(10,4),
    purchase_price_unit VARCHAR(10) DEFAULT 'USD',
    monthly_cost DECIMAL(10,4) DEFAULT 1.00,
    capabilities JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint for user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX idx_user_phone_numbers_phone_number ON user_phone_numbers(phone_number);
CREATE INDEX idx_user_phone_numbers_twilio_sid ON user_phone_numbers(twilio_sid);
CREATE INDEX idx_user_phone_numbers_is_active ON user_phone_numbers(is_active);
CREATE INDEX idx_user_phone_numbers_created_at ON user_phone_numbers(created_at);

-- Add a unique constraint to ensure one user can't buy the same number twice
CREATE UNIQUE INDEX idx_user_phone_numbers_unique ON user_phone_numbers(user_id, phone_number);