CREATE TABLE IF NOT EXISTS courses (
 id VARCHAR(32) PRIMARY KEY, kind ENUM('primary','chinese') NOT NULL,
 level TINYINT UNSIGNED NOT NULL, title VARCHAR(120) NOT NULL, description TEXT NOT NULL,
 price_vnd INT UNSIGNED NULL, duration_days INT UNSIGNED NULL,
 payment_instructions TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE KEY course_level(kind,level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO courses (id,kind,level,title,description,payment_instructions)
SELECT CONCAT('grade-',n),'primary',n,CONCAT('Lớp ',n),'Toán, Tiếng Việt, Tiếng Anh; luyện tập, thi thử và thách đấu.','' FROM
 (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) levels;
INSERT IGNORE INTO courses (id,kind,level,title,description,payment_instructions)
SELECT CONCAT('hsk-',id),'chinese',id,CONCAT('Tiếng Trung HSK ',id),'Thẻ từ vựng, sổ từ, bài học và kiểm tra theo cấp HSK.','' FROM chinese_levels;
UPDATE courses SET price_vnd=CASE WHEN kind='primary' THEN 250000 ELSE level*1000000 END;
CREATE TABLE IF NOT EXISTS course_enrollments (
 student_id CHAR(36) NOT NULL, course_id VARCHAR(32) NOT NULL,
 source ENUM('legacy','order','admin') NOT NULL, granted_by CHAR(36) NULL,
 starts_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), expires_at DATETIME(3) NULL,
 revoked_at DATETIME(3) NULL, PRIMARY KEY(student_id,course_id),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id), FOREIGN KEY(granted_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS course_orders (
 id CHAR(36) PRIMARY KEY, student_id CHAR(36) NOT NULL, course_id VARCHAR(32) NOT NULL,
 amount_vnd INT UNSIGNED NOT NULL, duration_days INT UNSIGNED NULL,
 payment_reference VARCHAR(150) NOT NULL, payer_name VARCHAR(120) NOT NULL, note VARCHAR(1000) NOT NULL DEFAULT '',
 status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
 review_note VARCHAR(1000) NOT NULL DEFAULT '', reviewed_by CHAR(36) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), reviewed_at DATETIME(3) NULL,
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE,
 FOREIGN KEY(course_id) REFERENCES courses(id), FOREIGN KEY(reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL,
 INDEX(student_id,course_id,status), INDEX(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS course_access_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id CHAR(36) NOT NULL, course_id VARCHAR(32) NOT NULL,
 actor_id CHAR(36) NULL, action VARCHAR(32) NOT NULL, note VARCHAR(1000) NOT NULL DEFAULT '',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE, FOREIGN KEY(course_id) REFERENCES courses(id),
 FOREIGN KEY(actor_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- One-time compatibility grants: preserve current students; future accounts start locked.
INSERT IGNORE INTO course_enrollments(student_id,course_id,source)
SELECT p.id,c.id,'legacy' FROM profiles p JOIN courses c ON
 (p.grade IS NOT NULL AND c.kind='primary' AND c.level=p.grade)
 OR (p.grade IS NULL AND c.kind='chinese') WHERE p.role='student';
