-- Migration: add required certificate document paths to deceased_info
-- Clients upload a valid Birth Certificate and Death Certificate that the
-- admin reviews for compliance before accepting the deceased record.
ALTER TABLE deceased_info
    ADD COLUMN birth_certificate VARCHAR(255) DEFAULT NULL AFTER image,
    ADD COLUMN death_certificate VARCHAR(255) DEFAULT NULL AFTER birth_certificate;
