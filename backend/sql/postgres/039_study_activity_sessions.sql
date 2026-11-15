CREATE TABLE IF NOT EXISTS study_activity_sessions (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 activity VARCHAR(24) NOT NULL,
 source_id VARCHAR(80) NOT NULL,
 unit_key VARCHAR(30) NOT NULL,
 snapshot JSONB NOT NULL,
 result JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS study_activity_owner ON study_activity_sessions(profile_id,created_at);
ALTER TABLE study_activity_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE study_activity_sessions FROM PUBLIC,anon,authenticated;
