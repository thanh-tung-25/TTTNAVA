-- Apply to the application's snapshot schema together with the THCS release.
BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_grade;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_grade CHECK (
 (role = 'student' AND (grade IS NULL OR grade BETWEEN 1 AND 9))
 OR (role IN ('admin', 'bot') AND grade IS NULL)
);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_admin_scope;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_admin_scope CHECK (
 admin_scope IN ('super','chinese','primary','secondary')
);
ALTER TABLE topics DROP CONSTRAINT IF EXISTS chk_topics_grade;
ALTER TABLE topics ADD CONSTRAINT chk_topics_grade CHECK (grade BETWEEN 1 AND 9);
ALTER TABLE curriculum_chapters DROP CONSTRAINT IF EXISTS chk_curriculum_chapters_grade;
ALTER TABLE curriculum_chapters ADD CONSTRAINT chk_curriculum_chapters_grade CHECK (grade BETWEEN 1 AND 9);
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS chk_challenges_grade;
ALTER TABLE challenges ADD CONSTRAINT chk_challenges_grade CHECK (grade BETWEEN 1 AND 9);
-- schemaPlan() imports the MySQL ENUM as a text column with this check.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_kind_check;
ALTER TABLE courses ADD CONSTRAINT courses_kind_check CHECK (kind IN ('primary','chinese','secondary'));
ALTER TABLE learning_feedback DROP CONSTRAINT IF EXISTS learning_feedback_scope_check;
ALTER TABLE learning_feedback ADD CONSTRAINT learning_feedback_scope_check CHECK (scope IN ('general','primary','secondary','chinese'));
INSERT INTO courses (id,kind,level,title,description,payment_instructions) VALUES
 ('grade-6','secondary',6,'Lớp 6','Chương trình THCS lớp 6. Nội dung đang được bổ sung.',''),
 ('grade-7','secondary',7,'Lớp 7','Chương trình THCS lớp 7. Nội dung đang được bổ sung.',''),
 ('grade-8','secondary',8,'Lớp 8','Chương trình THCS lớp 8. Nội dung đang được bổ sung.',''),
 ('grade-9','secondary',9,'Lớp 9','Toán 9 theo tập, chương và bài học; luyện tập, thi thử và thách đấu.','')
ON CONFLICT (id) DO NOTHING;
COMMIT;
