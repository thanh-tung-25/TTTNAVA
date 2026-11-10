-- Management can be assigned explicitly without rewriting account provenance.
-- NULL retains the verified creation scope; unknown legacy accounts stay private.
ALTER TABLE profiles
 ADD COLUMN student_management_scope VARCHAR(16) NULL,
 ADD CONSTRAINT chk_profiles_student_management_scope CHECK (student_management_scope IS NULL OR student_management_scope IN ('super','chinese','primary','secondary')),
 ADD INDEX idx_profiles_student_management (role,student_management_scope);
