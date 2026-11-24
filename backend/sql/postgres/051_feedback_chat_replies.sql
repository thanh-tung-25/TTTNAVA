ALTER TABLE learning_feedback
 ADD COLUMN IF NOT EXISTS reply_admin_id char(36) NULL REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_reply_admin ON learning_feedback(reply_admin_id);
