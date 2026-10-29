-- Preserve original Word documents larger than MEDIUMBLOB's 16 MB ceiling.
ALTER TABLE chinese_documents MODIFY COLUMN original LONGBLOB NOT NULL;
