-- Create leads table if it doesn't exist
-- Run this SQL in your MySQL database

CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(255) NULL,
    status ENUM('New', 'Contacted', 'Qualified', 'Converted', 'Lost') DEFAULT 'New',
    notes TEXT NULL,
    reviews INT NULL,
    website VARCHAR(255) NULL,
    contacted BOOLEAN DEFAULT FALSE,
    city VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);