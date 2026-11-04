ALTER TABLE profiles ADD COLUMN admin_scope VARCHAR(16) NOT NULL DEFAULT 'super';
ALTER TABLE profiles ADD COLUMN admin_auth_version INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_admin_scope CHECK (admin_scope IN ('super','chinese','primary'));

CREATE TABLE admin_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NULL,
  actor_username VARCHAR(20) NOT NULL,
  action VARCHAR(200) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NULL,
  details_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_admin_audit_created(created_at),
  INDEX idx_admin_audit_actor(actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
