-- Add serial_number column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN serial_number TEXT UNIQUE;

-- Update existing prescriptions to have serial numbers (optional - for existing data)
-- This will generate serial numbers for existing prescriptions in format YYMMDDXXX
UPDATE prescriptions 
SET serial_number = CONCAT(
    TO_CHAR(CREATED_AT, 'YYMMDD'), 
    LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::text, 3, '0')
)
WHERE serial_number IS NULL;

-- Make the serial_number column NOT NULL after populating
ALTER TABLE prescriptions ALTER COLUMN serial_number SET NOT NULL;

-- Add age column to patients table and remove dob column
ALTER TABLE patients ADD COLUMN age INTEGER;

-- Update existing patients to have age calculated from dob (optional - for existing data)
UPDATE patients 
SET age = EXTRACT(YEAR FROM AGE(dob))
WHERE dob IS NOT NULL;

-- Make the age column NOT NULL after populating
ALTER TABLE patients ALTER COLUMN age SET NOT NULL;

-- Drop the dob column from patients table
ALTER TABLE patients DROP COLUMN dob;

-- Update the patient_id column in patients table to be TEXT if it's not already
-- This should already be correct for the YYYY/XXXX format
ALTER TABLE patients ALTER COLUMN patient_id TYPE TEXT;