BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
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
