-- Add visit_type column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN visit_type TEXT DEFAULT 'walk-in';

-- Update existing prescriptions to have default visit_type of 'walk-in' (optional - for existing data)
UPDATE prescriptions 
SET visit_type = 'walk-in'
WHERE visit_type IS NULL;

-- Make the visit_type column NOT NULL after populating
ALTER TABLE prescriptions ALTER COLUMN visit_type SET NOT NULL;

-- Add check constraint to ensure visit_type is either 'walk-in' or 'appointment'
ALTER TABLE prescriptions ADD CONSTRAINT chk_visit_type CHECK (visit_type IN ('walk-in', 'appointment'));