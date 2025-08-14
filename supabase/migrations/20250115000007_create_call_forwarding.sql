-- Create call_forwarding table for managing call forwarding settings
CREATE TABLE call_forwarding (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    phone_number_id INT NOT NULL,
    forward_to_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    forwarding_type ENUM('always', 'busy', 'no_answer', 'unavailable') DEFAULT 'always',
    ring_timeout INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (phone_number_id) REFERENCES user_phone_numbers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_phone_forwarding (user_id, phone_number_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_call_forwarding_user_id ON call_forwarding(user_id);
CREATE INDEX idx_call_forwarding_phone_number_id ON call_forwarding(phone_number_id);
CREATE INDEX idx_call_forwarding_active ON call_forwarding(is_active);


