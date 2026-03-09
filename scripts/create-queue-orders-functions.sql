-- Create function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_queue_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_num TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate order number with format: QU-YYYYMMDD-XXXX
        order_num := 'QU-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                     LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
        
        -- Check if this order number already exists
        IF NOT EXISTS (SELECT 1 FROM queue_orders WHERE order_number = order_num) THEN
            RETURN order_num;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            order_num := 'QU-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN order_num;
END;
$$;

-- Create trigger function to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_queue_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_queue_order_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_queue_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_set_queue_order_number
    BEFORE INSERT ON queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_queue_order_number();

CREATE TRIGGER trigger_update_queue_orders_updated_at
    BEFORE UPDATE ON queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_queue_orders_updated_at();

-- Test the function
SELECT generate_queue_order_number() as sample_order_number; 