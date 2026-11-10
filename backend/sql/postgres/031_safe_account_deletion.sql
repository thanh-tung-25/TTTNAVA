BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
-- Archive rather than cascade-delete: identity and history remain available to restore.
ALTER TABLE profiles
 ADD COLUMN deleted_at timestamptz(3) NULL,
 ADD COLUMN deleted_by CHAR(36) NULL,
 ADD COLUMN deletion_reason VARCHAR(500) NULL,
 ADD COLUMN student_auth_version INTEGER NOT NULL DEFAULT 0,
 ADD CONSTRAINT chk_profiles_student_auth_version CHECK (student_auth_version>=0),
 ADD CONSTRAINT fk_profiles_deleted_by FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX idx_profiles_deleted ON profiles(role,deleted_at);

CREATE TABLE account_deletion_confirmations (
 id CHAR(36) NOT NULL PRIMARY KEY,
 token_hash CHAR(64) NOT NULL,
 actor_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 actor_auth_version INTEGER NOT NULL,
 reason VARCHAR(500) NOT NULL,
 not_before timestamptz(3) NOT NULL,
 expires_at timestamptz(3) NOT NULL,
 consumed_at timestamptz(3) NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_account_deletion_token UNIQUE (token_hash),
 CONSTRAINT chk_account_deletion_window CHECK (not_before<expires_at)
);
CREATE INDEX idx_account_deletion_profile ON account_deletion_confirmations(profile_id,consumed_at);
CREATE INDEX idx_account_deletion_expiry ON account_deletion_confirmations(expires_at);
ALTER TABLE account_deletion_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE account_deletion_confirmations FROM PUBLIC,anon,authenticated;
COMMIT;
