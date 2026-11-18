-- Additive only: never rewrite existing orders, enrollments or learning data.
CREATE TABLE IF NOT EXISTS course_payment_migrations (
 name VARCHAR(80) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS course_paid_access (
 student_id CHAR(36) NOT NULL, course_id VARCHAR(32) NOT NULL,
 origin VARCHAR(24) NOT NULL, order_id CHAR(36) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(student_id,course_id),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id),
 FOREIGN KEY(order_id) REFERENCES course_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS course_free_periods (
 id CHAR(36) PRIMARY KEY, course_id VARCHAR(32) NOT NULL,
 starts_at DATETIME(3) NOT NULL, ends_at DATETIME(3) NOT NULL,
 cancelled_at DATETIME(3) NULL, created_by CHAR(36) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(course_id) REFERENCES courses(id),
 FOREIGN KEY(created_by) REFERENCES profiles(id) ON DELETE SET NULL,
 INDEX(course_id,cancelled_at,ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS course_momo_settings (
 id CHAR(36) PRIMARY KEY, active BOOLEAN NOT NULL DEFAULT TRUE,
 enabled BOOLEAN NOT NULL DEFAULT FALSE, environment VARCHAR(16) NOT NULL,
 partner_code VARCHAR(100) NOT NULL, credentials TEXT NOT NULL,
 created_by CHAR(36) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS course_momo_payments (
 order_id CHAR(36) PRIMARY KEY, settings_id CHAR(36) NOT NULL,
 request_id VARCHAR(50) NOT NULL UNIQUE, state VARCHAR(24) NOT NULL DEFAULT 'creating',
 pay_url TEXT NULL, transaction_id VARCHAR(100) NULL UNIQUE,
 result_code INT NULL, last_checked_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), paid_at DATETIME(3) NULL,
 FOREIGN KEY(order_id) REFERENCES course_orders(id) ON DELETE CASCADE,
 FOREIGN KEY(settings_id) REFERENCES course_momo_settings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO course_paid_access(student_id,course_id,origin)
 SELECT e.student_id,e.course_id,'existing' FROM course_enrollments e
 WHERE NOT EXISTS(SELECT 1 FROM course_payment_migrations WHERE name='existing-paid-20261118');
INSERT IGNORE INTO course_payment_migrations(name) VALUES ('existing-paid-20261118');
