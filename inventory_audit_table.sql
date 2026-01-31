-- Create Inventory Audit Trail Table
-- This table tracks all inventory updates with detailed information

-- First, add updated_by column to inventory_items table if it doesn't exist
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS inventory_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  manufacturer VARCHAR NOT NULL,
  sku VARCHAR NOT NULL,
  unit VARCHAR NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  quantity_added INTEGER NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  batch_number VARCHAR,
  expiry_date DATE,
  uploaded_by UUID REFERENCES users(id),
  action_type VARCHAR CHECK (action_type IN ('ADD_ITEM', 'UPDATE_STOCK', 'PURCHASE', 'ADJUSTMENT', 'CORRECTION')) NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  notes TEXT,
  reference_id UUID, -- Reference to purchase order, bill, or adjustment record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_audit_item_name ON inventory_audit_trail(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_category ON inventory_audit_trail(category);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_date_time ON inventory_audit_trail(date_time);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_uploaded_by ON inventory_audit_trail(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_action_type ON inventory_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_batch_number ON inventory_audit_trail(batch_number);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_expiry_date ON inventory_audit_trail(expiry_date);

-- Create trigger function to automatically log inventory changes
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  v_item_name VARCHAR;
  v_category VARCHAR;
  v_manufacturer VARCHAR;
  v_sku VARCHAR;
  v_unit VARCHAR;
  v_sale_price DECIMAL(10,2);
  v_gst_rate DECIMAL(5,2);
  v_batch_number VARCHAR;
  v_expiry_date DATE;
  v_previous_stock INTEGER;
  v_new_stock INTEGER;
  v_action_type VARCHAR;
  v_notes TEXT;
BEGIN
  -- Get item details from inventory_items table
  SELECT 
    name, category, manufacturer, sku, unit, sale_price, gst_rate, batch_number, expiry_date
  INTO 
    v_item_name, v_category, v_manufacturer, v_sku, v_unit, v_sale_price, v_gst_rate, v_batch_number, v_expiry_date
  FROM inventory_items 
  WHERE id = NEW.id;

  -- Determine previous and new stock
  IF TG_OP = 'INSERT' THEN
    v_previous_stock := 0;
    v_new_stock := NEW.current_stock;
    v_action_type := 'ADD_ITEM';
    v_notes := 'New item added to inventory';
  ELSE
    v_previous_stock := OLD.current_stock;
    v_new_stock := NEW.current_stock;
    
    -- Determine action type based on stock change
    IF v_new_stock > v_previous_stock THEN
      v_action_type := 'UPDATE_STOCK';
      v_notes := 'Stock increased';
    ELSE
      v_action_type := 'UPDATE_STOCK';
      v_notes := 'Stock decreased';
    END IF;
  END IF;

  -- Insert audit record
  INSERT INTO inventory_audit_trail (
    item_name,
    category,
    manufacturer,
    sku,
    unit,
    sale_price,
    gst_rate,
    quantity_added,
    batch_number,
    expiry_date,
    uploaded_by,
    action_type,
    previous_stock,
    new_stock,
    notes,
    reference_id
  ) VALUES (
    v_item_name,
    v_category,
    v_manufacturer,
    v_sku,
    v_unit,
    v_sale_price,
    v_gst_rate,
    ABS(v_new_stock - v_previous_stock),
    v_batch_number,
    v_expiry_date,
    NEW.updated_by, -- Use the updated_by field from inventory_items
    v_action_type,
    v_previous_stock,
    v_new_stock,
    v_notes,
    NULL -- This would be populated by the calling function
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on inventory_items table
DROP TRIGGER IF EXISTS trigger_log_inventory_change ON inventory_items;
CREATE TRIGGER trigger_log_inventory_change
  AFTER INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_change();

-- Create function to manually log inventory actions (for purchases, adjustments, etc.)
CREATE OR REPLACE FUNCTION manual_inventory_log(
  p_item_id UUID,
  p_quantity_added INTEGER,
  p_action_type VARCHAR,
  p_uploaded_by UUID,
  p_notes TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_item_name VARCHAR;
  v_category VARCHAR;
  v_manufacturer VARCHAR;
  v_sku VARCHAR;
  v_unit VARCHAR;
  v_sale_price DECIMAL(10,2);
  v_gst_rate DECIMAL(5,2);
  v_batch_number VARCHAR;
  v_expiry_date DATE;
  v_current_stock INTEGER;
BEGIN
  -- Get item details
  SELECT 
    name, category, manufacturer, sku, unit, sale_price, gst_rate, batch_number, expiry_date, current_stock
  INTO 
    v_item_name, v_category, v_manufacturer, v_sku, v_unit, v_sale_price, v_gst_rate, v_batch_number, v_expiry_date, v_current_stock
  FROM inventory_items 
  WHERE id = p_item_id;

  -- Insert audit record
  INSERT INTO inventory_audit_trail (
    item_name,
    category,
    manufacturer,
    sku,
    unit,
    sale_price,
    gst_rate,
    quantity_added,
    batch_number,
    expiry_date,
    uploaded_by,
    action_type,
    previous_stock,
    new_stock,
    notes,
    reference_id
  ) VALUES (
    v_item_name,
    v_category,
    v_manufacturer,
    v_sku,
    v_unit,
    v_sale_price,
    v_gst_rate,
    ABS(p_quantity_added),
    v_batch_number,
    v_expiry_date,
    p_uploaded_by,
    p_action_type,
    v_current_stock - p_quantity_added,
    v_current_stock,
    p_notes,
    p_reference_id
  );
END;
$$ LANGUAGE plpgsql;