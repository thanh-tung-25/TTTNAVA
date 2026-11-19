CREATE TABLE IF NOT EXISTS school_study_guides (
 group_id VARCHAR(90) PRIMARY KEY,
 content_json JSON NOT NULL,
 source_sha256 CHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'published',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT chk_school_guide_status CHECK (status IN ('draft','published','hidden'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS school_quiz_links (
 run_id CHAR(36) PRIMARY KEY,
 group_id VARCHAR(90) NOT NULL,
 stage_index INT NOT NULL DEFAULT 1,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_school_quiz_run FOREIGN KEY (run_id) REFERENCES learning_runs(id) ON DELETE CASCADE,
 CONSTRAINT fk_school_quiz_guide FOREIGN KEY (group_id) REFERENCES school_study_guides(group_id) ON DELETE RESTRICT,
 CONSTRAINT chk_school_quiz_stage CHECK (stage_index>=1),
 KEY idx_school_quiz_group (group_id,stage_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
