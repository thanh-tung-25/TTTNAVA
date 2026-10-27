-- Bai thi: 20 cau / 15 phut, tu nop, an dung-sai den khi nop.
CREATE TABLE IF NOT EXISTS exam_attempts (
  id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  topic_id VARCHAR(60) NOT NULL,
  status ENUM('in_progress', 'submitted') NOT NULL DEFAULT 'in_progress',
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 900,
  seed CHAR(64) NOT NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ends_at DATETIME(3) NOT NULL,
  submitted_at DATETIME(3) NULL,
  answered_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  rewarded_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_exam_student_started (student_id, started_at),
  KEY idx_exam_student_status (student_id, status),
  KEY idx_exam_status_ends (status, ends_at),
  CONSTRAINT fk_exam_student FOREIGN KEY (student_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_exam_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE RESTRICT,
  CONSTRAINT chk_exam_duration CHECK (duration_seconds > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_questions (
  attempt_id CHAR(36) NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (attempt_id, position),
  UNIQUE KEY uq_exam_questions_question (attempt_id, question_id),
  CONSTRAINT fk_exam_questions_attempt FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_questions_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_answers (
  attempt_id CHAR(36) NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  answer_json JSON NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  answered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT fk_exam_answers_attempt FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
