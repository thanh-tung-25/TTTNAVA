BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
-- Registration source is server-owned and independent from administrator provenance.
ALTER TABLE profiles
 ADD COLUMN registration_source VARCHAR(16) NOT NULL DEFAULT 'admin',
 ADD COLUMN email_verified_at timestamptz(3) NULL,
 ADD COLUMN gmail_identity VARCHAR(120) NULL,
 ADD CONSTRAINT chk_profiles_registration_source CHECK (registration_source IN ('admin','self')),
 ADD CONSTRAINT uq_profiles_gmail_identity UNIQUE (gmail_identity);
CREATE INDEX idx_profiles_registration_source ON profiles(role,registration_source);

CREATE TABLE registration_otps (
 id CHAR(36) NOT NULL PRIMARY KEY,
 email VARCHAR(120) NOT NULL,
 gmail_identity VARCHAR(120) NOT NULL,
 otp_hash CHAR(64) NOT NULL,
 expires_at timestamptz(3) NOT NULL,
 resend_after timestamptz(3) NOT NULL,
 attempt_count SMALLINT NOT NULL DEFAULT 0,
 consumed_at timestamptz(3) NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 send_count SMALLINT NOT NULL DEFAULT 0,
 send_window_started_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_registration_otps_counters CHECK (attempt_count>=0 AND send_count>=0),
 CONSTRAINT uq_registration_otps_gmail_identity UNIQUE (gmail_identity)
);
CREATE INDEX idx_registration_otps_expiry ON registration_otps(expires_at);
ALTER TABLE registration_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE registration_otps FROM PUBLIC,anon,authenticated;
COMMIT;
