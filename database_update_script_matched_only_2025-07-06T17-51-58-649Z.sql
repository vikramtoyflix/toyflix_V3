-- Database Update Script for Excel Data Sync (Matched Customers Only)
-- Generated on: 2025-07-06T17:51:58.649Z
-- Total Excel customers: 329
-- Matched customers: 201
-- Updates to apply: 201

-- WARNING: This script will update database records. Please review before executing.
-- Recommended: Run in a transaction and test on staging first.

BEGIN;

-- Add Excel sync columns to custom_users table if they don't exist
ALTER TABLE custom_users 
ADD COLUMN IF NOT EXISTS excel_subscription_date DATE,
ADD COLUMN IF NOT EXISTS excel_plan TEXT,
ADD COLUMN IF NOT EXISTS excel_months TEXT,
ADD COLUMN IF NOT EXISTS excel_pending_months TEXT,
ADD COLUMN IF NOT EXISTS excel_area_pin_code TEXT,
ADD COLUMN IF NOT EXISTS excel_last_delivered_date DATE,
ADD COLUMN IF NOT EXISTS excel_sync_date DATE;

-- Update user profiles with Excel data (matched customers only)
-- Excel Row 2: vanitha shree
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vanitha shree',
    excel_subscription_date = '2024-05-12',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'pickup',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-07-28',
    excel_sync_date = '2025-07-06'
WHERE id = '5d82833e-4239-4153-a5ed-a4a08ce96bfc';

-- Excel Row 6: jyotsna P
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'jyotsna P',
    excel_subscription_date = '2024-04-28',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-09-11',
    excel_sync_date = '2025-07-06'
WHERE id = '8f219c19-8443-4c98-bd02-d326241e8830';

-- Excel Row 7: nishant sharma
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nishant sharma',
    excel_subscription_date = '2024-04-10',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-09-15',
    excel_sync_date = '2025-07-06'
WHERE id = 'f759f068-437f-4ada-a4cb-c3b5dab22906';

-- Excel Row 8: pooja preetham
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'pooja preetham',
    excel_subscription_date = '2024-04-17',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'repeat gold',
    excel_last_delivered_date = '2024-09-18',
    excel_sync_date = '2025-07-06'
WHERE id = '9f83f0e7-28ea-4724-9180-f5e026a8e2ca';

-- Excel Row 9: manjeet
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'manjeet',
    excel_subscription_date = '2024-04-12',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'Compeleted',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-09-19',
    excel_sync_date = '2025-07-06'
WHERE id = '94e23931-b81a-4cfe-9c8d-f11f215b4bf1';

-- Excel Row 10: guru rajan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'guru rajan',
    excel_subscription_date = '2024-04-22',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-09-25',
    excel_sync_date = '2025-07-06'
WHERE id = '0ebf1e13-fb04-4a00-a1eb-edcb060ae509';

-- Excel Row 11: sujay G
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sujay G',
    excel_subscription_date = '2024-05-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-09-27',
    excel_sync_date = '2025-07-06'
WHERE id = 'c0bb6b61-c1fa-4671-90e8-ff855edde6ea';

-- Excel Row 12: T bhagawan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'T bhagawan',
    excel_subscription_date = '2023-09-25',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-09-30',
    excel_sync_date = '2025-07-06'
WHERE id = '1ed06cf4-073a-4300-8cf8-618732fc3027';

-- Excel Row 13: dhananjaya bhave
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'dhananjaya bhave',
    excel_subscription_date = '2024-05-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-04',
    excel_sync_date = '2025-07-06'
WHERE id = 'c1115a26-f86f-4c2d-963e-c244468d75c9';

-- Excel Row 14: dhriti singh
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'dhriti singh',
    excel_subscription_date = '2024-05-01',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-06',
    excel_sync_date = '2025-07-06'
WHERE id = '928c6ee6-50ad-4030-8926-d7b56adad28d';

-- Excel Row 15: rajaram regupathy
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rajaram regupathy',
    excel_subscription_date = '2024-05-05',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-06',
    excel_sync_date = '2025-07-06'
WHERE id = 'deb204ac-caca-4b5a-abc7-63b962ef4a6b';

-- Excel Row 16: priyanka krishnan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'priyanka krishnan',
    excel_subscription_date = '2024-05-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-06',
    excel_sync_date = '2025-07-06'
WHERE id = '8163c565-e6cb-4dea-b2c8-1a47d874fdee';

-- Excel Row 17: vasundhara P
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vasundhara P',
    excel_subscription_date = '2024-10-07',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-09',
    excel_sync_date = '2025-07-06'
WHERE id = 'ef7441f5-fbca-4ed1-bea7-ce672b8016f1';

-- Excel Row 18: sangeetha anu sheyon
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sangeetha anu sheyon',
    excel_subscription_date = '2023-09-08',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-10',
    excel_sync_date = '2025-07-06'
WHERE id = '85614892-73e2-473b-91f4-bfe810bb1437';

-- Excel Row 19: kavyashree GC
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kavyashree GC',
    excel_subscription_date = '2024-04-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-10',
    excel_sync_date = '2025-07-06'
WHERE id = 'd822d808-477d-4410-94df-64194c7f0b37';

-- Excel Row 20: anusha M
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'anusha M',
    excel_subscription_date = '2024-05-05',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-14',
    excel_sync_date = '2025-07-06'
WHERE id = 'e48a0c13-2ea6-45da-b40c-887fb6d8bcc0';

-- Excel Row 21: chandra sunilkumar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'chandra sunilkumar',
    excel_subscription_date = '2024-07-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-23',
    excel_sync_date = '2025-07-06'
WHERE id = '90140ac5-7962-4029-9a51-cfbc196a8ccd';

-- Excel Row 22: pearl peris
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'pearl peris',
    excel_subscription_date = '2024-05-13',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-24',
    excel_sync_date = '2025-07-06'
WHERE id = '2159a211-95c9-47f8-ae08-36603d6a7e9b';

-- Excel Row 23: navya paleti
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'navya paleti',
    excel_subscription_date = '2023-11-08',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-26',
    excel_sync_date = '2025-07-06'
WHERE id = '6e5af210-6bc2-4ab8-9edd-c8a805474321';

-- Excel Row 24: sourabh awadhiya
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sourabh awadhiya',
    excel_subscription_date = '2024-05-13',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-27',
    excel_sync_date = '2025-07-06'
WHERE id = '09311388-4c2f-43b7-a45b-1bb3807d6a36';

-- Excel Row 25: swapna ashok
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'swapna ashok',
    excel_subscription_date = '2024-05-08',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-10-31',
    excel_sync_date = '2025-07-06'
WHERE id = '22f78989-fd4e-4281-823f-5750c96db15e';

-- Excel Row 27: nazreen ayyaril
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nazreen ayyaril',
    excel_subscription_date = '2024-05-31',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-07',
    excel_sync_date = '2025-07-06'
WHERE id = '9a2bbebd-665d-4572-a4f8-45eb3b9b1081';

-- Excel Row 28: viji iyer
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'viji iyer',
    excel_subscription_date = '2024-05-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-13',
    excel_sync_date = '2025-07-06'
