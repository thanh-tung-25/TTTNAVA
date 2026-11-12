CREATE TABLE IF NOT EXISTS chinese_ai_chat_settings (
 lesson_id CHAR(36) PRIMARY KEY REFERENCES chinese_lessons(id) ON DELETE CASCADE,
 data JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chinese_ai_chat_sessions (
 id CHAR(36) PRIMARY KEY,student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 lesson_id CHAR(36) REFERENCES chinese_lessons(id) ON DELETE SET NULL,
 level_id SMALLINT NOT NULL,lesson_title VARCHAR(255) NOT NULL,is_preview SMALLINT NOT NULL DEFAULT 0,
 status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','expired')),
 turn_count SMALLINT NOT NULL DEFAULT 0,settings JSONB NOT NULL,context JSONB,summary JSONB,
 last_request CHAR(36),last_hash CHAR(64),last_response JSONB,lease_id CHAR(36),lease_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TIMESTAMPTZ NOT NULL,completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_chat_student_day ON chinese_ai_chat_sessions(student_id,created_at);
CREATE INDEX IF NOT EXISTS ai_chat_expiry ON chinese_ai_chat_sessions(status,expires_at);
ALTER TABLE chinese_ai_chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chinese_ai_chat_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chinese_ai_chat_settings,chinese_ai_chat_sessions FROM PUBLIC,anon,authenticated;
