-- Ngan hang cau hoi. Bang question_answers KHONG BAO GIO duoc tra ve client truc tiep.
CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(20) NOT NULL,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  color VARCHAR(7) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_slug (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS topics (
  id VARCHAR(60) NOT NULL,
  subject_id VARCHAR(20) NOT NULL,
  grade TINYINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_topics_subject_grade_slug (subject_id, grade, slug),
  KEY idx_topics_subject_grade (subject_id, grade, sort_order),
  CONSTRAINT fk_topics_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT chk_topics_grade CHECK (grade BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(80) NOT NULL,
  topic_id VARCHAR(60) NOT NULL,
  type ENUM('single_choice', 'multiple_choice', 'true_false', 'fill_in') NOT NULL,
  prompt VARCHAR(1000) NOT NULL,
  image_url VARCHAR(500) NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  status ENUM('visible', 'hidden') NOT NULL DEFAULT 'visible',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_questions_topic_status (topic_id, status),
  KEY idx_questions_type (type),
  CONSTRAINT fk_questions_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE,
  CONSTRAINT chk_questions_prompt CHECK (CHAR_LENGTH(TRIM(prompt)) > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id VARCHAR(80) NOT NULL,
  opt_key CHAR(1) NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_question_options_key (question_id, opt_key),
  KEY idx_question_options_question (question_id, sort_order),
  CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
  CONSTRAINT chk_question_options_key CHECK (opt_key BETWEEN 'a' AND 'e')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS question_answers (
  question_id VARCHAR(80) NOT NULL,
  answer_json JSON NOT NULL,
  explanation TEXT NOT NULL,
  PRIMARY KEY (question_id),
  CONSTRAINT fk_question_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Nhat ky ghi cau hoi nguyen tu (transaction + ghi vet).
CREATE TABLE IF NOT EXISTS atomic_question_writes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id VARCHAR(80) NOT NULL,
  admin_id CHAR(36) NOT NULL,
  action ENUM('update', 'hide', 'show') NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_atomic_question_writes_question (question_id, created_at),
  CONSTRAINT fk_atomic_question_writes_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
  CONSTRAINT fk_atomic_question_writes_admin FOREIGN KEY (admin_id) REFERENCES profiles (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
