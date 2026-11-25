ALTER TABLE chinese_attempts
 ADD COLUMN IF NOT EXISTS active_seconds INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS activity_ping_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS chinese_daily_study (
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 study_day DATE NOT NULL,
 active_seconds INTEGER NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(profile_id,study_day)
);
ALTER TABLE chinese_daily_study ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chinese_daily_study FROM PUBLIC,anon,authenticated;
