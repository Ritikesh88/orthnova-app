-- Drop the existing table if it exists (to apply new structure)
DROP TABLE IF EXISTS public.doctor_availability CASCADE;

-- Create doctor availability table for managing doctor schedules
CREATE TABLE public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER, -- NULL for specific dates, 0-6 for recurring weekly availability
  specific_date DATE, -- NULL for recurring availability, specific date for one-time availability
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_availability_type CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR 
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

-- Create indexes for doctor availability
CREATE INDEX idx_doctor_availability_doctor_id ON public.doctor_availability(doctor_id);
CREATE INDEX idx_doctor_availability_day ON public.doctor_availability(day_of_week);
CREATE INDEX idx_doctor_availability_date ON public.doctor_availability(specific_date);

-- Add a comment to explain the table
COMMENT ON TABLE public.doctor_availability IS 'Stores doctor availability schedules for appointment booking';

-- Enable Row Level Security (RLS)
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

-- Create simple policies for access control
CREATE POLICY "Allow authenticated users to read doctor availability" 
ON public.doctor_availability FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage doctor availability" 
ON public.doctor_availability FOR ALL 
TO authenticated 
USING (true);

-- Grant necessary permissions
GRANT ALL ON TABLE public.doctor_availability TO authenticated;