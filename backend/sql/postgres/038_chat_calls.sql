BEGIN;
CREATE TABLE chat_call_control (id smallint PRIMARY KEY);
INSERT INTO chat_call_control(id) VALUES (1);
CREATE TABLE chat_call_preferences (student_id char(36) PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,enabled smallint NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)));
CREATE TABLE chat_calls (
 id char(36) PRIMARY KEY,room_id char(36) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
 caller_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,callee_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 caller_client char(36) NOT NULL,callee_client char(36),media varchar(8) NOT NULL CHECK(media IN ('audio','video')),
 state varchar(12) NOT NULL DEFAULT 'ringing' CHECK(state IN ('ringing','accepted','ended')),outcome varchar(24),
 offer_sdp text,answer_sdp text,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,accepted_at timestamptz,ended_at timestamptz,
 ring_until timestamptz NOT NULL,deadline_at timestamptz NOT NULL,caller_seen_at timestamptz NOT NULL,callee_seen_at timestamptz,budget_seconds integer NOT NULL,
 CHECK(caller_id<>callee_id)
);
CREATE INDEX idx_chat_calls_caller ON chat_calls(caller_id,state,created_at);
CREATE INDEX idx_chat_calls_callee ON chat_calls(callee_id,state,created_at);
CREATE INDEX idx_chat_calls_created ON chat_calls(created_at);
CREATE TABLE chat_call_reports (
 id char(36) PRIMARY KEY,call_id char(36) NOT NULL REFERENCES chat_calls(id) ON DELETE CASCADE,
 reporter_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,reason varchar(500) NOT NULL,status varchar(12) NOT NULL DEFAULT 'open',created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(call_id,reporter_id)
);
CREATE TABLE chat_push_subscriptions (
 endpoint_hash char(64) PRIMARY KEY,student_id char(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,device_id char(36) NOT NULL,session_hash char(64) NOT NULL,
 endpoint varchar(2048) NOT NULL,p256dh varchar(128) NOT NULL,auth varchar(64) NOT NULL,updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,device_id)
);
CREATE INDEX idx_chat_push_student ON chat_push_subscriptions(student_id);
ALTER TABLE chat_call_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_call_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chat_call_control,chat_call_preferences,chat_calls,chat_call_reports,chat_push_subscriptions FROM PUBLIC,anon,authenticated;
COMMIT;
