-- Recoverable account removal preserves all learning, payment and chat history.
ALTER TABLE profiles
 ADD COLUMN deleted_at DATETIME(3) NULL,
 ADD COLUMN deleted_by CHAR(36) NULL,
 ADD COLUMN deletion_reason VARCHAR(500) NULL,
 ADD COLUMN student_auth_version INT UNSIGNED NOT NULL DEFAULT 0,
 ADD CONSTRAINT fk_profiles_deleted_by FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL,
 ADD INDEX idx_profiles_deleted (role,deleted_at);

-- Only a recently reauthenticated administrator can use a target-bound confirmation.
CREATE TABLE account_deletion_confirmations (
 id CHAR(36) NOT NULL PRIMARY KEY,
 token_hash CHAR(64) NOT NULL,
 actor_id CHAR(36) NOT NULL,
 profile_id CHAR(36) NOT NULL,
 actor_auth_version INTEGER NOT NULL,
 reason VARCHAR(500) NOT NULL,
 not_before DATETIME(3) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 consumed_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT uq_account_deletion_token UNIQUE (token_hash),
 CONSTRAINT fk_account_deletion_actor FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE,
 CONSTRAINT fk_account_deletion_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 CONSTRAINT chk_account_deletion_window CHECK (not_before<expires_at),
 INDEX idx_account_deletion_profile (profile_id,consumed_at),
 INDEX idx_account_deletion_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
