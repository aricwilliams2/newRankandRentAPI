-- Add whisper configuration fields to user_phone_numbers table
ALTER TABLE user_phone_numbers
  ADD COLUMN whisper_enabled TINYINT(1) DEFAULT 0,
  ADD COLUMN whisper_type VARCHAR(10) DEFAULT 'say' COMMENT 'say or play',
  ADD COLUMN whisper_text VARCHAR(255) NULL COMMENT 'TTS text to speak',
  ADD COLUMN whisper_voice VARCHAR(64) NULL DEFAULT 'alice' COMMENT 'TTS voice (alice, Polly.Matthew, etc.)',
  ADD COLUMN whisper_language VARCHAR(10) DEFAULT 'en-US' COMMENT 'Language code for TTS',
  ADD COLUMN whisper_media_url VARCHAR(512) NULL COMMENT 'URL to audio file for play type';

-- Add index for quick lookup
CREATE INDEX idx_user_phone_numbers_whisper_enabled ON user_phone_numbers(whisper_enabled);

