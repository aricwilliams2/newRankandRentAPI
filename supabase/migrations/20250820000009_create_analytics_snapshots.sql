-- Create analytics_snapshots table to store per-user analytics payloads
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  url VARCHAR(512) NULL,
  mode VARCHAR(32) NULL,
  snapshot_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_snapshots_user_created (user_id, created_at)
);


