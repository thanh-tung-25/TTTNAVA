CREATE TABLE IF NOT EXISTS chinese_levels (
 id TINYINT UNSIGNED PRIMARY KEY, title VARCHAR(100) NOT NULL, description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO chinese_levels (id,title) VALUES (1,'HSK 1'),(2,'HSK 2'),(3,'HSK 3'),(4,'HSK 4'),(5,'HSK 5'),(6,'HSK 6'),(7,'HSK 7'),(8,'HSK 8'),(9,'HSK 9');
CREATE TABLE IF NOT EXISTS chinese_lessons (
 id CHAR(36) PRIMARY KEY, level_id TINYINT UNSIGNED NOT NULL, title VARCHAR(255) NOT NULL,
 position INT UNSIGNED NOT NULL DEFAULT 1, description TEXT NULL, image_url VARCHAR(1000) NULL,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
 FOREIGN KEY (level_id) REFERENCES chinese_levels(id), INDEX(level_id,status,position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_documents (
 id CHAR(36) PRIMARY KEY, filename VARCHAR(255) NOT NULL, sha256 CHAR(64) NOT NULL,
 original MEDIUMBLOB NOT NULL, raw_text MEDIUMTEXT NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX(sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_sets (
 id CHAR(36) PRIMARY KEY, lesson_id CHAR(36) NOT NULL, document_id CHAR(36) NULL,
 title VARCHAR(255) NOT NULL, position INT UNSIGNED NOT NULL DEFAULT 1,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
 processing_status ENUM('review','ready') NOT NULL DEFAULT 'review',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (lesson_id) REFERENCES chinese_lessons(id), FOREIGN KEY(document_id) REFERENCES chinese_documents(id), INDEX(lesson_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_items (
 id CHAR(36) PRIMARY KEY, set_id CHAR(36) NOT NULL,
 kind ENUM('vocabulary','grammar','dialogue','reading','question','unknown') NOT NULL,
 position INT UNSIGNED NOT NULL DEFAULT 1, data JSON NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(set_id) REFERENCES chinese_sets(id), INDEX(set_id,active,kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_reviews (
 student_id CHAR(36) NOT NULL, item_id CHAR(36) NOT NULL,
 memory ENUM('new','review','remembered') NOT NULL DEFAULT 'new', favorite BOOLEAN NOT NULL DEFAULT FALSE,
 review_count INT UNSIGNED NOT NULL DEFAULT 0, wrong_count INT UNSIGNED NOT NULL DEFAULT 0,
 last_review DATETIME(3) NULL, next_review DATETIME(3) NULL, last_event CHAR(36) NULL,
 PRIMARY KEY(student_id,item_id), FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(item_id) REFERENCES chinese_items(id), INDEX(student_id,next_review)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_progress (
 student_id CHAR(36) NOT NULL, set_id CHAR(36) NOT NULL, last_item CHAR(36) NULL,
 read_items JSON NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(student_id,set_id), FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(set_id) REFERENCES chinese_sets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_tests (
 id CHAR(36) PRIMARY KEY, title VARCHAR(255) NOT NULL, set_ids JSON NOT NULL,
 duration_seconds INT UNSIGNED NULL, pass_percent INT UNSIGNED NOT NULL DEFAULT 70,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_attempts (
 id CHAR(36) PRIMARY KEY, student_id CHAR(36) NOT NULL, test_id CHAR(36) NULL, set_id CHAR(36) NULL,
 snapshot JSON NOT NULL, answers JSON NOT NULL, started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 ends_at DATETIME(3) NULL, finished_at DATETIME(3) NULL, score DECIMAL(5,2) NULL,
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(test_id) REFERENCES chinese_tests(id), FOREIGN KEY(set_id) REFERENCES chinese_sets(id), INDEX(student_id,started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS chinese_review_events (
 id CHAR(36) PRIMARY KEY, student_id CHAR(36) NOT NULL, item_id CHAR(36) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE, FOREIGN KEY(item_id) REFERENCES chinese_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
