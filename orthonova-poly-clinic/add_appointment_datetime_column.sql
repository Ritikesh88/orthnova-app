-- Add appointment_datetime column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_datetime TIMESTAMP WITH TIME ZONE;

-- Add an index for better performance when querying by appointment_datetime
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_datetime);

-- Update existing appointments to have appointment_datetime based on appointment_date
-- This will set the time to 00:00:00 for existing appointments
UPDATE appointments 
SET appointment_datetime = appointment_date::TIMESTAMP WITH TIME ZONE
WHERE appointment_datetime IS NULL AND appointment_date IS NOT NULL;