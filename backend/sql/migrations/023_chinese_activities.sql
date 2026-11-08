CREATE TABLE IF NOT EXISTS chinese_activities (
 lesson_id CHAR(36) NOT NULL PRIMARY KEY,
 status VARCHAR(20) NOT NULL DEFAULT 'draft',
 data JSON NOT NULL,
 revision INT NOT NULL DEFAULT 1,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_chinese_activities_lesson FOREIGN KEY (lesson_id) REFERENCES chinese_lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
