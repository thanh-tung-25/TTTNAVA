-- Safe additive setup for the configured production application schema.
BEGIN;
SET LOCAL search_path TO ttnava_stage, pg_catalog;
DO $$ BEGIN
 IF to_regclass('ttnava_stage.profiles') IS NULL OR to_regclass('ttnava_stage.chinese_lessons') IS NULL THEN
  RAISE EXCEPTION 'Application schema not found. Verify PGSCHEMA in Vercel before running.';
 END IF;
END $$;


-- 023_chinese_activities.sql
-- Apply in the configured application schema.
CREATE TABLE IF NOT EXISTS chinese_activities (
 lesson_id char(36) PRIMARY KEY REFERENCES chinese_lessons(id) ON DELETE CASCADE,
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 data jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE chinese_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chinese_activities FROM PUBLIC, anon, authenticated;


-- 024_student_chat.sql
CREATE TABLE IF NOT EXISTS chat_rooms (id char(36) PRIMARY KEY,kind varchar(12) NOT NULL,title varchar(100) NOT NULL DEFAULT '',owner_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,direct_key varchar(73) UNIQUE,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS chat_members (room_id char(36) REFERENCES chat_rooms(id) ON DELETE CASCADE,student_id char(36) REFERENCES profiles(id) ON DELETE CASCADE,last_read_at timestamptz,joined_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(room_id,student_id));
CREATE TABLE IF NOT EXISTS chat_messages (id char(36) PRIMARY KEY,room_id char(36) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,sender_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,client_id char(36) NOT NULL,body varchar(2000) NOT NULL,hidden smallint NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(sender_id,client_id));
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id,created_at,id);
CREATE TABLE IF NOT EXISTS chat_blocks (student_id char(36) REFERENCES profiles(id) ON DELETE CASCADE,peer_id char(36) REFERENCES profiles(id) ON DELETE CASCADE,PRIMARY KEY(student_id,peer_id));
CREATE TABLE IF NOT EXISTS chat_reports (id char(36) PRIMARY KEY,message_id char(36) NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,reporter_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,reason varchar(500) NOT NULL,status varchar(12) NOT NULL DEFAULT 'open',created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(message_id,reporter_id));
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chat_rooms,chat_members,chat_messages,chat_blocks,chat_reports FROM PUBLIC,anon,authenticated;


-- 025_chat_friendships.sql: old conversations are NOT automatically friendships.
CREATE TABLE IF NOT EXISTS chat_friendships (
 user_a char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 user_b char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 requester_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_a,user_b),CHECK(user_a<>user_b),CHECK(requester_id=user_a OR requester_id=user_b)
);
ALTER TABLE chat_friendships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chat_friendships FROM PUBLIC,anon,authenticated;

COMMIT;
SELECT table_name FROM information_schema.tables WHERE table_schema='ttnava_stage' AND table_name IN ('chinese_activities','chat_rooms','chat_members','chat_messages','chat_blocks','chat_reports','chat_friendships') ORDER BY table_name;