WHERE id = '54b13176-aeb6-4585-8ac6-b5f6d3240634';

-- Excel Row 30: Preema sharon
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Preema sharon',
    excel_subscription_date = '2024-06-11',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'pickup',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-18',
    excel_sync_date = '2025-07-06'
WHERE id = 'ca2ddcf8-c913-402f-90ef-2030b9fc0865';

-- Excel Row 31: jahnavi kaspa
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'jahnavi kaspa',
    excel_subscription_date = '2024-06-08',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-21',
    excel_sync_date = '2025-07-06'
WHERE id = '2642208c-682f-4d0d-a362-b1416345e710';

-- Excel Row 32: anil dsouza
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'anil dsouza',
    excel_subscription_date = '2024-04-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-22',
    excel_sync_date = '2025-07-06'
WHERE id = 'c110f46a-4c5b-49fc-be86-2214086e14d1';

-- Excel Row 33: nandhureddy
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nandhureddy',
    excel_subscription_date = '2024-06-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-24',
    excel_sync_date = '2025-07-06'
WHERE id = '42303d91-2d50-43c8-86f4-0e89a98fb035';

-- Excel Row 34: Preethi chandrashekar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Preethi chandrashekar',
    excel_subscription_date = '2024-06-03',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-27',
    excel_sync_date = '2025-07-06'
WHERE id = '7106c11f-c6ad-4247-8c38-de3fef1e9299';

-- Excel Row 35: simran singh
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'simran singh',
    excel_subscription_date = '2024-06-19',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-28',
    excel_sync_date = '2025-07-06'
WHERE id = '9a200ae1-b80c-4696-a43a-63ad53682911';

-- Excel Row 36: rakesh behera
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rakesh behera',
    excel_subscription_date = '2024-06-23',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months ',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-28',
    excel_sync_date = '2025-07-06'
WHERE id = '203a1d89-3cac-413f-aa65-6d2924c13586';

-- Excel Row 37: swettha S
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'swettha S',
    excel_subscription_date = '2024-06-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-11-29',
    excel_sync_date = '2025-07-06'
WHERE id = '00b8c6b1-aa51-49e1-a9f3-3a15ea27dabb';

-- Excel Row 38: rohini KG
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rohini KG',
    excel_subscription_date = '2024-07-19',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-01',
    excel_sync_date = '2025-07-06'
WHERE id = 'b4619f4f-4881-4269-9b05-f7343004a046';

-- Excel Row 39: nikunj vardhani
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nikunj vardhani',
    excel_subscription_date = '2023-09-04',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-07',
    excel_sync_date = '2025-07-06'
WHERE id = 'a05b5bcf-ff3c-464b-90a7-3fb40fd36261';

-- Excel Row 40: Aaliyah Fathima
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Aaliyah Fathima',
    excel_subscription_date = '2024-07-12',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-08',
    excel_sync_date = '2025-07-06'
WHERE id = 'c3b79b56-b7d8-43fe-a53f-924a8c189d68';

-- Excel Row 41: neha mishra
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'neha mishra',
    excel_subscription_date = '2024-04-10',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = '1 month pending',
    excel_area_pin_code = 'pickup done on 5th jan',
    excel_last_delivered_date = '2024-12-12',
    excel_sync_date = '2025-07-06'
WHERE id = '68b7a859-fc11-4b33-9c20-45ccddaf9910';

-- Excel Row 42: rahul shah
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rahul shah',
    excel_subscription_date = '2024-05-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-12',
    excel_sync_date = '2025-07-06'
WHERE id = 'c60d72ec-797c-4aa2-b904-26e81d7198f7';

-- Excel Row 43: veeresh shetty
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'veeresh shetty',
    excel_subscription_date = '2024-07-05',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-16',
    excel_sync_date = '2025-07-06'
WHERE id = '511d1eae-c417-40e1-afe8-172663b4f1df';

-- Excel Row 44: kanika kapur
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kanika kapur',
    excel_subscription_date = '2024-05-01',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-19',
    excel_sync_date = '2025-07-06'
WHERE id = '3a0019ac-89e4-4821-9539-19ec257dd5a0';

-- Excel Row 45: swetha vivek
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'swetha vivek',
    excel_subscription_date = '2024-07-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2024-12-21',
    excel_sync_date = '2025-07-06'
WHERE id = 'd0f3f705-80ab-4d0c-9ab2-f8f1e3ea42a6';

-- Excel Row 47: dhwij mahida
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'dhwij mahida',
    excel_subscription_date = '2024-06-15',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2024-12-24',
    excel_sync_date = '2025-07-06'
WHERE id = '249b0736-5b1b-41a1-b240-f13582bce584';

-- Excel Row 48: kruthi krishna
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kruthi krishna',
    excel_subscription_date = '2024-11-18',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months ',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-26',
    excel_sync_date = '2025-07-06'
WHERE id = '877512ea-86a8-4987-afb5-f1e99cfb7d87';

-- Excel Row 50: akhila bhat
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'akhila bhat',
    excel_subscription_date = '2024-05-22',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-29',
    excel_sync_date = '2025-07-06'
WHERE id = '6587a892-c8b1-4cf8-911e-4b594d039ae7';

-- Excel Row 51: taanvi bharath BS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'taanvi bharath BS',
    excel_subscription_date = '2024-06-16',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2024-12-30',
    excel_sync_date = '2025-07-06'
WHERE id = 'ba48cadb-8fea-4bdf-9a78-bf17649f1d17';

-- Excel Row 52: devi ganesh
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'devi ganesh',
    excel_subscription_date = '2024-08-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2024-12-31',
    excel_sync_date = '2025-07-06'
WHERE id = '454b8419-d880-4a85-a503-ee17d40a9a0c';

-- Excel Row 54: sanchaya sunder
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sanchaya sunder',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-01-13',
    excel_sync_date = '2025-07-06'
WHERE id = '29c1bda3-296f-452c-86bf-c2d7794db96f';

-- Excel Row 55: ramya subramnya
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ramya subramnya',
    excel_subscription_date = NULL,
    excel_plan = 'FREE',
    excel_months = 'FREE',
    excel_pending_months = 'FREE',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-15',
    excel_sync_date = '2025-07-06'
WHERE id = '4fe43594-5898-4ce0-9fd6-2347e16fce1f';

-- Excel Row 56: rajeshwari ML
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rajeshwari ML',
    excel_subscription_date = '2024-01-05',
    excel_plan = '6 MONTHS GOLD',
    excel_months = 'yearly',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-17',
    excel_sync_date = '2025-07-06'
WHERE id = '6e5fe84a-75e1-490d-8fe3-127fcbbb403e';

-- Excel Row 57: manjunath vadigeri
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'manjunath vadigeri',
    excel_subscription_date = '2024-04-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-17',
    excel_sync_date = '2025-07-06'
WHERE id = '2e9622ea-3524-44f9-9d57-34b1fbebd1ed';

-- Excel Row 58: shobhit shrivatsava
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'shobhit shrivatsava',
    excel_subscription_date = '2024-07-06',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-17',
    excel_sync_date = '2025-07-06'
WHERE id = '1f62652c-7b54-452e-88b1-84ffe60beb35';

