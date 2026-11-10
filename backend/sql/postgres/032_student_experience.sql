BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
-- Additive student experience: preferences, real graded learning, rewards, assignments and approved guardian links.
ALTER TABLE profiles ADD COLUMN account_kind VARCHAR(16) NOT NULL DEFAULT 'student' CHECK(account_kind IN ('student','guardian'));
ALTER TABLE diamond_ledger DROP CONSTRAINT diamond_ledger_reason_check, DROP CONSTRAINT diamond_ledger_ref_type_check;
ALTER TABLE diamond_ledger ADD CONSTRAINT diamond_ledger_reason_check CHECK(reason IN ('practice_complete','practice_perfect','exam_complete','exam_perfect','challenge_win','challenge_draw','challenge_loss','chinese_complete','chinese_perfect','chinese_low','quest_reward','store_purchase')), ADD CONSTRAINT diamond_ledger_ref_type_check CHECK(ref_type IN ('practice','exam','challenge','chinese','quest','store'));

CREATE TABLE student_preferences (
 profile_id CHAR(36) PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
 minutes INT NOT NULL DEFAULT 10 CHECK (minutes IN (5,10,15)),
 font_scale VARCHAR(16) NOT NULL DEFAULT 'normal' CHECK (font_scale IN ('normal','large')),
 speech_rate DECIMAL(3,2) NOT NULL DEFAULT 1 CHECK (speech_rate BETWEEN 0.5 AND 1.5),
 effects_enabled INT NOT NULL DEFAULT 1 CHECK (effects_enabled IN (0,1)),
 companion VARCHAR(16) NOT NULL DEFAULT 'owl' CHECK (companion IN ('owl','panda','bunny')),
 companion_name VARCHAR(40) NOT NULL DEFAULT 'Cú nhỏ',
 equipped_frame VARCHAR(40) NULL, equipped_background VARCHAR(40) NULL,
 onboarding_at timestamptz(3) NULL
);
ALTER TABLE student_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_preferences FROM PUBLIC,anon,authenticated;

CREATE TABLE student_focus (
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 topic_id VARCHAR(60) NULL REFERENCES topics(id) ON DELETE SET NULL,
 set_id CHAR(36) NULL REFERENCES chinese_sets(id) ON DELETE SET NULL,
 PRIMARY KEY(profile_id,course_id)
);
ALTER TABLE student_focus ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_focus FROM PUBLIC,anon,authenticated;

CREATE TABLE learning_runs (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 run_kind VARCHAR(20) NOT NULL CHECK (run_kind IN ('daily','review','weekend','duel','assignment','diagnostic')),
 title VARCHAR(180) NOT NULL,
 items_json jsonb NOT NULL, answers_json jsonb NOT NULL, draft_json jsonb NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','finished')),
 revision INT NOT NULL DEFAULT 0,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at timestamptz(3) NULL
);
ALTER TABLE learning_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE learning_runs FROM PUBLIC,anon,authenticated;

CREATE TABLE learning_skill_state (
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id), skill_key VARCHAR(80) NOT NULL,
 label VARCHAR(180) NOT NULL, attempts INT NOT NULL DEFAULT 0,
 correct_count INT NOT NULL DEFAULT 0, spaced_successes INT NOT NULL DEFAULT 0,
 last_success_day DATE NULL, last_seen_at timestamptz(3) NULL, next_review_at timestamptz(3) NULL,
 PRIMARY KEY(profile_id,course_id,skill_key),
 CHECK (attempts>=0 AND correct_count>=0 AND spaced_successes>=0)
);
ALTER TABLE learning_skill_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE learning_skill_state FROM PUBLIC,anon,authenticated;

CREATE TABLE learning_events (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id), event_kind VARCHAR(30) NOT NULL,
 ref_id CHAR(36) NOT NULL, event_day DATE NOT NULL,
 details_json jsonb NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(profile_id,event_kind,ref_id)
);
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE learning_events FROM PUBLIC,anon,authenticated;

