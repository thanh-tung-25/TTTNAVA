CREATE TABLE IF NOT EXISTS course_registration_free (
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 registered_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id,course_id)
);
