-- Constraint expansion only. The seed tool adds missing catalog rows separately.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_grade;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_grade CHECK ((role='student' AND (grade IS NULL OR grade BETWEEN 1 AND 12)) OR (role IN ('admin','bot') AND grade IS NULL));
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_admin_scope;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_admin_scope CHECK (admin_scope IN ('super','chinese','primary','secondary','highschool'));
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_student_creator_scope;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_student_creator_scope CHECK (student_creator_scope IS NULL OR student_creator_scope IN ('super','chinese','primary','secondary','highschool'));
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_student_management_scope;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_student_management_scope CHECK (student_management_scope IS NULL OR student_management_scope IN ('super','chinese','primary','secondary','highschool'));
ALTER TABLE topics DROP CONSTRAINT IF EXISTS chk_topics_grade;
ALTER TABLE topics ADD CONSTRAINT chk_topics_grade CHECK (grade BETWEEN 1 AND 12);
ALTER TABLE topics ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE curriculum_lessons ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE curriculum_chapters DROP CONSTRAINT IF EXISTS chk_curriculum_chapters_grade;
ALTER TABLE curriculum_chapters ADD CONSTRAINT chk_curriculum_chapters_grade CHECK (grade BETWEEN 1 AND 12);
ALTER TABLE curriculum_chapters DROP CONSTRAINT IF EXISTS curriculum_chapters_semester_check;
ALTER TABLE curriculum_chapters ADD CONSTRAINT curriculum_chapters_semester_check CHECK (semester IN ('hk1','hk2','year'));
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS chk_challenges_grade;
ALTER TABLE challenges ADD CONSTRAINT chk_challenges_grade CHECK (grade BETWEEN 1 AND 12);
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_kind_check;
ALTER TABLE courses ADD CONSTRAINT courses_kind_check CHECK (kind IN ('primary','chinese','secondary','highschool'));
ALTER TABLE learning_feedback DROP CONSTRAINT IF EXISTS learning_feedback_scope_check;
ALTER TABLE learning_feedback ADD CONSTRAINT learning_feedback_scope_check CHECK (scope IN ('general','primary','chinese','secondary','highschool'));
CREATE TABLE IF NOT EXISTS school_lesson_materials (
 lesson_id VARCHAR(90) PRIMARY KEY REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
 content_json JSONB NOT NULL,
 source_sha256 CHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE school_lesson_materials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE school_lesson_materials FROM PUBLIC,anon,authenticated;
