-- No UPDATE/DELETE on existing profiles, learning history, or access tables.
CREATE TABLE password_reset_requests (
 id CHAR(36) PRIMARY KEY,
 email_key CHAR(64) NOT NULL UNIQUE,
 profile_id CHAR(36) NULL REFERENCES profiles(id) ON DELETE CASCADE,
 credential_hash CHAR(64) NULL,
 otp_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ(3) NOT NULL,
 resend_after TIMESTAMPTZ(3) NOT NULL,
 attempt_count SMALLINT NOT NULL DEFAULT 0,
 send_count SMALLINT NOT NULL DEFAULT 1,
 send_window_started_at TIMESTAMPTZ(3) NOT NULL,
 delivery_state VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (delivery_state IN ('pending','sent','failed')),
 consumed_at TIMESTAMPTZ(3) NULL,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_password_reset_counters CHECK (attempt_count>=0 AND send_count>=1)
);
CREATE INDEX idx_password_reset_profile ON password_reset_requests(profile_id);
CREATE INDEX idx_password_reset_expiry ON password_reset_requests(expires_at);
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE password_reset_sessions (
 id CHAR(36) PRIMARY KEY,
 profile_id CHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 token_hash CHAR(64) NOT NULL UNIQUE,
 credential_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ(3) NOT NULL,
 consumed_at TIMESTAMPTZ(3) NULL,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reset_session_expiry ON password_reset_sessions(expires_at);
ALTER TABLE password_reset_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE password_reset_requests,password_reset_sessions FROM PUBLIC,anon,authenticated;
