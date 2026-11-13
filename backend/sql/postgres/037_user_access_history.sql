CREATE TABLE IF NOT EXISTS user_access_tracking (
 id SMALLINT PRIMARY KEY,
 enabled_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 last_cleanup_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
INSERT INTO user_access_tracking(id) VALUES (1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS user_access_events (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 event_type VARCHAR(12) NOT NULL CHECK(event_type IN ('login','page','logout')),
 page_key VARCHAR(80) NOT NULL DEFAULT '',course_id VARCHAR(40),
 device_type VARCHAR(16) NOT NULL,browser VARCHAR(24) NOT NULL,
 visits_count INTEGER NOT NULL DEFAULT 1,dedup_key CHAR(64) UNIQUE,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 last_seen_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS access_profile_recent ON user_access_events(profile_id,last_seen_at,id);
CREATE INDEX IF NOT EXISTS access_retention ON user_access_events(last_seen_at);
ALTER TABLE user_access_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE user_access_tracking,user_access_events FROM PUBLIC,anon,authenticated;
