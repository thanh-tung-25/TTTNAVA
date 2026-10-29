-- A Chinese learner does not need a primary-school grade.
ALTER TABLE profiles DROP CONSTRAINT chk_profiles_grade;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_grade CHECK (
 (role = 'student' AND (grade IS NULL OR grade BETWEEN 1 AND 5))
 OR (role IN ('admin', 'bot') AND grade IS NULL)
);
