BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
-- Management assignments do not change the original creator or learning access.
ALTER TABLE profiles
 ADD COLUMN student_management_scope VARCHAR(16) NULL,
 ADD CONSTRAINT chk_profiles_student_management_scope CHECK (student_management_scope IS NULL OR student_management_scope IN ('super','chinese','primary','secondary'));
CREATE INDEX idx_profiles_student_management ON profiles(role,student_management_scope);
COMMIT;
