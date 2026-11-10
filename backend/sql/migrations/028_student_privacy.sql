-- Provenance is recorded at student creation. A later role change/deletion must not share the student.
ALTER TABLE profiles
 ADD COLUMN student_created_by CHAR(36) NULL,
 ADD COLUMN student_creator_scope VARCHAR(16) NULL,
 ADD CONSTRAINT chk_profiles_student_creator_scope CHECK (student_creator_scope IS NULL OR student_creator_scope IN ('super','chinese','primary','secondary')),
 ADD CONSTRAINT fk_profiles_student_creator FOREIGN KEY (student_created_by) REFERENCES profiles(id) ON DELETE SET NULL,
 ADD INDEX idx_profiles_student_creator (role,student_creator_scope);

-- Only a verified creation audit may establish the origin of an existing account.
-- Unknown origins remain NULL and are hidden from Chinese administrators.
UPDATE profiles p
 JOIN (
  SELECT resource_id,MIN(id) audit_id FROM admin_audit_log
  WHERE action='POST /api/v1/admin/students' AND resource_id IS NOT NULL
  GROUP BY resource_id
 ) first_creation ON first_creation.resource_id=p.id
 JOIN admin_audit_log audit ON audit.id=first_creation.audit_id
 LEFT JOIN profiles creator ON creator.id=audit.actor_id
 SET p.student_created_by=creator.id,
     p.student_creator_scope=JSON_UNQUOTE(JSON_EXTRACT(audit.details_json,'$.scope'))
 WHERE p.role='student' AND p.student_creator_scope IS NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(audit.details_json,'$.scope')) IN ('super','chinese','primary','secondary');
