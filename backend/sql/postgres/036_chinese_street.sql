CREATE TABLE IF NOT EXISTS chinese_street_lessons (
 lesson_id CHAR(36) PRIMARY KEY REFERENCES chinese_lessons(id) ON DELETE CASCADE,
 data JSONB NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chinese_street_progress (
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 lesson_id CHAR(36) NOT NULL REFERENCES chinese_lessons(id) ON DELETE CASCADE,
 mission_id VARCHAR(50) NOT NULL,content_hash CHAR(64) NOT NULL,
 wrong_count INTEGER NOT NULL DEFAULT 0,best_stars SMALLINT NOT NULL DEFAULT 0,
 last_request CHAR(36),last_choice VARCHAR(50),last_response JSONB,
 completed_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id,lesson_id,mission_id,content_hash)
);
CREATE INDEX IF NOT EXISTS street_recent ON chinese_street_progress(updated_at);
ALTER TABLE chinese_street_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE chinese_street_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chinese_street_lessons,chinese_street_progress FROM PUBLIC,anon,authenticated;
