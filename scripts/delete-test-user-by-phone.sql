-- Delete test user by phone: 7760118505
-- Run this in Supabase Dashboard → SQL Editor (as one shot). Replace the phone if needed.

DO $$
DECLARE
  v_user_id uuid;
  v_phone text := '7760118505';
  v_phones text[] := ARRAY[
    v_phone,
    '+91' || v_phone,
    '91' || v_phone
  ];
BEGIN
  -- Find user by any of the common phone formats
  SELECT id INTO v_user_id
  FROM public.custom_users
  WHERE phone = ANY(v_phones)
     OR phone = TRIM(v_phone)
     OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE '%' || v_phone
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user found with phone 7760118505 (or +91/91 variants). Nothing to delete.';
    RETURN;
  END IF;

  -- Delete sessions first (FK to custom_users)
  DELETE FROM public.user_sessions WHERE user_id = v_user_id;
  RAISE NOTICE 'Deleted user_sessions for user %', v_user_id;

  -- Delete OTP records for this phone (so you can request a fresh OTP when testing)
  -- Column is phone_number in otp_verifications (not phone)
  DELETE FROM public.otp_verifications
  WHERE phone_number = ANY(v_phones)
     OR phone_number LIKE '%7760118505%';
  RAISE NOTICE 'Deleted otp_verifications for phone 7760118505';

  -- Delete the user (may CASCADE to other tables depending on your schema)
  DELETE FROM public.custom_users WHERE id = v_user_id;
  RAISE NOTICE 'Deleted custom_users row for user %', v_user_id;
END $$;
