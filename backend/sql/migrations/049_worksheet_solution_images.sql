CREATE TABLE IF NOT EXISTS worksheet_solution_images (
 image_id CHAR(36) PRIMARY KEY,
 FOREIGN KEY(image_id) REFERENCES worksheet_images(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
