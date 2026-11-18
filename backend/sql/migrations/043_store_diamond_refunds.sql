-- Add a distinct refund entry; keep every original purchase and reward.
ALTER TABLE diamond_ledger MODIFY reason ENUM('practice_complete','practice_perfect','exam_complete','exam_perfect','challenge_win','challenge_draw','challenge_loss','chinese_complete','chinese_perfect','chinese_low','quest_reward','store_purchase','store_refund') NOT NULL;
