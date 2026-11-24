ALTER TABLE learning_feedback
 ADD COLUMN reply_admin_id CHAR(36) NULL AFTER reply,
 ADD CONSTRAINT fk_learning_feedback_reply_admin
  FOREIGN KEY(reply_admin_id) REFERENCES profiles(id) ON DELETE SET NULL;
