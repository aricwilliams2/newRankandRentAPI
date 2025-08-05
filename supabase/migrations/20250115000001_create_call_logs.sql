-- Create call_logs table for tracking call history
CREATE TABLE IF NOT EXISTS call_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lead_id BIGINT UNSIGNED NOT NULL,
    outcome ENUM('follow_up_1_day', 'follow_up_72_hours', 'follow_up_next_week', 'follow_up_next_month', 'follow_up_3_months') NOT NULL,
    notes TEXT,
    next_follow_up DATETIME NULL,
    duration INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_call_logs_lead_id (lead_id),
    INDEX idx_call_logs_next_follow_up (next_follow_up),
    INDEX idx_call_logs_created_at (created_at),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
); 