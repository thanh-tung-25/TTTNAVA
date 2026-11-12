-- Assessment records contain text and scores only. No audio/video or media URLs.
CREATE TABLE IF NOT EXISTS chinese_speaking_submissions (
 id CHAR(36) PRIMARY KEY,
 student_id CHAR(36) NOT NULL,
 set_id CHAR(36) NULL,
 recording_id CHAR(36) NOT NULL,
 recording_code CHAR(8) NOT NULL,
 level_id TINYINT UNSIGNED NOT NULL,
 lesson_title VARCHAR(255) NOT NULL,
 set_title VARCHAR(255) NOT NULL,
 snapshot JSON NOT NULL,
 status ENUM('pending','grading','completed','needs_review','failed') NOT NULL DEFAULT 'pending',
 result JSON NULL,
 score DECIMAL(5,2) NULL,
 error_code VARCHAR(80) NULL,
 lease_id CHAR(36) NULL,
 recorded_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 completed_at DATETIME(3) NULL,
 UNIQUE KEY speaking_recording(student_id,recording_id),
 INDEX speaking_recent(created_at),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(set_id) REFERENCES chinese_sets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_speaking_clips (
 submission_id CHAR(36) NOT NULL,
 question_index SMALLINT UNSIGNED NOT NULL,
 chunk_index SMALLINT UNSIGNED NOT NULL,
 audio_hash CHAR(64) NOT NULL,
 status ENUM('processing','completed','failed') NOT NULL DEFAULT 'processing',
 lease_id CHAR(36) NOT NULL,
 result JSON NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(submission_id,question_index,chunk_index),
 FOREIGN KEY(submission_id) REFERENCES chinese_speaking_submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
