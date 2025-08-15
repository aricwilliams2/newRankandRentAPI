-- Users: add balance and allowances
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS free_minutes_remaining INT NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS free_minutes_last_reset DATETIME NULL,
  ADD COLUMN IF NOT EXISTS has_claimed_free_number TINYINT(1) NOT NULL DEFAULT 0;

-- Twilio call logs: billing flags
ALTER TABLE twilio_call_logs
  ADD COLUMN IF NOT EXISTS is_billed TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billed_minutes INT NULL,
  ADD COLUMN IF NOT EXISTS billed_amount DECIMAL(10,2) NULL;

-- User phone numbers: free flag and renewal tracking
ALTER TABLE user_phone_numbers
  ADD COLUMN IF NOT EXISTS is_free TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_renewal_at DATETIME NULL;


