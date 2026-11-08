-- Apply in the configured application schema.
CREATE TABLE IF NOT EXISTS chinese_activities (
 lesson_id char(36) PRIMARY KEY REFERENCES chinese_lessons(id) ON DELETE CASCADE,
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 data jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE chinese_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chinese_activities FROM PUBLIC, anon, authenticated;