-- Excel Row 59: devika RN
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'devika RN',
    excel_subscription_date = '2024-08-31',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-17',
    excel_sync_date = '2025-07-06'
WHERE id = '41dbcc87-96ff-4a2e-8651-51eff1fc893a';

-- Excel Row 60: sneha N
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sneha N',
    excel_subscription_date = '2024-07-15',
    excel_plan = '6 MONTHS SLIVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-19',
    excel_sync_date = '2025-07-06'
WHERE id = '5cde12e7-906c-4b78-87b2-c61a98ccea3f';

-- Excel Row 61: shipra bharadwaj
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'shipra bharadwaj',
    excel_subscription_date = '2024-10-06',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-01-19',
    excel_sync_date = '2025-07-06'
WHERE id = '87c0a8cf-e393-4fbd-b48c-c57b9c26efa0';

-- Excel Row 62: yeshwanth GN
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'yeshwanth GN',
    excel_subscription_date = '2024-08-07',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-01-20',
    excel_sync_date = '2025-07-06'
WHERE id = '84f3fccf-f9f8-40d4-852c-88e9edee4063';

-- Excel Row 63: indu narthan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'indu narthan',
    excel_subscription_date = '2024-10-17',
    excel_plan = '6 MONTHS SLIVER',
    excel_months = '7 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-20',
    excel_sync_date = '2025-07-06'
WHERE id = '91d5db07-2c66-4616-81dc-532806011f08';

-- Excel Row 64: mallika PJ
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'mallika PJ',
    excel_subscription_date = '2024-07-17',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-24',
    excel_sync_date = '2025-07-06'
WHERE id = 'b59819b1-31bd-438b-9fff-fc615699f49a';

-- Excel Row 65: nithya S
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nithya S',
    excel_subscription_date = '2024-08-17',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-29',
    excel_sync_date = '2025-07-06'
WHERE id = 'ba424180-16ec-4b69-9cd3-6d8418f2d875';

-- Excel Row 66: milin K
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'milin K',
    excel_subscription_date = '2024-08-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-30',
    excel_sync_date = '2025-07-06'
WHERE id = 'aa6a8607-a4f4-41fc-84d2-ed2008b7b1d5';

-- Excel Row 67: kanagarla kishor K
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kanagarla kishor K',
    excel_subscription_date = '2024-12-14',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-01-30',
    excel_sync_date = '2025-07-06'
WHERE id = '26f9d96a-a777-4908-a44b-abd6ab76bdad';

-- Excel Row 68: savitha rudramuni
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'savitha rudramuni',
    excel_subscription_date = '2024-08-04',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-01-31',
    excel_sync_date = '2025-07-06'
WHERE id = '2c9eaf50-8a26-482f-8795-55c6fb5ce188';

-- Excel Row 69: rakshith G
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rakshith G',
    excel_subscription_date = '2024-08-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-01-31',
    excel_sync_date = '2025-07-06'
WHERE id = '63dc45d6-5cdf-44a4-8af2-1fb0f6724d2e';

-- Excel Row 70: pranav pansari
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'pranav pansari',
    excel_subscription_date = '2024-08-23',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '1 month pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-01',
    excel_sync_date = '2025-07-06'
WHERE id = 'b671b0f2-d9a3-436a-995e-eec4539b3242';

-- Excel Row 71: santhoshi tanniru
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'santhoshi tanniru',
    excel_subscription_date = '2024-08-28',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'next monday ',
    excel_last_delivered_date = '2025-02-02',
    excel_sync_date = '2025-07-06'
WHERE id = 'f0dc07f4-c0dc-4ca2-8d7f-bc1110fb76c7';

-- Excel Row 72: himabindhu beeraka
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'himabindhu beeraka',
    excel_subscription_date = '2024-08-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-06',
    excel_sync_date = '2025-07-06'
WHERE id = 'ee8d7d96-2355-47d3-8a0f-a6b935f506ea';

-- Excel Row 73: akash chowkampally
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'akash chowkampally',
    excel_subscription_date = '2024-07-07',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-10',
    excel_sync_date = '2025-07-06'
WHERE id = '22498a28-b5b4-422d-896a-c21730e2566d';

-- Excel Row 74: venkat K
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'venkat K',
    excel_subscription_date = '2024-07-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-12',
    excel_sync_date = '2025-07-06'
WHERE id = '42209463-9caa-463b-800b-7be222985f47';

-- Excel Row 75: arunram
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'arunram',
    excel_subscription_date = '2024-08-09',
    excel_plan = '6 MONTHS SLIVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-13',
    excel_sync_date = '2025-07-06'
WHERE id = '128ceffe-43f7-43cf-b869-ec2fc1d56d3c';

-- Excel Row 76: sukhpreet wadhwa
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sukhpreet wadhwa',
    excel_subscription_date = '2024-08-12',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'sent msg for toy selection',
    excel_last_delivered_date = '2025-02-14',
    excel_sync_date = '2025-07-06'
WHERE id = '1df467f2-d5f9-4720-bb6b-03d732a8aa83';

-- Excel Row 77: sreekanth gadara
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sreekanth gadara',
    excel_subscription_date = '2024-07-16',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done he has taken rideon car for 2 months instead of gold plan. omce picked up end subscrption								',
    excel_last_delivered_date = '2025-02-16',
    excel_sync_date = '2025-07-06'
WHERE id = 'ee01fa4b-2399-4fd4-823a-c63d44a162ca';

-- Excel Row 79: kiran kumari
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kiran kumari',
    excel_subscription_date = '2024-07-14',
    excel_plan = '6 MONTHS SLIVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-20',
    excel_sync_date = '2025-07-06'
WHERE id = '144997e3-8c9c-4a76-85d9-24f3babd835f';

-- Excel Row 81: richa agrawal
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'richa agrawal',
    excel_subscription_date = '2024-06-27',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-21',
    excel_sync_date = '2025-07-06'
WHERE id = '958b8584-426f-478a-b8f7-cd03c52844d0';

-- Excel Row 83: abhishek mallabadi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'abhishek mallabadi',
    excel_subscription_date = '2024-02-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-26',
    excel_sync_date = '2025-07-06'
WHERE id = '5c9104ec-ca27-4eff-a6fe-90d551ab579c';

-- Excel Row 84: chaitra K
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'chaitra K',
    excel_subscription_date = '2024-08-07',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-02-26',
    excel_sync_date = '2025-07-06'
WHERE id = '4ecf4949-7173-4bb0-b3cc-0d7669f0ea4d';

-- Excel Row 85: santosh sajjan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'santosh sajjan',
    excel_subscription_date = '2024-07-27',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pick up done ',
    excel_last_delivered_date = '2025-03-01',
    excel_sync_date = '2025-07-06'
WHERE id = 'b432a496-8dc2-4a96-b904-bbac0c022aee';

-- Excel Row 87: smitha BS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'smitha BS',
    excel_subscription_date = '2024-09-19',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pick up done ',
    excel_last_delivered_date = '2025-03-03',
    excel_sync_date = '2025-07-06'
WHERE id = 'dfc56282-161d-45ae-81a7-c5d42ef5724b';

