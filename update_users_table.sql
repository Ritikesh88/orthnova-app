-- Update users table to include additional columns for enhanced user registration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR,
ADD COLUMN IF NOT EXISTS last_name VARCHAR,
ADD COLUMN IF NOT EXISTS email VARCHAR,
ADD COLUMN IF NOT EXISTS phone VARCHAR,
ADD COLUMN IF NOT EXISTS force_change_password BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS extra JSONB;

-- Add comments for documentation
COMMENT ON COLUMN users.first_name IS 'User''s first name';
COMMENT ON COLUMN users.last_name IS 'User''s last name';
COMMENT ON COLUMN users.email IS 'User''s email address';
COMMENT ON COLUMN users.phone IS 'User''s phone number';
COMMENT ON COLUMN users.force_change_password IS 'Flag to force password change on first login';
COMMENT ON COLUMN users.active IS 'Flag to indicate if user account is active';
COMMENT ON COLUMN users.notes IS 'Additional notes about the user';
COMMENT ON COLUMN users.extra IS 'JSONB column to store role-specific extra data';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);