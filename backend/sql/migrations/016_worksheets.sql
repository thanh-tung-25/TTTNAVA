CREATE TABLE IF NOT EXISTS worksheets (
 id CHAR(36) PRIMARY KEY, title VARCHAR(180) NOT NULL, grade TINYINT UNSIGNED NOT NULL,
 subject_id VARCHAR(20) NOT NULL DEFAULT 'toan', status ENUM('draft','published','hidden') NOT NULL DEFAULT 'draft',
 items JSON NOT NULL, version INT UNSIGNED NOT NULL DEFAULT 1, created_by CHAR(36) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY(created_by) REFERENCES profiles(id) ON DELETE SET NULL, INDEX(grade,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS worksheet_images (
 id CHAR(36) PRIMARY KEY, worksheet_id CHAR(36) NOT NULL, image MEDIUMBLOB NOT NULL, mime_type VARCHAR(32) NOT NULL,
 FOREIGN KEY(worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS worksheet_attempts (
 id CHAR(36) PRIMARY KEY, worksheet_id CHAR(36) NOT NULL, student_id CHAR(36) NOT NULL, grade TINYINT UNSIGNED NOT NULL,
 snapshot JSON NOT NULL, answers JSON NOT NULL, results JSON NULL, score DECIMAL(5,2) NULL,
 status ENUM('in_progress','pending_review','completed') NOT NULL DEFAULT 'in_progress',
 started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), submitted_at DATETIME(3) NULL,
 reviewed_by CHAR(36) NULL, reviewed_at DATETIME(3) NULL,
 FOREIGN KEY(worksheet_id) REFERENCES worksheets(id), FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL, INDEX(student_id,worksheet_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
