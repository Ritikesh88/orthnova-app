-- Update bills and bill_items tables to include required columns for medicine store functionality

-- Add referred_by column to bills table
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS referred_by VARCHAR;

-- Add batch_number and expiry_date columns to bill_items table
ALTER TABLE bill_items
ADD COLUMN IF NOT EXISTS batch_number VARCHAR,
ADD COLUMN IF NOT EXISTS expiry_date DATE;