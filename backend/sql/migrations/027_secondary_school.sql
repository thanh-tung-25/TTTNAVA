-- Add THCS without changing existing students, enrollments or authored content.
ALTER TABLE profiles DROP CONSTRAINT chk_profiles_grade;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_grade CHECK (
 (role = 'student' AND (grade IS NULL OR grade BETWEEN 1 AND 9))
 OR (role IN ('admin', 'bot') AND grade IS NULL)
);
ALTER TABLE profiles DROP CONSTRAINT chk_profiles_admin_scope;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_admin_scope CHECK (
 admin_scope IN ('super','chinese','primary','secondary')
);
ALTER TABLE topics DROP CONSTRAINT chk_topics_grade;
ALTER TABLE topics ADD CONSTRAINT chk_topics_grade CHECK (grade BETWEEN 1 AND 9);
ALTER TABLE curriculum_chapters DROP CONSTRAINT chk_curriculum_chapters_grade;
ALTER TABLE curriculum_chapters ADD CONSTRAINT chk_curriculum_chapters_grade CHECK (grade BETWEEN 1 AND 9);
ALTER TABLE challenges DROP CONSTRAINT chk_challenges_grade;
ALTER TABLE challenges ADD CONSTRAINT chk_challenges_grade CHECK (grade BETWEEN 1 AND 9);
ALTER TABLE courses MODIFY COLUMN kind ENUM('primary','chinese','secondary') NOT NULL;

-- Admin will configure fees and grant access. Do not invent a price or grant access.
INSERT IGNORE INTO courses (id,kind,level,title,description,payment_instructions) VALUES
 ('grade-6','secondary',6,'Lớp 6','Chương trình THCS lớp 6. Nội dung đang được bổ sung.',''),
 ('grade-7','secondary',7,'Lớp 7','Chương trình THCS lớp 7. Nội dung đang được bổ sung.',''),
 ('grade-8','secondary',8,'Lớp 8','Chương trình THCS lớp 8. Nội dung đang được bổ sung.',''),
 ('grade-9','secondary',9,'Lớp 9','Toán 9 theo tập, chương và bài học; luyện tập, thi thử và thách đấu.','');