-- Excel Row 88: Anirudh Purohit
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Anirudh Purohit',
    excel_subscription_date = '2024-08-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = 'picked up on 15th march',
    excel_last_delivered_date = '2025-03-06',
    excel_sync_date = '2025-07-06'
WHERE id = '57b8fc6f-87b2-4146-80cc-d819a3eb4cd6';

-- Excel Row 89: sneha S
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sneha S',
    excel_subscription_date = '2024-07-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked up on 18th march',
    excel_last_delivered_date = '2025-03-08',
    excel_sync_date = '2025-07-06'
WHERE id = '0641e7ac-7db2-4ad0-9427-7145402baafb';

-- Excel Row 90: sudhanshu dwivedi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sudhanshu dwivedi',
    excel_subscription_date = '2024-08-15',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked up on 8th march',
    excel_last_delivered_date = '2025-03-09',
    excel_sync_date = '2025-07-06'
WHERE id = '20afeb09-f5cd-4678-9483-eb75ed2fa805';

-- Excel Row 92: manjunatha DS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'manjunatha DS',
    excel_subscription_date = '2024-09-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = 'PICKUP DONE',
    excel_last_delivered_date = '2025-03-14',
    excel_sync_date = '2025-07-06'
WHERE id = '1ba30f87-2dc4-48e8-9955-32e430db1a14';

-- Excel Row 93: raj V joshi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'raj V joshi',
    excel_subscription_date = '2024-10-29',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-03-14',
    excel_sync_date = '2025-07-06'
WHERE id = 'c4a0c6d1-6079-4807-af4e-bf901df2bb8d';

-- Excel Row 94: sneha sahay
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sneha sahay',
    excel_subscription_date = '2024-09-03',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-03-18',
    excel_sync_date = '2025-07-06'
WHERE id = 'ec6dd395-3889-4c75-96de-53808f384755';

-- Excel Row 95: uday bomma
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'uday bomma',
    excel_subscription_date = '2024-09-17',
    excel_plan = '6 MONTHS SLIVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-03-20',
    excel_sync_date = '2025-07-06'
WHERE id = '9c340896-9de4-45a2-be4e-682b6555f0e7';

-- Excel Row 96: girish bhat
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'girish bhat',
    excel_subscription_date = '2024-10-27',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'old toys she ll continue',
    excel_last_delivered_date = '2025-03-21',
    excel_sync_date = '2025-07-06'
WHERE id = 'fd59716d-c1ae-4b01-a1ac-6d263effe480';

-- Excel Row 97: vishwanth BS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vishwanth BS',
    excel_subscription_date = '2024-10-22',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-03-24',
    excel_sync_date = '2025-07-06'
WHERE id = 'c6f38825-7aa2-4c34-8513-eba89020b91d';

-- Excel Row 98: shalini dhoss
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'shalini dhoss',
    excel_subscription_date = '2024-09-25',
    excel_plan = '6 MONTHS SLIVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup done',
    excel_last_delivered_date = '2025-03-25',
    excel_sync_date = '2025-07-06'
WHERE id = '804a6cfb-9abc-41b9-b67d-e794db94d330';

-- Excel Row 99: yashna simha
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'yashna simha',
    excel_subscription_date = '2024-11-17',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-03-25',
    excel_sync_date = '2025-07-06'
WHERE id = 'f0658f5d-5d73-438a-aea6-8748177e47c3';

-- Excel Row 100: gagan GC
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'gagan GC',
    excel_subscription_date = '2024-09-12',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-03-26',
    excel_sync_date = '2025-07-06'
WHERE id = '5fd2c6ac-2324-44a7-9641-1c00e59117df';

-- Excel Row 102: athmica shetty
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'athmica shetty',
    excel_subscription_date = '2024-10-27',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pick up done',
    excel_last_delivered_date = '2025-03-31',
    excel_sync_date = '2025-07-06'
WHERE id = 'acdd70d6-1430-431b-a06f-0a5a1efe0451';

-- Excel Row 105: carolyn monisha
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'carolyn monisha',
    excel_subscription_date = '2024-08-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-04',
    excel_sync_date = '2025-07-06'
WHERE id = '0cae38a1-8df1-4b9a-9374-5f730e9f9fc5';

-- Excel Row 106: vasudevan ER
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vasudevan ER',
    excel_subscription_date = '2024-11-01',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked on 1st apr',
    excel_last_delivered_date = '2025-04-08',
    excel_sync_date = '2025-07-06'
WHERE id = '61ec9bea-e8c2-426b-9cf9-b094914d9f67';

-- Excel Row 107: mythili ganga
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'mythili ganga',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'pickup completed',
    excel_last_delivered_date = '2025-04-08',
    excel_sync_date = '2025-07-06'
WHERE id = '0a21359d-cd19-4126-a9f4-bee3b07a723a';

-- Excel Row 108: athira S kumar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'athira S kumar',
    excel_subscription_date = '2024-09-30',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-09',
    excel_sync_date = '2025-07-06'
WHERE id = 'cf2ec4a7-56eb-4894-8b54-deecd2ed04db';

-- Excel Row 109: sai ujwala
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sai ujwala',
    excel_subscription_date = '2024-09-19',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'Completed',
    excel_area_pin_code = 'picked toys',
    excel_last_delivered_date = '2025-04-10',
    excel_sync_date = '2025-07-06'
WHERE id = '823a68ed-fbfe-4799-a05d-bc325f46259d';

-- Excel Row 110: Shweta krishnan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Shweta krishnan',
    excel_subscription_date = '2024-10-11',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-12',
    excel_sync_date = '2025-07-06'
WHERE id = 'a8d945cb-e8d0-4192-9f22-eea407a613c1';

-- Excel Row 111: ujjal kumar sarma
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ujjal kumar sarma',
    excel_subscription_date = '2024-11-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-14',
    excel_sync_date = '2025-07-06'
WHERE id = '27922466-7baf-4e0f-8510-353f36fc6feb';

-- Excel Row 112: vishal sulibhavi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vishal sulibhavi',
    excel_subscription_date = '2024-10-24',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-15',
    excel_sync_date = '2025-07-06'
WHERE id = 'b0f966ef-8963-4beb-89d9-610af3862faa';

-- Excel Row 113: aayushi shakya
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'aayushi shakya',
    excel_subscription_date = '2024-11-10',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'pickup completed on 8th apr',
    excel_last_delivered_date = '2025-04-15',
    excel_sync_date = '2025-07-06'
WHERE id = '263f2edd-b4ae-4df0-bb59-1980f5c1c2eb';

-- Excel Row 114: naveen rana
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'naveen rana',
    excel_subscription_date = '2024-08-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-16',
    excel_sync_date = '2025-07-06'
WHERE id = 'c1934ad1-d672-4ce1-9767-fe70164b0752';

-- Excel Row 115: naeha kochar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'naeha kochar',
    excel_subscription_date = '2024-10-28',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-18',
    excel_sync_date = '2025-07-06'
WHERE id = '909b9511-0cd6-4f24-b591-60da51797b79';

-- Excel Row 116: gayatri ganesan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'gayatri ganesan',
    excel_subscription_date = '2024-09-14',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'picked on 19th apr',
    excel_last_delivered_date = '2025-04-18',
    excel_sync_date = '2025-07-06'
