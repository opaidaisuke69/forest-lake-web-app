-- Add status column to deceased_info table for admin review workflow
ALTER TABLE deceased_info ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER burial_date;

-- Update existing records to approved (they were already managed by admin)
UPDATE deceased_info SET status = 'approved' WHERE status = 'approved';
