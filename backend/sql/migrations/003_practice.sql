-- Luyen tap: moi luot 10 cau, cham ngay tren server.
CREATE TABLE IF NOT EXISTS practice_sessions (
  id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  topic_id VARCHAR(60) NOT NULL,
  status ENUM('in_progress', 'finished') NOT NULL DEFAULT 'in_progress',
  total_questions SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  answered_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  correct_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  seed CHAR(64) NOT NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  rewarded_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_practice_student_topic (student_id, topic_id, started_at),
  KEY idx_practice_student_status (student_id, status, started_at),
  CONSTRAINT fk_practice_student FOREIGN KEY (student_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_practice_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS practice_questions (
  session_id CHAR(36) NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (session_id, position),
  UNIQUE KEY uq_practice_questions_question (session_id, question_id),
  CONSTRAINT fk_practice_questions_session FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_questions_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS practice_answers (
  session_id CHAR(36) NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  answer_json JSON NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  answered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (session_id, question_id),
  CONSTRAINT fk_practice_answers_session FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Chong chot trung (idempotent) cho ca luyen tap va bai thi.
CREATE TABLE IF NOT EXISTS finish_guard (
  ref_type ENUM('practice', 'exam') NOT NULL,
  ref_id CHAR(36) NOT NULL,
  finished_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (ref_type, ref_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
