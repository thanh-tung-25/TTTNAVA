ALTER TABLE curriculum_chapters
  ADD COLUMN is_legacy TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN book_label VARCHAR(160) NULL;
ALTER TABLE worksheets
  ADD COLUMN lesson_id VARCHAR(90) NULL,
  ADD CONSTRAINT fk_worksheets_lesson FOREIGN KEY (lesson_id) REFERENCES curriculum_lessons(id) ON DELETE RESTRICT;
