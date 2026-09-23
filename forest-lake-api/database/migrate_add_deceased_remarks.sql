-- Migration: add admin_remarks to deceased_info
-- Stores the admin's reason/feedback when a deceased record is rejected
-- (e.g. missing or invalid birth certificate / death certificate).
ALTER TABLE deceased_info
    ADD COLUMN admin_remarks TEXT DEFAULT NULL AFTER status;
