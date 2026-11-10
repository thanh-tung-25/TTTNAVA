-- One public Gmail registration flow. Existing account origins and access stay intact.
ALTER TABLE profiles
 ADD COLUMN registration_source VARCHAR(16) NOT NULL DEFAULT 'admin',
 ADD COLUMN email_verified_at DATETIME(3) NULL,
 ADD COLUMN gmail_identity VARCHAR(120) NULL,
 ADD CONSTRAINT chk_profiles_registration_source CHECK (registration_source IN ('admin','self')),
 ADD UNIQUE KEY uq_profiles_gmail_identity (gmail_identity),
 ADD INDEX idx_profiles_registration_source (role,registration_source);

-- Pending challenges exist before account creation; an unverified address cannot own a profile.
CREATE TABLE registration_otps (
 id CHAR(36) NOT NULL PRIMARY KEY,
 email VARCHAR(120) NOT NULL,
 gmail_identity VARCHAR(120) NOT NULL,
 otp_hash CHAR(64) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 resend_after DATETIME(3) NOT NULL,
 attempt_count SMALLINT NOT NULL DEFAULT 0,
 consumed_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 send_count SMALLINT NOT NULL DEFAULT 0,
 send_window_started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT chk_registration_otps_counters CHECK (attempt_count>=0 AND send_count>=0),
 UNIQUE KEY uq_registration_otps_gmail_identity (gmail_identity),
 INDEX idx_registration_otps_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
