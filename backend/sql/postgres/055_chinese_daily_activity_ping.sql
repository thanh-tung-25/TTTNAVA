ALTER TABLE chinese_daily_study
 ADD COLUMN IF NOT EXISTS activity_ping_at TIMESTAMPTZ NULL;
