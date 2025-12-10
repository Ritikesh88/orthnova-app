-- Create doctors table for Orthonova Poly Clinic
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  contact VARCHAR,
  registration_number VARCHAR NOT NULL,
  opd_fees DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_registration ON doctors(registration_number);
CREATE INDEX IF NOT EXISTS idx_doctors_created_at ON doctors(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create simple policies for access control
CREATE POLICY "Allow authenticated users to read doctors" 
ON public.doctors FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage doctors" 
ON public.doctors FOR ALL 
TO authenticated 
USING (true);

-- Grant necessary permissions
GRANT ALL ON TABLE public.doctors TO authenticated;

-- Add a comment to explain the table
COMMENT ON TABLE public.doctors IS 'Stores doctor information for the clinic';