ALTER TABLE exam_attempts
 ADD COLUMN exam_title VARCHAR(255) NULL,
 ADD COLUMN scope_json JSON NULL;
