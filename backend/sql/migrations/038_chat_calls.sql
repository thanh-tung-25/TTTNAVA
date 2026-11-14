CREATE TABLE chat_call_control (id SMALLINT PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO chat_call_control(id) VALUES (1);
CREATE TABLE chat_call_preferences (
 student_id CHAR(36) PRIMARY KEY,enabled SMALLINT NOT NULL DEFAULT 1,
 FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE chat_calls (
 id CHAR(36) PRIMARY KEY,room_id CHAR(36) NOT NULL,caller_id CHAR(36) NOT NULL,callee_id CHAR(36) NOT NULL,
 caller_client CHAR(36) NOT NULL,callee_client CHAR(36) NULL,media VARCHAR(8) NOT NULL,state VARCHAR(12) NOT NULL DEFAULT 'ringing',outcome VARCHAR(24) NULL,
 offer_sdp TEXT NULL,answer_sdp TEXT NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),accepted_at DATETIME(3) NULL,ended_at DATETIME(3) NULL,
 ring_until DATETIME(3) NOT NULL,deadline_at DATETIME(3) NOT NULL,caller_seen_at DATETIME(3) NOT NULL,callee_seen_at DATETIME(3) NULL,budget_seconds INT NOT NULL,
 INDEX idx_chat_calls_caller(caller_id,state,created_at),INDEX idx_chat_calls_callee(callee_id,state,created_at),INDEX idx_chat_calls_created(created_at),
 FOREIGN KEY(room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
 FOREIGN KEY(caller_id) REFERENCES profiles(id) ON DELETE CASCADE,FOREIGN KEY(callee_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE chat_call_reports (
 id CHAR(36) PRIMARY KEY,call_id CHAR(36) NOT NULL,reporter_id CHAR(36) NOT NULL,reason VARCHAR(500) NOT NULL,status VARCHAR(12) NOT NULL DEFAULT 'open',created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE(call_id,reporter_id),FOREIGN KEY(call_id) REFERENCES chat_calls(id) ON DELETE CASCADE,FOREIGN KEY(reporter_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE chat_push_subscriptions (
 endpoint_hash CHAR(64) PRIMARY KEY,student_id CHAR(36) NOT NULL,device_id CHAR(36) NOT NULL,session_hash CHAR(64) NOT NULL,endpoint VARCHAR(2048) NOT NULL,p256dh VARCHAR(128) NOT NULL,auth VARCHAR(64) NOT NULL,updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_chat_push_student(student_id),UNIQUE(student_id,device_id),FOREIGN KEY(student_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
