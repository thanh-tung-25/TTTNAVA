CREATE TABLE IF NOT EXISTS learning_feedback (
 id char(36) PRIMARY KEY,
 reporter_id char(36) NOT NULL,
 scope varchar(12) NOT NULL,
 category varchar(24) NOT NULL,
 message text NOT NULL,
 page_url varchar(1000) NOT NULL,
 context_text varchar(2000) NOT NULL DEFAULT '',
 status varchar(16) NOT NULL DEFAULT 'open',
 reply varchar(2000) NOT NULL DEFAULT '',
 created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(reporter_id) REFERENCES profiles(id) ON DELETE CASCADE,
 INDEX idx_feedback_scope(scope,status,created_at)
);
CREATE TABLE IF NOT EXISTS learning_goals (
 student_id char(36) NOT NULL,
 course_id varchar(32) NOT NULL,
 target_days smallint NOT NULL DEFAULT 3,
 PRIMARY KEY(student_id,course_id),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE
);
