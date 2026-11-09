CREATE TABLE IF NOT EXISTS learning_feedback (
 id char(36) PRIMARY KEY,
 reporter_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 scope varchar(12) NOT NULL CHECK(scope IN ('general','primary','chinese')),
 category varchar(24) NOT NULL,
 message text NOT NULL,
 page_url varchar(1000) NOT NULL,
 context_text varchar(2000) NOT NULL DEFAULT '',
 status varchar(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved')),
 reply varchar(2000) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feedback_scope ON learning_feedback(scope,status,created_at);
ALTER TABLE learning_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE learning_feedback FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS learning_goals (
 student_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id varchar(32) NOT NULL,
 target_days smallint NOT NULL DEFAULT 3 CHECK(target_days BETWEEN 1 AND 7),
 PRIMARY KEY(student_id,course_id)
);
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE learning_goals FROM PUBLIC,anon,authenticated;
