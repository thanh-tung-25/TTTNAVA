-- Tai khoan: admin, student, bot (Robot Thach Dau)
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) NOT NULL,
  username VARCHAR(20) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('admin', 'student', 'bot') NOT NULL,
  display_name VARCHAR(60) NOT NULL,
  avatar_key ENUM('meo', 'cho', 'tho', 'gau', 'cao', 'cu', 'ech', 'ga', 'voi', 'khi', 'gau-truc', 'ho') NOT NULL DEFAULT 'meo',
  grade TINYINT UNSIGNED NULL,
  banned_until DATETIME NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_username (username),
  UNIQUE KEY uq_profiles_email (email),
  KEY idx_profiles_role (role),
  KEY idx_profiles_grade (grade),
  CONSTRAINT chk_profiles_grade CHECK (
    (role = 'student' AND grade IS NOT NULL AND grade BETWEEN 1 AND 5)
    OR (role IN ('admin', 'bot') AND grade IS NULL)
  )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
