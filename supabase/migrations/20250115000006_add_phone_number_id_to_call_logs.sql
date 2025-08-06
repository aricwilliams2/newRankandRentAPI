-- Add phone_number_id to twilio_call_logs table to link calls to user's phone numbers
ALTER TABLE twilio_call_logs 
ADD COLUMN phone_number_id INT DEFAULT NULL,
ADD FOREIGN KEY (phone_number_id) REFERENCES user_phone_numbers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_twilio_call_logs_phone_number_id ON twilio_call_logs(phone_number_id);

-- Update existing call logs to link them with phone numbers where possible
UPDATE twilio_call_logs tcl
JOIN user_phone_numbers upn ON tcl.from_number = upn.phone_number
SET tcl.phone_number_id = upn.id
WHERE tcl.phone_number_id IS NULL AND tcl.from_number IS NOT NULL;