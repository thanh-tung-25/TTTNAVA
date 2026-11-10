BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
ALTER TABLE profiles
 ADD COLUMN student_created_by CHAR(36) NULL,
 ADD COLUMN student_creator_scope VARCHAR(16) NULL,
 ADD CONSTRAINT chk_profiles_student_creator_scope CHECK (student_creator_scope IS NULL OR student_creator_scope IN ('super','chinese','primary','secondary')),
 ADD CONSTRAINT fk_profiles_student_creator FOREIGN KEY (student_created_by) REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX idx_profiles_student_creator ON profiles(role,student_creator_scope);

WITH first_creation AS (
 SELECT resource_id,MIN(id) audit_id FROM admin_audit_log
 WHERE action='POST /api/v1/admin/students' AND resource_id IS NOT NULL
 GROUP BY resource_id
), provenance AS (
 SELECT first_creation.resource_id,creator.id creator_id,audit.details_json->>'scope' creator_scope
 FROM first_creation JOIN admin_audit_log audit ON audit.id=first_creation.audit_id
 LEFT JOIN profiles creator ON creator.id=audit.actor_id
 WHERE audit.details_json->>'scope' IN ('super','chinese','primary','secondary')
)
UPDATE profiles p SET student_created_by=provenance.creator_id,student_creator_scope=provenance.creator_scope
FROM provenance WHERE p.id=provenance.resource_id AND p.role='student' AND p.student_creator_scope IS NULL;
COMMIT;
