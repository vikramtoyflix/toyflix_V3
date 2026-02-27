-- 📞 MANUAL ADDRESS COLLECTION - PRIORITY CUSTOMERS
-- These 12 customers need to be contacted to collect their addresses

-- 1️⃣ RECENT HIGH PRIORITY CUSTOMERS (September 2025)
-- Contact these customers first as they have recent orders

SELECT 
    'HIGH_PRIORITY' as priority,
    ro.order_number,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    ro.total_amount,
    ro.created_at as order_date,
    EXTRACT(DAY FROM NOW() - ro.created_at) as days_since_order
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.order_number IN (
    'SUB_1758004081166_3fjpdhne8',  -- Urvashi Sharma
    'SUB_1758003590369_n0ihudc2k',  -- Sourabh Mandal
    'SUB_1757479573279_9isio1kwr'   -- Vishwanth B
)
ORDER BY ro.created_at DESC;

-- 2️⃣ MEDIUM PRIORITY CUSTOMERS (Early September)
SELECT 
    'MEDIUM_PRIORITY' as priority,
    ro.order_number,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    ro.total_amount,
    ro.created_at as order_date
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.order_number IN (
    'SUB_1757415662618_jvr96vwik',  -- Patil Shruti
    'SUB_1757309817201_ei9b5mmzt',  -- Varsha Nambiar
    'SUB_1757080642766_sm4l4thlq',  -- Aaliyah Fathima
    'SUB_1756987254509_tvapu5iwd',  -- Deepika Singhania
    'SUB_1756962221780_62se1ai86',  -- Lekha Suresh
    'SUB_1756962017832_hm68aarld',  -- Pranita Panangat
    'SUB_1756801575974_vqwdm6pu0',  -- Harika Etamukkala
    'SUB_1756796003224_9rkxajsxj',  -- Sushmita Srivastava
    'SUB_1756703937817_r7e85d7pb'   -- Sravani Goru
)
ORDER BY ro.created_at DESC;

-- 3️⃣ TEMPLATE FOR MANUAL ADDRESS UPDATE
-- Use this template when you get addresses from customers:

/*
UPDATE rental_orders 
SET 
    shipping_address = jsonb_build_object(
        'first_name', 'Customer First Name',
        'last_name', 'Customer Last Name', 
        'phone', 'Customer Phone',
        'email', '',
        'address_line1', 'Street Address Line 1',
        'address_line2', 'Apartment/Building Details',
        'city', 'City',
        'state', 'State',
        'postcode', 'Pincode',
        'country', 'India',
        'delivery_instructions', 'Any special instructions'
    ),
    updated_at = NOW()
WHERE order_number = 'ORDER_NUMBER_HERE';

-- Also update their profile for future orders:
UPDATE custom_users
SET 
    address_line1 = 'Street Address Line 1',
    address_line2 = 'Apartment/Building Details', 
    city = 'City',
    state = 'State',
    zip_code = 'Pincode',
    updated_at = NOW()
WHERE phone = 'CUSTOMER_PHONE_HERE';
*/
