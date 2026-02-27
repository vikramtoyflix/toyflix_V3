-- Create exit-intent discount coupon in promotional offers system
-- This creates a 20% discount coupon that can be applied at checkout

-- First, ensure we have a system admin user to create the offer
-- We'll use a placeholder admin ID that should be replaced with actual admin user ID
DO $$
DECLARE
    admin_user_id UUID;
    offer_id UUID;
BEGIN
    -- Try to find an existing admin user
    SELECT id INTO admin_user_id 
    FROM public.custom_users 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- If no admin user exists, create a system admin user
    IF admin_user_id IS NULL THEN
        INSERT INTO public.custom_users (
            id,
            phone,
            email,
            first_name,
            last_name,
            role,
            phone_verified,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'system_admin',
            'admin@toyflix.com',
            'System',
            'Admin',
            'admin',
            true,
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Created system admin user with ID: %', admin_user_id;
    END IF;
    
    -- Create the exit-intent discount offer
    INSERT INTO public.promotional_offers (
        id,
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
        gen_random_uuid(),
        'SAVE20EXIT',
        'Exit Intent 20% Discount',
        'Special 20% discount for users who were about to leave the website. Valid for all subscription plans.',
        'discount_percentage',
        20.00,
        0.00,
        NULL, -- No maximum discount limit - apply full 20%
        ARRAY['discovery-delight', 'silver-pack', 'gold-pack'], -- Valid for all plans
        NULL, -- Unlimited usage
        0,
        NOW() - INTERVAL '1 day', -- Start from yesterday to ensure it's active
        NOW() + INTERVAL '1 year', -- Valid for 1 year
        true,
        false, -- Not auto-apply, user must enter code
        false, -- Not stackable with other offers
        false, -- Available for both new and existing users
        admin_user_id,
        NOW(),
        NOW()
    ) RETURNING id INTO offer_id;
    
    RAISE NOTICE 'Created exit-intent discount offer with ID: % and code: SAVE20EXIT', offer_id;
    
    -- Create a second variant for mobile users
    INSERT INTO public.promotional_offers (
        id,
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
        gen_random_uuid(),
        'MOBILE20',
        'Mobile Exit Intent 20% Discount',
        'Special 20% discount for mobile users who were about to leave. Valid for all subscription plans.',
        'discount_percentage',
        20.00,
        0.00,
        NULL, -- No maximum discount limit - apply full 20%
        ARRAY['discovery-delight', 'silver-pack', 'gold-pack'], -- Valid for all plans
        NULL, -- Unlimited usage
        0,
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '1 year',
        true,
        false,
        false,
        false,
        admin_user_id,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created mobile exit-intent discount offer with code: MOBILE20';
    
    -- Create a first-time user specific discount
    INSERT INTO public.promotional_offers (
        id,
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
        gen_random_uuid(),
        'WELCOME20',
        'First Time User 20% Discount',
        'Special 20% welcome discount for first-time users. Valid for all subscription plans.',
        'discount_percentage',
        20.00,
        0.00,
        500.00,
        ARRAY['discovery-delight', 'silver-pack', 'gold-pack'],
        NULL,
        0,
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '1 year',
        true,
        false,
        false,
        true, -- Only for first-time users
        admin_user_id,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created first-time user discount offer with code: WELCOME20';
    
END $$;

-- Create an index on promotional_offers.code for faster lookups
CREATE INDEX IF NOT EXISTS idx_promotional_offers_code ON public.promotional_offers(code);

-- Create an index on promotional_offers.is_active for faster filtering
CREATE INDEX IF NOT EXISTS idx_promotional_offers_active ON public.promotional_offers(is_active);

-- Verify the offers were created
DO $$
DECLARE
    offer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO offer_count 
    FROM public.promotional_offers 
    WHERE code IN ('SAVE20EXIT', 'MOBILE20', 'WELCOME20');
    
    IF offer_count = 3 THEN
        RAISE NOTICE 'SUCCESS: All 3 exit-intent discount offers created successfully';
    ELSE
        RAISE WARNING 'WARNING: Only % out of 3 offers were created', offer_count;
    END IF;
END $$;
