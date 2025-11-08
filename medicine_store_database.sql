-- Medicine Store Database Setup for Orthonova Poly Clinic
-- This script creates all necessary tables and functions for the medicine store system

-- 1. Update existing bills table to support medicine store
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(id),
ADD COLUMN IF NOT EXISTS is_medicine_store_bill BOOLEAN DEFAULT FALSE;

-- 2. Update existing inventory_items table to include medicine store fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS batch_number VARCHAR,
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR,
ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 18.00;

-- 3. Create medicine store bills table (if not using existing bills table)
CREATE TABLE IF NOT EXISTS medicine_store_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR NOT NULL UNIQUE,
  patient_id VARCHAR REFERENCES patients(id),
  guest_name VARCHAR,
  guest_contact VARCHAR,
  prescription_id UUID REFERENCES prescriptions(id),
  doctor_id VARCHAR REFERENCES doctors(id),
  total_amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR CHECK (status IN ('paid', 'pending', 'partial')) DEFAULT 'paid',
  mode_of_payment VARCHAR CHECK (mode_of_payment IN ('Cash', 'UPI', 'Card')) DEFAULT 'Cash',
  transaction_reference VARCHAR,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create medicine store bill items table
CREATE TABLE IF NOT EXISTS medicine_store_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES medicine_store_bills(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  item_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 0.00,
  gst_amount DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create stock purchases table for managing inventory purchases
CREATE TABLE IF NOT EXISTS stock_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR NOT NULL,
  supplier_contact VARCHAR,
  invoice_number VARCHAR,
  invoice_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR CHECK (payment_status IN ('paid', 'pending', 'partial')) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create stock purchase items table
CREATE TABLE IF NOT EXISTS stock_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES stock_purchases(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  item_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  batch_number VARCHAR,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  contact_person VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  gst_number VARCHAR,
  pan_number VARCHAR,
  payment_terms VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create medicine categories table for better organization
CREATE TABLE IF NOT EXISTS medicine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Insert default medicine categories
INSERT INTO medicine_categories (name, description) VALUES
('Tablets', 'Oral tablets and pills'),
('Syrups', 'Liquid oral medications'),
('Injections', 'Injectable medications'),
('Capsules', 'Oral capsules'),
('Ointments', 'Topical ointments and creams'),
('Drops', 'Eye and ear drops'),
('Inhalers', 'Respiratory inhalers'),
('Devices', 'Medical devices and equipment'),
('Surgical', 'Surgical supplies and instruments'),
('Other', 'Miscellaneous items')
ON CONFLICT (name) DO NOTHING;

-- 10. Create function to increment inventory stock
CREATE OR REPLACE FUNCTION increment_inventory_stock(p_item_id UUID, p_delta INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory_items 
  SET current_stock = current_stock + p_delta
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to calculate GST amount
CREATE OR REPLACE FUNCTION calculate_gst_amount(price DECIMAL, gst_rate DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (price * gst_rate) / 100;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to check low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  current_stock INTEGER,
  low_stock_threshold INTEGER,
  category VARCHAR,
  manufacturer VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.current_stock,
    i.low_stock_threshold,
    i.category,
    i.manufacturer
  FROM inventory_items i
  WHERE i.low_stock_threshold IS NOT NULL 
    AND i.current_stock <= i.low_stock_threshold
  ORDER BY i.current_stock ASC;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to check expiring items
CREATE OR REPLACE FUNCTION get_expiring_items(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  current_stock INTEGER,
  expiry_date DATE,
  days_until_expiry INTEGER,
  batch_number VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.current_stock,
    i.expiry_date,
    (i.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
    i.batch_number
  FROM inventory_items i
  WHERE i.expiry_date IS NOT NULL 
    AND i.expiry_date <= (CURRENT_DATE + INTERVAL '1 day' * p_days)
  ORDER BY i.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_manufacturer ON inventory_items(manufacturer);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry ON inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch ON inventory_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(low_stock_threshold, current_stock);

CREATE INDEX IF NOT EXISTS idx_medicine_store_bills_bill_number ON medicine_store_bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_medicine_store_bills_patient ON medicine_store_bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_medicine_store_bills_created_at ON medicine_store_bills(created_at);

CREATE INDEX IF NOT EXISTS idx_stock_purchases_supplier ON stock_purchases(supplier_name);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_invoice ON stock_purchases(invoice_number);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_date ON stock_purchases(invoice_date);

-- 15. Create doctor availability table for managing doctor schedules
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
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

-- 16. Create indexes for doctor availability
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_id ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_day ON doctor_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_date ON doctor_availability(specific_date);

-- 17. Insert default availability for all doctors (9 AM to 9 PM, all days)
-- This will need to be run after doctors are created
-- INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available)
-- SELECT id, generate_series(0,6) as day_of_week, '09:00'::time, '21:00'::time, true
-- FROM doctors
-- ON CONFLICT DO NOTHING;

-- 18. Create views for common queries
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
  i.id,
  i.name,
  i.category,
  i.manufacturer,
  i.current_stock,
  i.low_stock_threshold,
  i.sale_price,
  i.gst_rate,
  CASE 
    WHEN i.current_stock <= (i.low_stock_threshold OR 0) THEN 'Low Stock'
    WHEN i.current_stock = 0 THEN 'Out of Stock'
    ELSE 'In Stock'
  END as stock_status,
  CASE 
    WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= CURRENT_DATE THEN 'Expired'
    WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'Expiring Soon'
    ELSE 'Valid'
  END as expiry_status
FROM inventory_items i;

-- 19. Create view for sales summary
CREATE OR REPLACE VIEW medicine_sales_summary AS
SELECT 
  DATE_TRUNC('day', b.created_at) as sale_date,
  COUNT(DISTINCT b.id) as total_bills,
  SUM(b.net_amount) as total_sales,
  SUM(b.discount) as total_discounts,
  COUNT(bi.id) as total_items_sold
FROM medicine_store_bills b
LEFT JOIN medicine_store_bill_items bi ON b.id = bi.bill_id
WHERE b.is_medicine_store_bill = TRUE
GROUP BY DATE_TRUNC('day', b.created_at)
ORDER BY sale_date DESC;

-- 20. Enable Row Level Security (RLS)
ALTER TABLE medicine_store_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_store_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

-- 21. Create RLS policies
-- Allow authenticated users to read medicine store bills
CREATE POLICY "Allow authenticated users to read medicine_store_bills" ON medicine_store_bills
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow store managers and admins to manage medicine store bills
CREATE POLICY "Allow store managers and admins to manage medicine_store_bills" ON medicine_store_bills
  FOR ALL USING (auth.role() IN ('store_manager', 'admin'));

-- Allow authenticated users to read bill items
CREATE POLICY "Allow authenticated users to read medicine_store_bill_items" ON medicine_store_bill_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow store managers and admins to manage bill items
CREATE POLICY "Allow store managers and admins to manage medicine_store_bill_items" ON medicine_store_bill_items
  FOR ALL USING (auth.role() IN ('store_manager', 'admin'));

-- Allow store managers and admins to manage stock purchases
CREATE POLICY "Allow store managers and admins to manage stock_purchases" ON stock_purchases
  FOR ALL USING (auth.role() IN ('store_manager', 'admin'));

-- Allow store managers and admins to manage purchase items
CREATE POLICY "Allow store managers and admins to manage stock_purchase_items" ON stock_purchase_items
  FOR ALL USING (auth.role() IN ('store_manager', 'admin'));

-- Allow store managers and admins to manage suppliers
CREATE POLICY "Allow store managers and admins to manage suppliers" ON suppliers
  FOR ALL USING (auth.role() IN ('store_manager', 'admin'));

-- Allow authenticated users to read doctor availability
CREATE POLICY "Allow authenticated users to read doctor_availability" ON doctor_availability
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage doctor availability
CREATE POLICY "Allow authenticated users to manage doctor_availability" ON doctor_availability
  FOR ALL USING (true);

-- 22. Insert sample data for testing
INSERT INTO suppliers (name, contact_person, phone, email, address, gst_number) VALUES
('MediPharm Distributors', 'Rajesh Kumar', '+91-98765-43210', 'rajesh@medipharm.com', 'Mumbai, Maharashtra', '27ABCDE1234F1Z5'),
('HealthCare Supplies', 'Priya Sharma', '+91-98765-43211', 'priya@healthcare.com', 'Delhi, NCR', '07FGHIJ5678K9L2'),
('Pharma Solutions', 'Amit Patel', '+91-98765-43212', 'amit@pharma.com', 'Ahmedabad, Gujarat', '24MNOPQ9012R3S6');

-- 23. Create trigger to update stock when medicine store bill is created
CREATE OR REPLACE FUNCTION update_stock_on_medicine_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Update inventory stock when a medicine store bill item is inserted
  IF NEW.inventory_item_id IS NOT NULL THEN
    UPDATE inventory_items 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_sale
  AFTER INSERT ON medicine_store_bill_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_medicine_sale();

-- 24. Create trigger to log stock changes
CREATE OR REPLACE FUNCTION log_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the stock change in stock_ledger
  INSERT INTO stock_ledger (
    item_id, 
    change, 
    reason, 
    notes, 
    reference_bill_id, 
    created_by
  ) VALUES (
    NEW.id,
    NEW.current_stock - OLD.current_stock,
    'dispense',
    'Stock updated from medicine store sale',
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_stock_change
  AFTER UPDATE ON inventory_items
  FOR EACH ROW
  WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
  EXECUTE FUNCTION log_stock_change();

-- 25. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 26. Create comments for documentation
COMMENT ON TABLE medicine_store_bills IS 'Medicine store billing information';
COMMENT ON TABLE medicine_store_bill_items IS 'Individual items in medicine store bills';
COMMENT ON TABLE stock_purchases IS 'Inventory purchase records from suppliers';
COMMENT ON TABLE stock_purchase_items IS 'Individual items in stock purchases';
COMMENT ON TABLE suppliers IS 'Medicine and medical supply suppliers';
COMMENT ON TABLE medicine_categories IS 'Categories for organizing medicines';

COMMENT ON FUNCTION increment_inventory_stock IS 'Increment or decrement inventory stock';
COMMENT ON FUNCTION calculate_gst_amount IS 'Calculate GST amount based on price and rate';
COMMENT ON FUNCTION get_low_stock_items IS 'Get items with stock below threshold';
COMMENT ON FUNCTION get_expiring_items IS 'Get items expiring within specified days';

-- 27. Final verification queries
-- Check if all tables were created successfully
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'medicine_store_bills',
    'medicine_store_bill_items', 
    'stock_purchases',
    'stock_purchase_items',
    'suppliers',
    'medicine_categories',
    'doctor_availability'
  );

-- Check if all functions were created successfully
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname IN (
  'increment_inventory_stock',
  'calculate_gst_amount',
  'get_low_stock_items',
  'get_expiring_items'
);
