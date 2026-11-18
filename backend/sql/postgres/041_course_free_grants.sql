-- No existing row is changed by this migration.
CREATE TABLE IF NOT EXISTS course_free_grants (
 id CHAR(36) PRIMARY KEY, student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
 granted_by CHAR(36) NULL REFERENCES profiles(id) ON DELETE SET NULL,
 note VARCHAR(500) NOT NULL DEFAULT '', revoked_at TIMESTAMPTZ NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(student_id,course_id), CHECK(ends_at>starts_at)
);
