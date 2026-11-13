CREATE TABLE user_access_tracking (
 id TINYINT NOT NULL PRIMARY KEY,
 enabled_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 last_cleanup_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO user_access_tracking(id) VALUES (1);
CREATE TABLE user_access_events (
 id CHAR(36) NOT NULL PRIMARY KEY,
 profile_id CHAR(36) NOT NULL,
 event_type VARCHAR(12) NOT NULL,
 page_key VARCHAR(80) NOT NULL DEFAULT '',
 course_id VARCHAR(40) NULL,
 device_type VARCHAR(16) NOT NULL,
 browser VARCHAR(24) NOT NULL,
 visits_count INT NOT NULL DEFAULT 1,
 dedup_key CHAR(64) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY access_dedup(dedup_key),
 INDEX access_profile_recent(profile_id,last_seen_at,id),
 INDEX access_retention(last_seen_at),
 CONSTRAINT access_profile_fk FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
 CONSTRAINT access_event_type CHECK(event_type IN ('login','page','logout'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
