-- Additive student experience: preferences, real graded learning, rewards, assignments and approved guardian links.
ALTER TABLE profiles ADD COLUMN account_kind VARCHAR(16) NOT NULL DEFAULT 'student' CHECK(account_kind IN ('student','guardian'));
ALTER TABLE diamond_ledger MODIFY reason ENUM('practice_complete','practice_perfect','exam_complete','exam_perfect','challenge_win','challenge_draw','challenge_loss','chinese_complete','chinese_perfect','chinese_low','quest_reward','store_purchase') NOT NULL, MODIFY ref_type ENUM('practice','exam','challenge','chinese','quest','store') NOT NULL;

CREATE TABLE student_preferences (
 profile_id CHAR(36) PRIMARY KEY,
 minutes INT NOT NULL DEFAULT 10 CHECK (minutes IN (5,10,15)),
 font_scale VARCHAR(16) NOT NULL DEFAULT 'normal' CHECK (font_scale IN ('normal','large')),
 speech_rate DECIMAL(3,2) NOT NULL DEFAULT 1 CHECK (speech_rate BETWEEN 0.5 AND 1.5),
 effects_enabled INT NOT NULL DEFAULT 1 CHECK (effects_enabled IN (0,1)),
 companion VARCHAR(16) NOT NULL DEFAULT 'owl' CHECK (companion IN ('owl','panda','bunny')),
 companion_name VARCHAR(40) NOT NULL DEFAULT 'Cú nhỏ',
 equipped_frame VARCHAR(40) NULL, equipped_background VARCHAR(40) NULL,
 onboarding_at DATETIME(3) NULL,
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_focus (
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL,
 topic_id VARCHAR(60) NULL,
 set_id CHAR(36) NULL,
 PRIMARY KEY(profile_id,course_id),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
 FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE SET NULL,
 FOREIGN KEY(set_id) REFERENCES chinese_sets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_runs (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL,
 run_kind VARCHAR(20) NOT NULL CHECK (run_kind IN ('daily','review','weekend','duel','assignment','diagnostic')),
 title VARCHAR(180) NOT NULL,
 items_json JSON NOT NULL, answers_json JSON NOT NULL, draft_json JSON NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','finished')),
 revision INT NOT NULL DEFAULT 0,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at DATETIME(3) NULL,
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_skill_state (
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL, skill_key VARCHAR(80) NOT NULL,
 label VARCHAR(180) NOT NULL, attempts INT NOT NULL DEFAULT 0,
 correct_count INT NOT NULL DEFAULT 0, spaced_successes INT NOT NULL DEFAULT 0,
 last_success_day DATE NULL, last_seen_at DATETIME(3) NULL, next_review_at DATETIME(3) NULL,
 PRIMARY KEY(profile_id,course_id,skill_key),
 CHECK (attempts>=0 AND correct_count>=0 AND spaced_successes>=0),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE learning_events (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL, event_kind VARCHAR(30) NOT NULL,
 ref_id CHAR(36) NOT NULL, event_day DATE NOT NULL,
 details_json JSON NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(profile_id,event_kind,ref_id),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_quest_claims (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL, claim_day DATE NOT NULL,
 task_key VARCHAR(32) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(profile_id,course_id,claim_day,task_key),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_inventory (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 sku VARCHAR(40) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(profile_id,sku),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_badges (
 profile_id CHAR(36) NOT NULL,
 badge_key VARCHAR(40) NOT NULL, awarded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(profile_id,badge_key),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_gallery (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL,
 title VARCHAR(120) NOT NULL, body TEXT NOT NULL, revision INT NOT NULL DEFAULT 0,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_assignments (
 id CHAR(36) PRIMARY KEY,
 creator_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL,
 title VARCHAR(120) NOT NULL, description TEXT NOT NULL,
 assignment_kind VARCHAR(16) NOT NULL CHECK (assignment_kind IN ('quiz','writing')),
 topic_id VARCHAR(60) NULL, set_id CHAR(36) NULL,
 question_count INT NOT NULL DEFAULT 5 CHECK(question_count IN (5,10,15)),
 due_at DATETIME(3) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(creator_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id),
 FOREIGN KEY(topic_id) REFERENCES topics(id),
 FOREIGN KEY(set_id) REFERENCES chinese_sets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE study_assignment_members (
 assignment_id CHAR(36) NOT NULL,
 student_id CHAR(36) NOT NULL,
 run_id CHAR(36) NULL,
 draft_text TEXT NULL, draft_revision INT NOT NULL DEFAULT 0, submitted_at DATETIME(3) NULL,
 feedback TEXT NULL, teacher_score INT NULL CHECK (teacher_score BETWEEN 0 AND 100),
 reviewed_at DATETIME(3) NULL, PRIMARY KEY(assignment_id,student_id),
 FOREIGN KEY(assignment_id) REFERENCES study_assignments(id) ON DELETE CASCADE,
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(run_id) REFERENCES learning_runs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE async_learning_duels (
 id CHAR(36) PRIMARY KEY,
 creator_id CHAR(36) NOT NULL,
 opponent_id CHAR(36) NOT NULL,
 course_id VARCHAR(32) NOT NULL,
 creator_run_id CHAR(36) NOT NULL,
 opponent_run_id CHAR(36) NULL,
 duel_kind VARCHAR(20) NOT NULL CHECK (duel_kind IN ('competitive','cooperative')),
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','finished','declined')),
 expires_at DATETIME(3) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(creator_id<>opponent_id),
 FOREIGN KEY(creator_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(opponent_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id),
 FOREIGN KEY(creator_run_id) REFERENCES learning_runs(id) ON DELETE CASCADE,
 FOREIGN KEY(opponent_run_id) REFERENCES learning_runs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guardian_pair_codes (
 id CHAR(36) PRIMARY KEY,
 student_id CHAR(36) NOT NULL,
 code_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME(3) NOT NULL, consumed_at DATETIME(3) NULL,
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guardian_links (
 id CHAR(36) PRIMARY KEY,
 guardian_id CHAR(36) NOT NULL,
 student_id CHAR(36) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(guardian_id,student_id), CHECK(guardian_id<>student_id),
 FOREIGN KEY(guardian_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_learning_runs_owner ON learning_runs(profile_id,course_id,status,created_at);
CREATE INDEX idx_learning_events_day ON learning_events(profile_id,course_id,event_day);
CREATE INDEX idx_learning_skill_due ON learning_skill_state(profile_id,course_id,next_review_at);
