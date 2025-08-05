-- Remove Twilio-related fields from call_logs table since we now have a separate twilio_call_logs table
ALTER TABLE call_logs
DROP FOREIGN KEY fk_call_logs_user_id,
DROP COLUMN user_id,
DROP COLUMN call_sid,
DROP COLUMN from_number,
DROP COLUMN to_number,
DROP COLUMN status,
DROP COLUMN direction,
DROP COLUMN price,
DROP COLUMN price_unit,
DROP COLUMN recording_url,
DROP COLUMN recording_sid,
DROP COLUMN recording_duration,
DROP COLUMN recording_channels,
DROP COLUMN recording_status;

-- Remove indexes that were added for Twilio fields
DROP INDEX IF EXISTS idx_call_logs_user_id ON call_logs;
DROP INDEX IF EXISTS idx_call_logs_call_sid ON call_logs;
DROP INDEX IF EXISTS idx_call_logs_status ON call_logs;
DROP INDEX IF EXISTS idx_call_logs_created_at ON call_logs; 