WHERE id = '3aca26f6-8c26-4dd8-8b2e-d3ff846537fb';

-- Excel Row 117: rakshith KN
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rakshith KN',
    excel_subscription_date = '2024-10-20',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-20',
    excel_sync_date = '2025-07-06'
WHERE id = 'acbc4dad-830e-413a-bc03-1bab2c922f6a';

-- Excel Row 118: sushmitha sanju
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sushmitha sanju',
    excel_subscription_date = '2024-10-14',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-21',
    excel_sync_date = '2025-07-06'
WHERE id = '86a85626-3a9f-482b-a7d6-7195396a039a';

-- Excel Row 119: manoj dara
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'manoj dara',
    excel_subscription_date = '2024-10-13',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-22',
    excel_sync_date = '2025-07-06'
WHERE id = '9d620e6b-6e97-477e-b826-6528704b73fa';

-- Excel Row 120: preethi varghese
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'preethi varghese',
    excel_subscription_date = '2024-11-12',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked toys ',
    excel_last_delivered_date = '2025-04-24',
    excel_sync_date = '2025-07-06'
WHERE id = '884446c6-8099-4eb1-85b4-acbdec528619';

-- Excel Row 122: neha kamboj
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'neha kamboj',
    excel_subscription_date = '2024-08-13',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-04-29',
    excel_sync_date = '2025-07-06'
WHERE id = 'f94176c7-0dba-4c67-8c99-030a46ef21e1';

-- Excel Row 123: sathya T
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sathya T',
    excel_subscription_date = '2024-09-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked on 29th apr',
    excel_last_delivered_date = '2025-05-01',
    excel_sync_date = '2025-07-06'
WHERE id = 'f0caa9cc-fbb6-4ba9-8dbc-4d2d1bf7e78e';

-- Excel Row 124: maitri sheth
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'maitri sheth',
    excel_subscription_date = '2024-12-11',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-02',
    excel_sync_date = '2025-07-06'
WHERE id = '99c167b1-8691-4a06-a692-4ae5a4e5d8bd';

-- Excel Row 126: swetha rajshekar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'swetha rajshekar',
    excel_subscription_date = '2024-11-30',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-05',
    excel_sync_date = '2025-07-06'
WHERE id = '11e4e3dd-4b4f-4b37-a544-a314ac74e2fd';

-- Excel Row 127: sinshu hegade
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sinshu hegade',
    excel_subscription_date = '2024-12-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-05',
    excel_sync_date = '2025-07-06'
WHERE id = 'd5b28048-cd40-4686-88fc-a84e5b0c238d';

-- Excel Row 128: ritika jindal
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ritika jindal',
    excel_subscription_date = '2024-11-12',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'pickup completed on 26th mar',
    excel_last_delivered_date = '2025-05-06',
    excel_sync_date = '2025-07-06'
WHERE id = 'd5ee2df0-4820-4d43-a2c5-b53f31503756';

-- Excel Row 129: priya jacob
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'priya jacob',
    excel_subscription_date = '2024-10-23',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked on 28th ',
    excel_last_delivered_date = '2025-05-08',
    excel_sync_date = '2025-07-06'
WHERE id = '09596099-1cd6-45a2-ba62-d16e313b1ca6';

-- Excel Row 130: ashwini anand
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ashwini anand',
    excel_subscription_date = '2024-09-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-09',
    excel_sync_date = '2025-07-06'
WHERE id = 'f5a17b2d-900d-4cf3-96be-617b4322eb3f';

-- Excel Row 131: veena MC
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'veena MC',
    excel_subscription_date = '2024-11-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-09',
    excel_sync_date = '2025-07-06'
WHERE id = 'b1a54767-9fac-4fcd-ae17-0ae40f61a74c';

-- Excel Row 132: chaya devi K
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'chaya devi K',
    excel_subscription_date = '2024-10-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-12',
    excel_sync_date = '2025-07-06'
WHERE id = '023e5556-dd1e-4f72-bede-7456e79de6d4';

-- Excel Row 135: Sweta keshari
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Sweta keshari',
    excel_subscription_date = '2024-11-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-17',
    excel_sync_date = '2025-07-06'
WHERE id = 'd5a9b014-662e-40ed-bfaa-54b2d2ec5162';

-- Excel Row 136: rohit chaurasia
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rohit chaurasia',
    excel_subscription_date = '2024-09-22',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-17',
    excel_sync_date = '2025-07-06'
WHERE id = '3aa6354b-0e53-4557-81ff-90ea19aa957c';

-- Excel Row 139: delucy gabiriel
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'delucy gabiriel',
    excel_subscription_date = '2024-12-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-20',
    excel_sync_date = '2025-07-06'
WHERE id = '378b6d06-8339-46d9-ac3f-58bb518a8881';

-- Excel Row 140: ashwini anand
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ashwini anand',
    excel_subscription_date = '2024-12-22',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = 'picked on 13th may',
    excel_last_delivered_date = '2025-05-23',
    excel_sync_date = '2025-07-06'
WHERE id = '93a7ca43-4049-468a-a461-15a48a04309e';

-- Excel Row 141: vatsala bhutani
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vatsala bhutani',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = ' picked on 30th may',
    excel_last_delivered_date = '2025-05-25',
    excel_sync_date = '2025-07-06'
WHERE id = '8c822e69-0aaf-4362-b4bd-da148390b1eb';

-- Excel Row 142: reeta vadera kelkar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'reeta vadera kelkar',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-26',
    excel_sync_date = '2025-07-06'
WHERE id = '2e615030-627b-4a27-b84d-9af1cd5b135f';

-- Excel Row 143: karthika praveen
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'karthika praveen',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = '4 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-29',
    excel_sync_date = '2025-07-06'
WHERE id = '3f5622ef-54da-41bf-b672-d9345d8f6822';

-- Excel Row 145: krithika mani
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'krithika mani',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-29',
    excel_sync_date = '2025-07-06'
WHERE id = '6c6d4597-c664-4dd8-92c7-e988205fede9';

-- Excel Row 147: himanshu kumar(paromitha paul)
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'himanshu kumar(paromitha paul)',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '-',
    excel_last_delivered_date = '2025-05-30',
    excel_sync_date = '2025-07-06'
WHERE id = '6a346bd3-d1f4-4de0-9e15-a16d24709123';

-- Excel Row 148: zalak bookseller
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'zalak bookseller',
    excel_subscription_date = '2024-07-12',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-30',
    excel_sync_date = '2025-07-06'
WHERE id = '3355c86b-3d45-4723-9217-cbca3154fc4b';

-- Excel Row 149: nikita prajapati
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nikita prajapati',
    excel_subscription_date = '2025-02-27',
    excel_plan = '7 MONTHS Gold',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-30',
    excel_sync_date = '2025-07-06'
WHERE id = '671cdd25-464b-4416-9b5d-37a83f9e5c4d';

-- Excel Row 151: alpana das
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'alpana das',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS gold',
    excel_months = '7 months',
    excel_pending_months = '',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-31',
    excel_sync_date = '2025-07-06'
