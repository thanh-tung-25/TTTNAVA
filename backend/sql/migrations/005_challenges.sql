-- Thach dau 1-1 tu nhip + Robot. question_ids duoc an khoi client.
CREATE TABLE IF NOT EXISTS challenges (
  id CHAR(36) NOT NULL,
  challenger_id CHAR(36) NOT NULL,
  opponent_id CHAR(36) NOT NULL,
  subject_id VARCHAR(20) NOT NULL,
  grade TINYINT UNSIGNED NOT NULL,
  topic_id VARCHAR(60) NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 600,
  bot_level ENUM('easy', 'medium', 'hard') NULL,
  status ENUM('pending', 'accepted', 'in_progress', 'finished', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  seed CHAR(64) NOT NULL,
  question_ids JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL,
  accepted_at DATETIME(3) NULL,
  started_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  winner_id CHAR(36) NULL,
  cancelled_reason VARCHAR(60) NULL,
  result_json JSON NULL,
  PRIMARY KEY (id),
  KEY idx_challenges_challenger_status (challenger_id, status, created_at),
  KEY idx_challenges_opponent_status (opponent_id, status, created_at),
  KEY idx_challenges_status_ends (status, ends_at),
  CONSTRAINT fk_challenges_challenger FOREIGN KEY (challenger_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_challenges_opponent FOREIGN KEY (opponent_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_challenges_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
  CONSTRAINT fk_challenges_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE RESTRICT,
  CONSTRAINT fk_challenges_winner FOREIGN KEY (winner_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT chk_challenges_duration CHECK (duration_seconds > 0),
  CONSTRAINT chk_challenges_grade CHECK (grade BETWEEN 1 AND 5),
  CONSTRAINT chk_challenges_bot CHECK (bot_level IS NULL OR opponent_id = '00000000-0000-4000-8000-000000000b07')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenge_answers (
  challenge_id CHAR(36) NOT NULL,
  profile_id CHAR(36) NOT NULL,
  q_index INT UNSIGNED NOT NULL,
  question_id VARCHAR(80) NOT NULL,
  answer_json JSON NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  answered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (challenge_id, profile_id, q_index),
  KEY idx_challenge_answers_profile (challenge_id, profile_id),
  CONSTRAINT fk_challenge_answers_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (id) ON DELETE CASCADE,
  CONSTRAINT fk_challenge_answers_profile FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_challenge_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Moi tran chi duoc thuong mot lan (unique challenge_id).
CREATE TABLE IF NOT EXISTS challenge_rewards (
  challenge_id CHAR(36) NOT NULL,
  awarded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  detail_json JSON NULL,
  PRIMARY KEY (challenge_id),
  CONSTRAINT fk_challenge_rewards_challenge FOREIGN KEY (challenge_id) REFERENCES challenges (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
