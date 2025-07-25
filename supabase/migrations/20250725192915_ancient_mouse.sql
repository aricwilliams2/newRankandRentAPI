-- Create clients table
-- Run this SQL in your MySQL database

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    website VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('new', 'active', 'inactive', 'suspended') DEFAULT 'new',
    revenue DECIMAL(10,2) DEFAULT 0.00,
    history TEXT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_website (website),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_email (email)
);