WHERE id = 'f024ef2c-62f4-4a7d-b675-600af5840673';

-- Excel Row 155: pavanraj
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'pavanraj',
    excel_subscription_date = NULL,
    excel_plan = 'FREE',
    excel_months = 'FREE',
    excel_pending_months = 'FREE',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-03',
    excel_sync_date = '2025-07-06'
WHERE id = 'f7e4bfb0-573e-4f4d-b74e-7ec159f72ad2';

-- Excel Row 157: sanmathi AS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sanmathi AS',
    excel_subscription_date = '2024-10-10',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-03',
    excel_sync_date = '2025-07-06'
WHERE id = '329bff76-8bb1-4dff-8387-db5efd84d454';

-- Excel Row 158: Madhura R
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Madhura R',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'picked on 8th may',
    excel_last_delivered_date = '2025-06-03',
    excel_sync_date = '2025-07-06'
WHERE id = '41f9129c-d654-474e-a908-71e5a5e14a41';

-- Excel Row 159: shrikanth rao
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'shrikanth rao',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS gold',
    excel_months = '7  months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-03',
    excel_sync_date = '2025-07-06'
WHERE id = '3c143eac-c171-4e99-bc5a-e1413960a66a';

-- Excel Row 161: harini sathyam
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'harini sathyam',
    excel_subscription_date = '2024-10-05',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-04',
    excel_sync_date = '2025-07-06'
WHERE id = '3518aa6a-078d-4caa-8e94-d1bea39573c7';

-- Excel Row 162: priyanka jain
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'priyanka jain',
    excel_subscription_date = '2024-12-06',
    excel_plan = '6  MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-04',
    excel_sync_date = '2025-07-06'
WHERE id = '55d6b42a-8f44-4caa-ac36-db69af506c06';

-- Excel Row 163: shrividya shivkumar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'shrividya shivkumar',
    excel_subscription_date = '2024-12-17',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months ',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-04',
    excel_sync_date = '2025-07-06'
WHERE id = 'c9ca18eb-c36a-48af-9427-cb8c1ca0ab88';

-- Excel Row 164: chirasmita bhattacharya
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'chirasmita bhattacharya',
    excel_subscription_date = '2024-12-27',
    excel_plan = '7 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'picked on 29th apr',
    excel_last_delivered_date = '2025-06-04',
    excel_sync_date = '2025-07-06'
WHERE id = 'b4b10cd6-99c5-460d-b3bd-b74df2e174cd';

-- Excel Row 166: apeksha kanva
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'apeksha kanva',
    excel_subscription_date = '2024-12-09',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-05',
    excel_sync_date = '2025-07-06'
WHERE id = '30cc3bdd-8ee6-4f17-9050-ae9371c02035';

-- Excel Row 168: mahila H
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'mahila H',
    excel_subscription_date = '2025-02-07',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-05',
    excel_sync_date = '2025-07-06'
WHERE id = '1ed877ce-9d74-4bc4-b395-26b35bf96150';

-- Excel Row 169: yashaswini N
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'yashaswini N',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-05',
    excel_sync_date = '2025-07-06'
WHERE id = 'bbc9e256-f978-4b62-b5a6-2dd4151bdb5a';

-- Excel Row 170: ritesh kaklasaria
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ritesh kaklasaria',
    excel_subscription_date = '2024-10-31',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-06',
    excel_sync_date = '2025-07-06'
WHERE id = '2cf79a37-f742-400a-9f1c-7eaaff78af75';

-- Excel Row 171: ananth pal
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ananth pal',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-06',
    excel_sync_date = '2025-07-06'
WHERE id = '192d1831-0942-43c0-92cd-4ea4d59d9876';

-- Excel Row 172: poovizhi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'poovizhi',
    excel_subscription_date = '2025-02-01',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-06',
    excel_sync_date = '2025-07-06'
WHERE id = '58ccabcc-fbe9-4a35-97c6-ae534f16070d';

-- Excel Row 173: Abhishek
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Abhishek',
    excel_subscription_date = '2025-02-17',
    excel_plan = '7 MONTHS gold',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-06',
    excel_sync_date = '2025-07-06'
WHERE id = '084a85b3-3d4b-4034-a0cd-a4d5560bec3b';

-- Excel Row 174: komal jha
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'komal jha',
    excel_subscription_date = NULL,
    excel_plan = '7 months gold',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-07',
    excel_sync_date = '2025-07-06'
WHERE id = '6b420ee2-f25e-4bb0-aea0-573e099cd130';

-- Excel Row 177: akshitha A
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'akshitha A',
    excel_subscription_date = '2024-10-14',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-07',
    excel_sync_date = '2025-07-06'
WHERE id = '7f2e72c9-b679-4e1f-8dfa-ff41fd37789a';

-- Excel Row 178: eshwari GC
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'eshwari GC',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '4 month pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-08',
    excel_sync_date = '2025-07-06'
WHERE id = '3fa44e0f-26bf-467b-a05f-3cb8b7b4f9d5';

-- Excel Row 179: prince jude
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'prince jude',
    excel_subscription_date = '2024-12-20',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-09',
    excel_sync_date = '2025-07-06'
WHERE id = 'd1e441a0-2a94-4fc5-86c9-96ddfab902ff';

-- Excel Row 180: prashant T
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'prashant T',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-09',
    excel_sync_date = '2025-07-06'
WHERE id = 'd9ac1884-f081-4ad1-91b3-389a2c433790';

-- Excel Row 181: surbhi chaturvedi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'surbhi chaturvedi',
    excel_subscription_date = NULL,
    excel_plan = '6 months gold',
    excel_months = '7 months',
    excel_pending_months = '4 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-09',
    excel_sync_date = '2025-07-06'
WHERE id = '6a25a02e-5d55-4941-96e6-3c5335f6a9a0';

-- Excel Row 182: revathi V
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'revathi V',
    excel_subscription_date = '2024-12-26',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-09',
    excel_sync_date = '2025-07-06'
WHERE id = '4f201e32-4ce1-4e6b-935c-af941e3516a8';

-- Excel Row 183: soumya mani
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'soumya mani',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '4 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-09',
    excel_sync_date = '2025-07-06'
WHERE id = '8b9cdd15-d72d-49ea-9d57-d831bf5b5f93';

-- Excel Row 185: vishwanth B
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vishwanth B',
    excel_subscription_date = '2024-10-19',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-10',
    excel_sync_date = '2025-07-06'
WHERE id = '4d04ddcd-d43c-4842-ab5f-1e41e4291424';

-- Excel Row 186: seemitha abhiram
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'seemitha abhiram',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '3 month pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-10',
    excel_sync_date = '2025-07-06'
WHERE id = 'b53c8793-5fa4-4749-bf27-9143b0c8b58f';

-- Excel Row 188: lakshmi V
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'lakshmi V',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months gold',
    excel_pending_months = '4 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-10',
    excel_sync_date = '2025-07-06'
WHERE id = 'a1d62ca0-3926-4dec-b2c1-c87eabe972aa';

-- Excel Row 190: Vikrant Sulibhavi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Vikrant Sulibhavi',
    excel_subscription_date = '2025-02-02',
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = 'picked on 16th apr',
    excel_last_delivered_date = '2025-06-11',
    excel_sync_date = '2025-07-06'
