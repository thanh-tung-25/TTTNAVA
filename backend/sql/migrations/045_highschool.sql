-- Expand catalog constraints only; preserve every existing account and learning row.
ALTER TABLE profiles DROP CONSTRAINT chk_profiles_grade,
 ADD CONSTRAINT chk_profiles_grade CHECK ((role='student' AND (grade IS NULL OR grade BETWEEN 1 AND 12)) OR (role IN ('admin','bot') AND grade IS NULL)),
 DROP CONSTRAINT chk_profiles_admin_scope,
 ADD CONSTRAINT chk_profiles_admin_scope CHECK (admin_scope IN ('super','chinese','primary','secondary','highschool')),
 DROP CONSTRAINT chk_profiles_student_creator_scope,
 ADD CONSTRAINT chk_profiles_student_creator_scope CHECK (student_creator_scope IS NULL OR student_creator_scope IN ('super','chinese','primary','secondary','highschool')),
 DROP CONSTRAINT chk_profiles_student_management_scope,
 ADD CONSTRAINT chk_profiles_student_management_scope CHECK (student_management_scope IS NULL OR student_management_scope IN ('super','chinese','primary','secondary','highschool'));
ALTER TABLE topics DROP CONSTRAINT chk_topics_grade,
 ADD CONSTRAINT chk_topics_grade CHECK (grade BETWEEN 1 AND 12), MODIFY name VARCHAR(255) NOT NULL;
ALTER TABLE curriculum_chapters DROP CONSTRAINT chk_curriculum_chapters_grade,
 ADD CONSTRAINT chk_curriculum_chapters_grade CHECK (grade BETWEEN 1 AND 12), MODIFY semester ENUM('hk1','hk2','year') NOT NULL;
ALTER TABLE curriculum_lessons MODIFY name VARCHAR(255) NOT NULL;
ALTER TABLE challenges DROP CONSTRAINT chk_challenges_grade,
 ADD CONSTRAINT chk_challenges_grade CHECK (grade BETWEEN 1 AND 12);
ALTER TABLE courses MODIFY kind ENUM('primary','chinese','secondary','highschool') NOT NULL;
CREATE TABLE IF NOT EXISTS school_lesson_materials (
 lesson_id VARCHAR(90) PRIMARY KEY,
 content_json JSON NOT NULL,
 source_sha256 CHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'published',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_school_material_lesson FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
 CONSTRAINT chk_school_material_status CHECK (status IN ('draft','published','hidden'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
