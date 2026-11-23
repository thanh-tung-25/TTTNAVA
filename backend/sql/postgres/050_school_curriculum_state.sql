CREATE TABLE IF NOT EXISTS school_curriculum_state (
 kind VARCHAR(10) NOT NULL CHECK (kind IN ('chapter','lesson')),
 target_id VARCHAR(90) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft','hidden','deleted')),
 updated_by CHAR(36) NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (kind,target_id)
);
ALTER TABLE school_curriculum_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE school_curriculum_state FROM PUBLIC,anon,authenticated;
