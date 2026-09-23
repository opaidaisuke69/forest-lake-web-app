-- Migration: add price column to burial_lots
-- Price of the lot / mini-mausoleum (in PHP)
ALTER TABLE burial_lots
    ADD COLUMN price DECIMAL(12, 2) DEFAULT NULL AFTER lot_type;
