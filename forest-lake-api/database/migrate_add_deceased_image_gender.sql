-- Add image and gender columns to deceased_info table
ALTER TABLE deceased_info ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER name;
ALTER TABLE deceased_info ADD COLUMN gender ENUM('male', 'female') DEFAULT NULL AFTER image;
