-- Create tables for dashboard functionality
-- Run this SQL in your MySQL database

-- Websites table
CREATE TABLE IF NOT EXISTS websites (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    domain VARCHAR(255) NOT NULL UNIQUE,
    niche VARCHAR(100) NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    monthly_revenue DECIMAL(10,2) DEFAULT 0.00,
    domain_authority INT DEFAULT 0,
    backlinks INT DEFAULT 0,
    organic_keywords INT DEFAULT 0,
    organic_traffic INT DEFAULT 0,
    top_keywords JSON NULL,
    competitors JSON NULL,
    seo_last_updated TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_domain (domain),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    website_id VARCHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status ENUM('todo', 'in_progress', 'completed') DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    assignee VARCHAR(255) NULL,
    due_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_website_id (website_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL
);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    website_id VARCHAR(36) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_website_id (website_id),
    INDEX idx_phone_number (phone_number),
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    website_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_website_id (website_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL
);