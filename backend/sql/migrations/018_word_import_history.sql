CREATE TABLE word_import_documents (
 id CHAR(36) NOT NULL PRIMARY KEY,
 filename VARCHAR(255) NOT NULL,
 original LONGBLOB NOT NULL,
 byte_size INT UNSIGNED NOT NULL,
 lesson_id VARCHAR(90) NOT NULL,
 question_count INT UNSIGNED NOT NULL,
 imported_by CHAR(36) NULL,
 imported_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE RESTRICT,
 FOREIGN KEY (imported_by) REFERENCES profiles(id) ON DELETE SET NULL,
 INDEX idx_word_import_lesson (lesson_id,imported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE questions ADD COLUMN import_document_id CHAR(36) NULL,
 ADD CONSTRAINT fk_question_import_document FOREIGN KEY (import_document_id) REFERENCES word_import_documents(id) ON DELETE SET NULL;
