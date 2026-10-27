-- So cai kim cuong. Moi (profile, ref_type, ref_id, reason) chi ghi mot lan.
CREATE TABLE IF NOT EXISTS diamond_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  profile_id CHAR(36) NOT NULL,
  amount SMALLINT NOT NULL,
  reason ENUM(
    'practice_complete',
    'practice_perfect',
    'exam_complete',
    'exam_perfect',
    'challenge_win',
    'challenge_draw',
    'challenge_loss'
  ) NOT NULL,
  ref_type ENUM('practice', 'exam', 'challenge') NOT NULL,
  ref_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_diamond_ledger_once (profile_id, ref_type, ref_id, reason),
  KEY idx_diamond_ledger_profile_time (profile_id, created_at),
  KEY idx_diamond_ledger_time (created_at),
  CONSTRAINT fk_diamond_ledger_profile FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE RESTRICT,
  CONSTRAINT chk_diamond_ledger_amount CHECK (amount <> 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
