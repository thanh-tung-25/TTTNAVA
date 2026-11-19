CREATE TABLE IF NOT EXISTS school_study_guides (
 group_id VARCHAR(90) PRIMARY KEY,
 content_json JSONB NOT NULL,
 source_sha256 CHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS school_quiz_links (
 run_id CHAR(36) PRIMARY KEY REFERENCES learning_runs(id) ON DELETE CASCADE,
 group_id VARCHAR(90) NOT NULL REFERENCES school_study_guides(group_id) ON DELETE RESTRICT,
 stage_index INTEGER NOT NULL DEFAULT 1 CHECK (stage_index>=1),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_school_quiz_group ON school_quiz_links(group_id,stage_index);
ALTER TABLE school_study_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_quiz_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE school_study_guides,school_quiz_links FROM PUBLIC,anon,authenticated;
