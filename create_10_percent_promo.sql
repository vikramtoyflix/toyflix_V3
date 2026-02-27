-- ========================================
-- CREATE 10% DISCOUNT PROMO CODE
-- Creates a new promotional offer with 10% discount
-- ========================================

-- First, let's get an admin user ID to use as creator
-- You'll need to replace this with an actual admin user ID
DO $$
DECLARE
    admin_user_id UUID;
    new_offer_id UUID;
BEGIN
    -- Get the first admin user (replace with specific admin if needed)
    SELECT id INTO admin_user_id 
    FROM custom_users 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- If no admin found, create a system admin entry
    IF admin_user_id IS NULL THEN
        INSERT INTO custom_users (
            phone, 
            email, 
            first_name, 
            last_name, 
            role, 
            is_active
        ) VALUES (
            '+91-SYSTEM-ADMIN',
            'admin@toyflix.in',
            'System',
            'Admin',
            'admin',
            true
        ) RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Created system admin user: %', admin_user_id;
    END IF;
    
    -- Create the 10% discount promotional offer
    INSERT INTO promotional_offers (
        code,
        name,
        description,
        type,
        value,
        min_order_value,
        max_discount_amount,
        target_plans,
        usage_limit,
        usage_count,
        start_date,
        end_date,
        is_active,
        auto_apply,
        stackable,
        first_time_users_only,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        'SAVE10',                                    -- Promo code
        '10% Off Your Order',                        -- Display name
        'Get 10% discount on your ToyFlix subscription. Valid for all plans and customers.',  -- Description
        'discount_percentage',                       -- Type: percentage discount
        10.00,                                      -- Value: 10%
        500.00,                                     -- Minimum order value: ₹500
        1000.00,                                    -- Maximum discount: ₹1000
        ARRAY['discovery-delight', 'silver-pack', 'gold-pack', 'ride_on_fixed'], -- All plans
        NULL,                                       -- Usage limit: unlimited
        0,                                          -- Usage count: starts at 0
        NOW(),                                      -- Start date: immediately
        NOW() + INTERVAL '6 months',                -- End date: 6 months from now
        true,                                       -- Is active: yes
        false,                                      -- Auto apply: no (user must enter code)
        false,                                      -- Stackable: no
        false,                                      -- First time users only: no (all users)
        admin_user_id,                              -- Created by admin
        NOW(),                                      -- Created at
        NOW()                                       -- Updated at
    ) RETURNING id INTO new_offer_id;
    
    RAISE NOTICE 'Created promotional offer SAVE10 with ID: %', new_offer_id;
    
    -- Verify the offer was created
    IF new_offer_id IS NOT NULL THEN
        RAISE NOTICE '✅ SUCCESS: 10%% discount promo code SAVE10 created successfully!';
        RAISE NOTICE 'Code: SAVE10';
        RAISE NOTICE 'Discount: 10%% off';
        RAISE NOTICE 'Min Order: ₹500';
        RAISE NOTICE 'Max Discount: ₹1000';
        RAISE NOTICE 'Valid for: 6 months';
        RAISE NOTICE 'Applicable to: All plans';
    ELSE
        RAISE EXCEPTION 'Failed to create promotional offer';
    END IF;
END $$;

-- Verify the promotional offer was created correctly
SELECT 
    code,
    name,
    description,
    type,
    value as discount_percentage,
    min_order_value,
    max_discount_amount,
    target_plans,
    start_date,
    end_date,
    is_active,
    usage_count,
    usage_limit
FROM promotional_offers 
WHERE code = 'SAVE10';
