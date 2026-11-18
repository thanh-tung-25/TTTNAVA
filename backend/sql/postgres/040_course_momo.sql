-- The one-time cohort is a label; original entitlements and payment history stay intact.
CREATE TABLE IF NOT EXISTS course_payment_migrations (
 name VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS course_paid_access (
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id), origin VARCHAR(24) NOT NULL,
 order_id CHAR(36) NULL REFERENCES course_orders(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(student_id,course_id)
);
CREATE TABLE IF NOT EXISTS course_free_periods (
 id CHAR(36) PRIMARY KEY, course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
 cancelled_at TIMESTAMPTZ NULL, created_by CHAR(36) NULL REFERENCES profiles(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK(ends_at>starts_at)
);
CREATE INDEX IF NOT EXISTS course_free_periods_dates ON course_free_periods(course_id,cancelled_at,ends_at);
CREATE TABLE IF NOT EXISTS course_momo_settings (
 id CHAR(36) PRIMARY KEY, active SMALLINT NOT NULL DEFAULT 1,
 enabled SMALLINT NOT NULL DEFAULT 0, environment VARCHAR(16) NOT NULL,
 partner_code VARCHAR(100) NOT NULL, credentials TEXT NOT NULL,
 created_by CHAR(36) NULL REFERENCES profiles(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS course_momo_payments (
 order_id CHAR(36) PRIMARY KEY REFERENCES course_orders(id) ON DELETE CASCADE,
 settings_id CHAR(36) NOT NULL REFERENCES course_momo_settings(id),
 request_id VARCHAR(50) NOT NULL UNIQUE, state VARCHAR(24) NOT NULL DEFAULT 'creating',
 pay_url TEXT NULL, transaction_id VARCHAR(100) NULL UNIQUE,
 result_code INTEGER NULL, last_checked_at TIMESTAMPTZ NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TIMESTAMPTZ NULL
);
INSERT INTO course_paid_access(student_id,course_id,origin)
 SELECT e.student_id,e.course_id,'existing' FROM course_enrollments e
 WHERE NOT EXISTS(SELECT 1 FROM course_payment_migrations WHERE name='existing-paid-20261118')
 ON CONFLICT(student_id,course_id) DO NOTHING;
INSERT INTO course_payment_migrations(name) VALUES ('existing-paid-20261118') ON CONFLICT(name) DO NOTHING;
