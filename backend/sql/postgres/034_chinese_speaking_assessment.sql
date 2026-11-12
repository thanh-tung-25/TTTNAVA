CREATE TABLE IF NOT EXISTS chinese_speaking_submissions (
 id CHAR(36) PRIMARY KEY,student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 set_id CHAR(36) REFERENCES chinese_sets(id) ON DELETE SET NULL,recording_id CHAR(36) NOT NULL,
 recording_code VARCHAR(8) NOT NULL,level_id SMALLINT NOT NULL,
 lesson_title VARCHAR(255) NOT NULL,set_title VARCHAR(255) NOT NULL,snapshot JSONB NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','grading','completed','needs_review','failed')),
 result JSONB,score NUMERIC(5,2),error_code VARCHAR(80),lease_id CHAR(36),
 recorded_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TIMESTAMPTZ,
 UNIQUE(student_id,recording_id)
);
CREATE INDEX IF NOT EXISTS chinese_speaking_recent ON chinese_speaking_submissions(created_at);
CREATE TABLE IF NOT EXISTS chinese_speaking_clips (
 submission_id CHAR(36) NOT NULL REFERENCES chinese_speaking_submissions(id) ON DELETE CASCADE,
 question_index SMALLINT NOT NULL,chunk_index SMALLINT NOT NULL,audio_hash CHAR(64) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','completed','failed')),
 lease_id CHAR(36) NOT NULL,result JSONB,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(submission_id,question_index,chunk_index)
);
ALTER TABLE chinese_speaking_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chinese_speaking_clips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chinese_speaking_submissions,chinese_speaking_clips FROM PUBLIC,anon,authenticated;