CREATE TABLE student_quest_claims (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id), claim_day DATE NOT NULL,
 task_key VARCHAR(32) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(profile_id,course_id,claim_day,task_key)
);
ALTER TABLE student_quest_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_quest_claims FROM PUBLIC,anon,authenticated;

CREATE TABLE student_inventory (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 sku VARCHAR(40) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(profile_id,sku)
);
ALTER TABLE student_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_inventory FROM PUBLIC,anon,authenticated;

CREATE TABLE student_badges (
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 badge_key VARCHAR(40) NOT NULL, awarded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(profile_id,badge_key)
);
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_badges FROM PUBLIC,anon,authenticated;

CREATE TABLE student_gallery (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 title VARCHAR(120) NOT NULL, body TEXT NOT NULL, revision INT NOT NULL DEFAULT 0,
 updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE student_gallery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE student_gallery FROM PUBLIC,anon,authenticated;

CREATE TABLE study_assignments (
 id CHAR(36) PRIMARY KEY,
 creator_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 title VARCHAR(120) NOT NULL, description TEXT NOT NULL,
 assignment_kind VARCHAR(16) NOT NULL CHECK (assignment_kind IN ('quiz','writing')),
 topic_id VARCHAR(60) NULL REFERENCES topics(id), set_id CHAR(36) NULL REFERENCES chinese_sets(id),
 question_count INT NOT NULL DEFAULT 5 CHECK(question_count IN (5,10,15)),
 due_at timestamptz(3) NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE study_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE study_assignments FROM PUBLIC,anon,authenticated;

CREATE TABLE study_assignment_members (
 assignment_id CHAR(36) NOT NULL REFERENCES study_assignments(id) ON DELETE CASCADE,
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 run_id CHAR(36) NULL REFERENCES learning_runs(id) ON DELETE SET NULL,
 draft_text TEXT NULL, draft_revision INT NOT NULL DEFAULT 0, submitted_at timestamptz(3) NULL,
 feedback TEXT NULL, teacher_score INT NULL CHECK (teacher_score BETWEEN 0 AND 100),
 reviewed_at timestamptz(3) NULL, PRIMARY KEY(assignment_id,student_id)
);
ALTER TABLE study_assignment_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE study_assignment_members FROM PUBLIC,anon,authenticated;

CREATE TABLE async_learning_duels (
 id CHAR(36) PRIMARY KEY,
 creator_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 opponent_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 course_id VARCHAR(32) NOT NULL REFERENCES courses(id),
 creator_run_id CHAR(36) NOT NULL REFERENCES learning_runs(id) ON DELETE CASCADE,
 opponent_run_id CHAR(36) NULL REFERENCES learning_runs(id) ON DELETE SET NULL,
 duel_kind VARCHAR(20) NOT NULL CHECK (duel_kind IN ('competitive','cooperative')),
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','finished','declined')),
 expires_at timestamptz(3) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(creator_id<>opponent_id)
);
ALTER TABLE async_learning_duels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE async_learning_duels FROM PUBLIC,anon,authenticated;

CREATE TABLE guardian_pair_codes (
 id CHAR(36) PRIMARY KEY,
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 code_hash CHAR(64) NOT NULL UNIQUE, expires_at timestamptz(3) NOT NULL, consumed_at timestamptz(3) NULL
);
ALTER TABLE guardian_pair_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE guardian_pair_codes FROM PUBLIC,anon,authenticated;

CREATE TABLE guardian_links (
 id CHAR(36) PRIMARY KEY,
 guardian_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 student_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(guardian_id,student_id), CHECK(guardian_id<>student_id)
);
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE guardian_links FROM PUBLIC,anon,authenticated;

CREATE INDEX idx_learning_runs_owner ON learning_runs(profile_id,course_id,status,created_at);
CREATE INDEX idx_learning_events_day ON learning_events(profile_id,course_id,event_day);
CREATE INDEX idx_learning_skill_due ON learning_skill_state(profile_id,course_id,next_review_at);
COMMIT;
