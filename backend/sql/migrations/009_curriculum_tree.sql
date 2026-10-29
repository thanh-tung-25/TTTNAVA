-- Cay chuong trinh hoc cho trang quan tri cau hoi.
-- Cau hoi van gan voi topics; moi bai hoc tro den mot topic co san.
CREATE TABLE IF NOT EXISTS school_years (
  id VARCHAR(20) NOT NULL,
  name VARCHAR(80) NOT NULL,
  starts_on DATE NULL,
  ends_on DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_school_years_active (is_active, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS curriculum_chapters (
  id VARCHAR(90) NOT NULL,
  school_year_id VARCHAR(20) NOT NULL,
  grade TINYINT UNSIGNED NOT NULL,
  semester ENUM('hk1', 'hk2') NOT NULL,
  subject_id VARCHAR(20) NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_curriculum_chapters_scope (school_year_id, grade, semester, subject_id, sort_order),
  CONSTRAINT fk_curriculum_chapters_year FOREIGN KEY (school_year_id) REFERENCES school_years (id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_chapters_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT chk_curriculum_chapters_grade CHECK (grade BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS curriculum_lessons (
  id VARCHAR(90) NOT NULL,
  chapter_id VARCHAR(90) NOT NULL,
  topic_id VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curriculum_lessons_topic (chapter_id, topic_id),
  KEY idx_curriculum_lessons_chapter (chapter_id, sort_order),
  KEY idx_curriculum_lessons_topic (topic_id),
  CONSTRAINT fk_curriculum_lessons_chapter FOREIGN KEY (chapter_id) REFERENCES curriculum_chapters (id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_lessons_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
