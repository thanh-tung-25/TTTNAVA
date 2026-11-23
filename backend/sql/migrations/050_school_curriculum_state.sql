CREATE TABLE IF NOT EXISTS school_curriculum_state (
 kind VARCHAR(10) NOT NULL,
 target_id VARCHAR(90) NOT NULL,
 status ENUM('published','draft','hidden','deleted') NOT NULL DEFAULT 'published',
 updated_by CHAR(36) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (kind,target_id),
 CONSTRAINT chk_school_curriculum_kind CHECK (kind IN ('chapter','lesson'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
