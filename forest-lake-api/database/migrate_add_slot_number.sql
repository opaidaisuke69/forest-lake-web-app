-- Add slot_number column to reservations table
ALTER TABLE reservations ADD COLUMN slot_number INT DEFAULT NULL AFTER burial_lot_id;