WHERE id = '7aafe3db-ecb5-4307-9259-5fb62a8ecbec';

-- Excel Row 194: mukesh maji
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'mukesh maji',
    excel_subscription_date = '2024-08-11',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-12',
    excel_sync_date = '2025-07-06'
WHERE id = 'fb21b62e-6575-4eb1-873d-4a2fafc234f4';

-- Excel Row 196: nanda kumar CR
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nanda kumar CR',
    excel_subscription_date = '2024-09-18',
    excel_plan = '6 MONTHS GOLD',
    excel_months = 'yearly',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-12',
    excel_sync_date = '2025-07-06'
WHERE id = '74a3732e-d670-47e8-9818-a638bdabf459';

-- Excel Row 197: nischal martis
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nischal martis',
    excel_subscription_date = '2025-01-20',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-12',
    excel_sync_date = '2025-07-06'
WHERE id = '557d4fbe-f54e-4831-b445-1860d0457067';

-- Excel Row 198: lenson andrade
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'lenson andrade',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-12',
    excel_sync_date = '2025-07-06'
WHERE id = '7f4c25de-f28c-4539-a221-d3191a79c3d6';

-- Excel Row 199: ramya venkatesh
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ramya venkatesh',
    excel_subscription_date = NULL,
    excel_plan = 'FREE',
    excel_months = 'FREE',
    excel_pending_months = 'FREE',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-13',
    excel_sync_date = '2025-07-06'
WHERE id = '30a89782-adde-47d5-8ce6-711f1b7f5b98';

-- Excel Row 201: gowri PG
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'gowri PG',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-13',
    excel_sync_date = '2025-07-06'
WHERE id = '51aec2ad-796e-4c31-80e0-0f073e5ad8fd';

-- Excel Row 203: tulasi yeditha
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'tulasi yeditha',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-13',
    excel_sync_date = '2025-07-06'
WHERE id = '8e629243-9a88-4791-ae81-a9d2ea6ee84f';

-- Excel Row 204: sangeetha vadhyar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sangeetha vadhyar',
    excel_subscription_date = '2024-12-30',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-13',
    excel_sync_date = '2025-07-06'
WHERE id = 'c7baefa2-a0f5-473c-b57e-a0c93b60d964';

-- Excel Row 206: vipul kanungo
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vipul kanungo',
    excel_subscription_date = '2025-01-05',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-14',
    excel_sync_date = '2025-07-06'
WHERE id = '40bc57b6-6806-48d4-9564-2db3b18c036f';

-- Excel Row 207: Barnali Das
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Barnali Das',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-14',
    excel_sync_date = '2025-07-06'
WHERE id = '62bc8b80-f5f4-4691-a943-153a1a78c15d';

-- Excel Row 208: kavitha P
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kavitha P',
    excel_subscription_date = '2024-12-13',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-14',
    excel_sync_date = '2025-07-06'
WHERE id = '2e7ffb42-38bf-4683-a6f0-2b9d2001d833';

-- Excel Row 209: prathamesh mohapatra
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'prathamesh mohapatra',
    excel_subscription_date = NULL,
    excel_plan = '7 months gold',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-14',
    excel_sync_date = '2025-07-06'
WHERE id = '61859a10-bd02-4eda-ae8b-56045ab81498';

-- Excel Row 210: laxmi suranagi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'laxmi suranagi',
    excel_subscription_date = '2024-12-27',
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-17',
    excel_sync_date = '2025-07-06'
WHERE id = 'b32df410-1cea-4012-84df-7dd45da8c366';

-- Excel Row 211: rashmi jayant
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rashmi jayant',
    excel_subscription_date = '2024-11-13',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-17',
    excel_sync_date = '2025-07-06'
WHERE id = '105b6b02-833c-48b1-a6b4-c6cfc975fe25';

-- Excel Row 212: pradyumna kammardi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'pradyumna kammardi',
    excel_subscription_date = '2024-11-19',
    excel_plan = '6 MONTHS SilVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-18',
    excel_sync_date = '2025-07-06'
WHERE id = '943d6246-fbe3-4165-9069-18fae341385d';

-- Excel Row 213: mala alagar
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'mala alagar',
    excel_subscription_date = '2024-12-11',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months ',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-18',
    excel_sync_date = '2025-07-06'
WHERE id = 'c99a2280-9574-406f-9288-c6bd4c56dc74';

-- Excel Row 217: prashanth jagannatha
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'prashanth jagannatha',
    excel_subscription_date = '2024-12-17',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-19',
    excel_sync_date = '2025-07-06'
WHERE id = 'c76b474c-be10-4282-a5da-2842d10d039d';

-- Excel Row 218: vibhor shrivastava
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'vibhor shrivastava',
    excel_subscription_date = '2024-12-21',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-19',
    excel_sync_date = '2025-07-06'
WHERE id = '8c0743c6-2823-4c40-987b-a5e77c048d8a';

-- Excel Row 219: nandhini kumaravel
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nandhini kumaravel',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '4 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-20',
    excel_sync_date = '2025-07-06'
WHERE id = 'e7cd4ee5-58d1-4152-9b5d-5483e7f7b4b5';

-- Excel Row 220: harshita jain
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'harshita jain',
    excel_subscription_date = '2024-11-13',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-20',
    excel_sync_date = '2025-07-06'
WHERE id = '5d6b98ab-f62c-4c05-854a-266753d23a30';

-- Excel Row 223: sneha sam
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sneha sam',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-21',
    excel_sync_date = '2025-07-06'
WHERE id = '119b1615-ec45-4c31-84af-6b1adafc421f';

-- Excel Row 224: kumar saurabh
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'kumar saurabh',
    excel_subscription_date = '2025-02-01',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-21',
    excel_sync_date = '2025-07-06'
WHERE id = 'fb628b5a-6ee0-4b08-a91f-e7f91ae373eb';

-- Excel Row 225: pallavita panchal
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'pallavita panchal',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER/GOLD',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-21',
    excel_sync_date = '2025-07-06'
WHERE id = '478f89a7-cdf3-4300-9927-7e2518428129';

-- Excel Row 227: gaurav vyas
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'gaurav vyas',
    excel_subscription_date = '2024-08-28',
    excel_plan = '6 MONTHS SILVER',
    excel_months = 'yearly',
    excel_pending_months = '4 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-23',
    excel_sync_date = '2025-07-06'
WHERE id = 'fa7bb65c-32b2-4847-8c13-39b58939a109';

-- Excel Row 228: niket shah
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'niket shah',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-23',
    excel_sync_date = '2025-07-06'
WHERE id = '540367c3-8748-43e9-8e0d-42e54f94fd4e';

-- Excel Row 234: rojalin sahu
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rojalin sahu',
    excel_subscription_date = '2024-11-11',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-25',
    excel_sync_date = '2025-07-06'
WHERE id = '5e963186-345f-4280-aab5-76d3353a322c';

-- Excel Row 235: deevika NM
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'deevika NM',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-25',
    excel_sync_date = '2025-07-06'
