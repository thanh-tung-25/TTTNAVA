-- A new recovery sidecar. Existing account rows and credentials are untouched.
CREATE TABLE password_reset_requests (
 id CHAR(36) PRIMARY KEY,
 email_key CHAR(64) NOT NULL,
 profile_id CHAR(36) NULL,
 credential_hash CHAR(64) NULL,
 otp_hash CHAR(64) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 resend_after DATETIME(3) NOT NULL,
 attempt_count SMALLINT NOT NULL DEFAULT 0,
 send_count SMALLINT NOT NULL DEFAULT 1,
 send_window_started_at DATETIME(3) NOT NULL,
 delivery_state VARCHAR(12) NOT NULL DEFAULT 'pending',
 consumed_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT uq_password_reset_email UNIQUE (email_key),
 CONSTRAINT fk_password_reset_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 CONSTRAINT chk_password_reset_counters CHECK (attempt_count>=0 AND send_count>=1),
 CONSTRAINT chk_password_reset_delivery CHECK (delivery_state IN ('pending','sent','failed')),
 INDEX idx_password_reset_profile (profile_id),
 INDEX idx_password_reset_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- A verified grant survives anonymous resends; a credential change invalidates it.
CREATE TABLE password_reset_sessions (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE,
 credential_hash CHAR(64) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 consumed_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_reset_session_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 INDEX idx_reset_session_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
