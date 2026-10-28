-- Quan tri cau hoi: nhap, duyet, an va luu vet nguoi tao/cap nhat.
-- Gia tri visible/hidden duoc giu lai de khong phai cap nhat hang loat du lieu cu.
-- Chi cau hoi status = 'published' moi duoc tra cho hoc sinh.
ALTER TABLE questions
  MODIFY COLUMN status ENUM('visible', 'hidden', 'draft', 'published') NOT NULL DEFAULT 'draft';

ALTER TABLE questions
  ADD COLUMN created_by CHAR(36) NULL AFTER status,
  ADD COLUMN updated_by CHAR(36) NULL AFTER created_by,
  ADD COLUMN published_at DATETIME(3) NULL AFTER updated_by,
  ADD KEY idx_questions_status_published (status, published_at),
  ADD KEY idx_questions_created_by (created_by, created_at),
  ADD CONSTRAINT fk_questions_created_by FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_questions_updated_by FOREIGN KEY (updated_by) REFERENCES profiles (id) ON DELETE SET NULL;

ALTER TABLE atomic_question_writes
  MODIFY COLUMN action ENUM('update', 'hide', 'show', 'create', 'publish', 'unpublish') NOT NULL;
