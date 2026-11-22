CREATE TABLE IF NOT EXISTS worksheet_solution_images (
 image_id VARCHAR(36) PRIMARY KEY REFERENCES worksheet_images(id) ON DELETE CASCADE
);