WHERE id = '287e0a23-ea4f-4895-9ba8-20f7a300e7e1';

-- Excel Row 238: athulya sudeer
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'athulya sudeer',
    excel_subscription_date = '2025-01-03',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-26',
    excel_sync_date = '2025-07-06'
WHERE id = 'eba03d67-4229-4fc5-bc55-e6a04b36c575';

-- Excel Row 239: jyothi K
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'jyothi K',
    excel_subscription_date = NULL,
    excel_plan = '7 months gold',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-26',
    excel_sync_date = '2025-07-06'
WHERE id = 'ee5fab22-b0a4-41c6-8088-f1a4f15489d7';

-- Excel Row 240: asha latha/asha G
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'asha latha/asha G',
    excel_subscription_date = NULL,
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-26',
    excel_sync_date = '2025-07-06'
WHERE id = '465638cd-6611-4890-a88d-8d1177201d59';

-- Excel Row 242: deepika gundi
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'deepika gundi',
    excel_subscription_date = '2025-01-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months ',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-28',
    excel_sync_date = '2025-07-06'
WHERE id = 'b797ef54-097f-42e0-af87-97235e15adc2';

-- Excel Row 243: nidhi kapoor
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'nidhi kapoor',
    excel_subscription_date = '2024-09-30',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '1 months pending',
    excel_area_pin_code = 'pick up oe blue jeep also in march order',
    excel_last_delivered_date = '2025-06-28',
    excel_sync_date = '2025-07-06'
WHERE id = '94d9bae3-3e8d-41a9-a7b7-1062f491529b';

-- Excel Row 246: dhruva NS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'dhruva NS',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-30',
    excel_sync_date = '2025-07-06'
WHERE id = '71dbb6a3-223c-4a35-b21d-f5c4750ed6ec';

-- Excel Row 247: janaranjini mohan
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'janaranjini mohan',
    excel_subscription_date = '2024-04-16',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-30',
    excel_sync_date = '2025-07-06'
WHERE id = 'e114be0a-8bda-4748-ac68-82e8e4b4c10d';

-- Excel Row 248: ritu gupta
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'ritu gupta',
    excel_subscription_date = '2025-01-29',
    excel_plan = '6 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '2 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-01',
    excel_sync_date = '2025-07-06'
WHERE id = '7de624c7-6e8a-45ea-9a82-57f0ff6f22ad';

-- Excel Row 249: aneesha V
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'aneesha V',
    excel_subscription_date = NULL,
    excel_plan = '7 months silver',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-01',
    excel_sync_date = '2025-07-06'
WHERE id = '07279505-1d3d-4880-b81b-1c4dd58ebd88';

-- Excel Row 250: rutuja burji
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rutuja burji',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-01',
    excel_sync_date = '2025-07-06'
WHERE id = '08d809cf-884f-47a7-a100-f3c594d25686';

-- Excel Row 252: rajesh jeedimalla
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'rajesh jeedimalla',
    excel_subscription_date = '2024-12-02',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-02',
    excel_sync_date = '2025-07-06'
WHERE id = '4722123e-c950-4b6c-8b33-396ef45f477f';

-- Excel Row 253: sindhu MS
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sindhu MS',
    excel_subscription_date = NULL,
    excel_plan = '7 months gold',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-02',
    excel_sync_date = '2025-07-06'
WHERE id = '5c1cae18-f955-42d5-8bfe-e49f05b805bb';

-- Excel Row 254: hemalatha gowtham
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'hemalatha gowtham',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-03',
    excel_sync_date = '2025-07-06'
WHERE id = 'b3026ad0-60a4-485c-ba79-895906029024';

-- Excel Row 255: Shwetha0605
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Shwetha0605',
    excel_subscription_date = '2025-02-21',
    excel_plan = '6 MONTHS SILVER',
    excel_months = '6 months',
    excel_pending_months = 'completed',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-03',
    excel_sync_date = '2025-07-06'
WHERE id = 'b34e9b25-875d-4901-bf09-2e8478c350f1';

-- Excel Row 257: neethu praveen
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'neethu praveen',
    excel_subscription_date = NULL,
    excel_plan = '7 MONTHS GOLD',
    excel_months = '7 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-04',
    excel_sync_date = '2025-07-06'
WHERE id = 'd4173204-55b1-4733-827b-a779d28d2b01';

-- Excel Row 261: Anushree math
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'Anushree math',
    excel_subscription_date = '2025-03-05',
    excel_plan = '7 MONTHS SILVER',
    excel_months = '7 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-09',
    excel_sync_date = '2025-07-06'
WHERE id = '64bfc887-5161-4a88-b6b4-82d4c1916582';

-- Excel Row 272: sandhya
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sandhya',
    excel_subscription_date = '2025-03-20',
    excel_plan = '7 months silver',
    excel_months = '7  months',
    excel_pending_months = '4  months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-11',
    excel_sync_date = '2025-07-06'
WHERE id = '95a03b4a-c426-4abe-9a56-614aa24cb828';

-- Excel Row 299: punith kumar n
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'punith kumar n',
    excel_subscription_date = '2025-05-13',
    excel_plan = '7 months gold',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-05-16',
    excel_sync_date = '2025-07-06'
WHERE id = '4d4b30e0-f360-433d-b789-fb1a1ad81e4c';

-- Excel Row 305: sindhura
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'sindhura',
    excel_subscription_date = '2025-05-23',
    excel_plan = '6 months silver',
    excel_months = '6 months',
    excel_pending_months = '3 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-30',
    excel_sync_date = '2025-07-06'
WHERE id = '3a3d3472-a252-4325-940e-8aba08f735b5';

-- Excel Row 313: trodo
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'trodo',
    excel_subscription_date = '2025-06-04',
    excel_plan = '6 months silver',
    excel_months = '6 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-25',
    excel_sync_date = '2025-07-06'
WHERE id = '02c4b907-a0db-4eef-8b43-5f5d7ee90797';

-- Excel Row 324: chaithra
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'chaithra',
    excel_subscription_date = '2025-06-20',
    excel_plan = '7 months silver',
    excel_months = '7 months',
    excel_pending_months = '6 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-06-24',
    excel_sync_date = '2025-07-06'
WHERE id = 'a77fa0d9-50c9-4a8a-b353-a648a1612d82';

-- Excel Row 328: taanvi bharat
-- Current DB name: null
UPDATE custom_users 
SET full_name = 'taanvi bharat',
    excel_subscription_date = '2025-07-01',
    excel_plan = '6 months silver',
    excel_months = '6 months',
    excel_pending_months = '5 months pending',
    excel_area_pin_code = '',
    excel_last_delivered_date = '2025-07-03',
    excel_sync_date = '2025-07-06'
WHERE id = 'ba48cadb-8fea-4bdf-9a78-bf17649f1d17';

COMMIT;

-- Verification queries:
-- Check updated records:
SELECT 
    id, 
    full_name, 
    phone_number, 
    excel_plan, 
    excel_subscription_date, 
    excel_sync_date 
FROM custom_users 
WHERE excel_sync_date = CURRENT_DATE;

-- Summary:
-- Total matched customers: 201
-- User profile updates: 201
-- Customers updated with Excel data: 201
