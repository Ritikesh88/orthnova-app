# Doctor Availability Table Setup

## Issue
When trying to update doctor availability in the admin panel, you're getting the error:
```
relation "public.doctor_availability" does not exist
```

## Solution
You need to create the `doctor_availability` table in your Supabase database.

## How to Create the Table

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard at: https://flfbklsoqamandfuuadq.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the following SQL commands into the editor:

```sql
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
```

5. Click **Run** to execute the query

### Option 2: Using the Complete Schema File

If you prefer to run the complete schema file:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `medicine_store_database.sql` into the editor
5. Click **Run** to execute the query

## New Features

The updated doctor availability system now supports:

1. **Recurring Weekly Availability** - Set availability for specific days of the week (e.g., every Monday from 9 AM to 5 PM)
2. **Specific Date Availability** - Set availability for specific dates (e.g., available on December 25th from 10 AM to 2 PM)
3. **Priority System** - Specific date availability takes precedence over recurring availability

## After Creating the Table

Once the table is created, you should be able to:
1. Access the Doctor Availability page in the admin panel
2. Set both recurring and specific date availability schedules for doctors
3. See the availability restrictions when booking appointments

## Default Availability

If no availability is set for a doctor, the system will default to:
- **Time**: 9:00 AM to 9:00 PM
- **Days**: All days of the week (Sunday to Saturday)