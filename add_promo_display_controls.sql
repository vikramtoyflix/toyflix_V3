-- ========================================
-- ADD DISPLAY CONTROL COLUMNS TO PROMOTIONAL OFFERS
-- Enables admin control over where promo codes are displayed
-- ========================================

-- Add display control columns to promotional_offers table
ALTER TABLE promotional_offers 
ADD COLUMN IF NOT EXISTS display_on_homepage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_on_pricing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS display_in_header BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_priority INTEGER DEFAULT 1;

-- Add index for display queries
CREATE INDEX IF NOT EXISTS idx_promotional_offers_display 
ON promotional_offers(is_active, display_priority DESC, created_at DESC) 
WHERE is_active = true;

-- Add index for homepage display
CREATE INDEX IF NOT EXISTS idx_promotional_offers_homepage 
ON promotional_offers(display_on_homepage, display_priority DESC) 
WHERE display_on_homepage = true AND is_active = true;

-- Add index for pricing page display
CREATE INDEX IF NOT EXISTS idx_promotional_offers_pricing 
ON promotional_offers(display_on_pricing, display_priority DESC) 
WHERE display_on_pricing = true AND is_active = true;

-- Add index for header display
CREATE INDEX IF NOT EXISTS idx_promotional_offers_header 
ON promotional_offers(display_in_header, display_priority DESC) 
WHERE display_in_header = true AND is_active = true;

-- Update existing SAVE10 offer to be displayed on pricing page
UPDATE promotional_offers 
SET 
  display_on_homepage = false,
  display_on_pricing = true,
  display_in_header = true,
  display_priority = 1,
  updated_at = NOW()
WHERE code = 'SAVE10';

-- Add comments for documentation
COMMENT ON COLUMN promotional_offers.display_on_homepage IS 'Whether to display this promo code on the homepage';
COMMENT ON COLUMN promotional_offers.display_on_pricing IS 'Whether to display this promo code on the pricing/plans page';
COMMENT ON COLUMN promotional_offers.display_in_header IS 'Whether to display this promo code in header banners';
COMMENT ON COLUMN promotional_offers.display_priority IS 'Display priority (1 = highest, 10 = lowest)';

-- Create function to get offers for specific display location
CREATE OR REPLACE FUNCTION get_display_offers(p_location TEXT)
RETURNS TABLE(
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  value DECIMAL,
  min_order_value DECIMAL,
  max_discount_amount DECIMAL,
  display_priority INTEGER
) AS $$
BEGIN
  CASE p_location
    WHEN 'homepage' THEN
      RETURN QUERY
      SELECT 
        po.id, po.code, po.name, po.description, po.type, 
        po.value, po.min_order_value, po.max_discount_amount, po.display_priority
      FROM promotional_offers po
      WHERE po.is_active = true 
        AND po.display_on_homepage = true
        AND po.start_date <= NOW()
        AND po.end_date >= NOW()
        AND (po.usage_limit IS NULL OR po.usage_count < po.usage_limit)
      ORDER BY po.display_priority DESC, po.created_at DESC;
      
    WHEN 'pricing' THEN
      RETURN QUERY
      SELECT 
        po.id, po.code, po.name, po.description, po.type, 
        po.value, po.min_order_value, po.max_discount_amount, po.display_priority
      FROM promotional_offers po
      WHERE po.is_active = true 
        AND po.display_on_pricing = true
        AND po.start_date <= NOW()
        AND po.end_date >= NOW()
        AND (po.usage_limit IS NULL OR po.usage_count < po.usage_limit)
      ORDER BY po.display_priority DESC, po.created_at DESC;
      
    WHEN 'header' THEN
      RETURN QUERY
      SELECT 
        po.id, po.code, po.name, po.description, po.type, 
        po.value, po.min_order_value, po.max_discount_amount, po.display_priority
      FROM promotional_offers po
      WHERE po.is_active = true 
        AND po.display_in_header = true
        AND po.start_date <= NOW()
        AND po.end_date >= NOW()
        AND (po.usage_limit IS NULL OR po.usage_count < po.usage_limit)
      ORDER BY po.display_priority DESC, po.created_at DESC
      LIMIT 1; -- Only show one header banner at a time
      
    ELSE
      -- Return all active offers if location not specified
      RETURN QUERY
      SELECT 
        po.id, po.code, po.name, po.description, po.type, 
        po.value, po.min_order_value, po.max_discount_amount, po.display_priority
      FROM promotional_offers po
      WHERE po.is_active = true 
        AND po.start_date <= NOW()
        AND po.end_date >= NOW()
        AND (po.usage_limit IS NULL OR po.usage_count < po.usage_limit)
      ORDER BY po.display_priority DESC, po.created_at DESC;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_display_offers(TEXT) TO authenticated;

-- Verify the update
SELECT 
  code,
  name,
  display_on_homepage,
  display_on_pricing,
  display_in_header,
  display_priority
FROM promotional_offers 
WHERE code = 'SAVE10';
