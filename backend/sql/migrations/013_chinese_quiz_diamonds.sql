ALTER TABLE chinese_attempts
 ADD COLUMN abandoned_at DATETIME(3) NULL,
 ADD COLUMN diamonds_delta SMALLINT NULL,
 ADD INDEX idx_chinese_open (student_id,set_id,finished_at,abandoned_at);

-- Preserve old unfinished attempts, but remove them from the active list.
-- They predate the 20-question/reward policy and receive no penalty.
UPDATE chinese_attempts SET abandoned_at=CURRENT_TIMESTAMP(3) WHERE finished_at IS NULL;

ALTER TABLE diamond_ledger
 MODIFY COLUMN reason ENUM('practice_complete','practice_perfect','exam_complete','exam_perfect','challenge_win','challenge_draw','challenge_loss','chinese_complete','chinese_perfect','chinese_low') NOT NULL,
 MODIFY COLUMN ref_type ENUM('practice','exam','challenge','chinese') NOT NULL;
