ALTER TABLE ttnava_stage.learning_feedback
 ADD COLUMN IF NOT EXISTS reply_admin_id char(36) NULL REFERENCES ttnava_stage.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_reply_admin ON ttnava_stage.learning_feedback(reply_admin_id);
