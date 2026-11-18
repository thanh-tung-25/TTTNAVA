BEGIN;
SET LOCAL search_path TO ttnava_stage,pg_catalog;
ALTER TABLE diamond_ledger DROP CONSTRAINT diamond_ledger_reason_check;
ALTER TABLE diamond_ledger ADD CONSTRAINT diamond_ledger_reason_check CHECK(reason IN ('practice_complete','practice_perfect','exam_complete','exam_perfect','challenge_win','challenge_draw','challenge_loss','chinese_complete','chinese_perfect','chinese_low','quest_reward','store_purchase','store_refund'));
COMMIT;
