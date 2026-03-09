-- Dispatch UUID Tracking System
-- This script creates tables and functions for tracking toy dispatch with 10-digit alphanumeric UUIDs

-- 1. Create dispatch_orders table
CREATE TABLE IF NOT EXISTS dispatch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_order_id UUID NOT NULL REFERENCES orders(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  shipping_address JSONB,
  subscription_plan TEXT,
  dispatch_date TIMESTAMP WITH TIME ZONE,
  expected_return_date DATE,
  tracking_number TEXT,
  dispatch_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'in_transit', 'delivered', 'returned', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create toy_dispatch_uuids table for individual toy tracking
CREATE TABLE IF NOT EXISTS toy_dispatch_uuids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_order_id UUID NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
  toy_id UUID NOT NULL REFERENCES toys(id),
  toy_name TEXT NOT NULL,
  toy_brand TEXT,
  uuid_code TEXT UNIQUE NOT NULL, -- 10-digit alphanumeric UUID
  barcode_printed BOOLEAN DEFAULT FALSE,
  barcode_printed_at TIMESTAMP WITH TIME ZONE,
  condition_on_dispatch TEXT DEFAULT 'good' CHECK (condition_on_dispatch IN ('excellent', 'good', 'fair', 'damaged')),
  condition_on_return TEXT CHECK (condition_on_return IN ('excellent', 'good', 'fair', 'damaged')),
  return_date TIMESTAMP WITH TIME ZONE,
  damage_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create dispatch_barcode_batches table for batch printing
CREATE TABLE IF NOT EXISTS dispatch_barcode_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_order_id UUID NOT NULL REFERENCES dispatch_orders(id),
  batch_name TEXT NOT NULL,
  total_barcodes INTEGER NOT NULL,
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  printed_by TEXT,
  batch_status TEXT DEFAULT 'pending' CHECK (batch_status IN ('pending', 'printed', 'applied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_original_order_id ON dispatch_orders(original_order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_status ON dispatch_orders(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_dispatch_date ON dispatch_orders(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_toy_dispatch_uuids_dispatch_order_id ON toy_dispatch_uuids(dispatch_order_id);
CREATE INDEX IF NOT EXISTS idx_toy_dispatch_uuids_uuid_code ON toy_dispatch_uuids(uuid_code);
CREATE INDEX IF NOT EXISTS idx_toy_dispatch_uuids_toy_id ON toy_dispatch_uuids(toy_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_barcode_batches_dispatch_order_id ON dispatch_barcode_batches(dispatch_order_id);

-- 5. Function to generate 10-digit alphanumeric UUID
CREATE OR REPLACE FUNCTION generate_toy_uuid()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Ensure uniqueness by checking if it already exists
  WHILE EXISTS (SELECT 1 FROM toy_dispatch_uuids WHERE uuid_code = result) LOOP
    result := '';
    FOR i IN 1..10 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to create dispatch order with UUIDs
CREATE OR REPLACE FUNCTION create_dispatch_order_with_uuids(
  p_original_order_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_shipping_address JSONB DEFAULT NULL,
  p_subscription_plan TEXT DEFAULT NULL,
  p_expected_return_date DATE DEFAULT NULL,
  p_dispatch_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  dispatch_order_id UUID,
  toy_uuid_code TEXT,
  toy_name TEXT,
  toy_brand TEXT
) AS $$
DECLARE
  v_dispatch_order_id UUID;
  v_order_item RECORD;
  v_toy_uuid TEXT;
BEGIN
  -- Create the dispatch order
  INSERT INTO dispatch_orders (
    original_order_id,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    subscription_plan,
    expected_return_date,
    dispatch_notes
  ) VALUES (
    p_original_order_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_shipping_address,
    p_subscription_plan,
    p_expected_return_date,
    p_dispatch_notes
  ) RETURNING id INTO v_dispatch_order_id;

  -- Generate UUIDs for each toy in the order
  FOR v_order_item IN 
    SELECT oi.toy_id, t.name as toy_name, t.brand as toy_brand, oi.quantity
    FROM order_items oi
    JOIN toys t ON oi.toy_id = t.id
    WHERE oi.order_id = p_original_order_id
  LOOP
    -- Generate UUID for each quantity of the toy
    FOR i IN 1..v_order_item.quantity LOOP
      v_toy_uuid := generate_toy_uuid();
      
      INSERT INTO toy_dispatch_uuids (
        dispatch_order_id,
        toy_id,
        toy_name,
        toy_brand,
        uuid_code
      ) VALUES (
        v_dispatch_order_id,
        v_order_item.toy_id,
        v_order_item.toy_name,
        v_order_item.toy_brand,
        v_toy_uuid
      );
      
      -- Return the generated UUID info
      dispatch_order_id := v_dispatch_order_id;
      toy_uuid_code := v_toy_uuid;
      toy_name := v_order_item.toy_name;
      toy_brand := v_order_item.toy_brand;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to mark dispatch order as dispatched
CREATE OR REPLACE FUNCTION confirm_dispatch_order(
  p_dispatch_order_id UUID,
  p_tracking_number TEXT DEFAULT NULL,
  p_dispatch_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE dispatch_orders 
  SET 
    status = 'dispatched',
    dispatch_date = NOW(),
    tracking_number = p_tracking_number,
    dispatch_notes = COALESCE(p_dispatch_notes, dispatch_notes),
    updated_at = NOW()
  WHERE id = p_dispatch_order_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to create barcode batch for printing
CREATE OR REPLACE FUNCTION create_barcode_batch(
  p_dispatch_order_id UUID,
  p_batch_name TEXT DEFAULT NULL,
  p_printed_by TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_barcode_count INTEGER;
BEGIN
  -- Count total barcodes for this dispatch order
  SELECT COUNT(*) INTO v_barcode_count
  FROM toy_dispatch_uuids
  WHERE dispatch_order_id = p_dispatch_order_id;
  
  -- Create batch record
  INSERT INTO dispatch_barcode_batches (
    dispatch_order_id,
    batch_name,
    total_barcodes,
    printed_by
  ) VALUES (
    p_dispatch_order_id,
    COALESCE(p_batch_name, 'Batch-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24-MI-SS')),
    v_barcode_count,
    p_printed_by
  ) RETURNING id INTO v_batch_id;
  
  -- Mark all barcodes as printed
  UPDATE toy_dispatch_uuids
  SET 
    barcode_printed = TRUE,
    barcode_printed_at = NOW()
  WHERE dispatch_order_id = p_dispatch_order_id;
  
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to get dispatch order details with UUIDs
CREATE OR REPLACE FUNCTION get_dispatch_order_details(p_dispatch_order_id UUID)
RETURNS TABLE (
  dispatch_order_id UUID,
  original_order_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT,
  dispatch_date TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT,
  toy_uuid_code TEXT,
  toy_name TEXT,
  toy_brand TEXT,
  barcode_printed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    do.id,
    do.original_order_id,
    do.customer_name,
    do.customer_phone,
    do.status,
    do.dispatch_date,
    do.tracking_number,
    tdu.uuid_code,
    tdu.toy_name,
    tdu.toy_brand,
    tdu.barcode_printed
  FROM dispatch_orders do
  LEFT JOIN toy_dispatch_uuids tdu ON do.id = tdu.dispatch_order_id
  WHERE do.id = p_dispatch_order_id
  ORDER BY tdu.toy_name, tdu.uuid_code;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to search by UUID
CREATE OR REPLACE FUNCTION search_by_uuid(p_uuid_code TEXT)
RETURNS TABLE (
  dispatch_order_id UUID,
  original_order_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  toy_name TEXT,
  toy_brand TEXT,
  dispatch_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  condition_on_dispatch TEXT,
  condition_on_return TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    do.id,
    do.original_order_id,
    do.customer_name,
    do.customer_phone,
    tdu.toy_name,
    tdu.toy_brand,
    do.dispatch_date,
    do.status,
    tdu.condition_on_dispatch,
    tdu.condition_on_return
  FROM toy_dispatch_uuids tdu
  JOIN dispatch_orders do ON tdu.dispatch_order_id = do.id
  WHERE tdu.uuid_code = p_uuid_code;
END;
$$ LANGUAGE plpgsql;

-- 11. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dispatch_orders_updated_at 
  BEFORE UPDATE ON dispatch_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toy_dispatch_uuids_updated_at 
  BEFORE UPDATE ON toy_dispatch_uuids 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
