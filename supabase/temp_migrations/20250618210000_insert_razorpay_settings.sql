-- Insert or update Razorpay settings
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES 
    ('razorpay_key_id', 'rzp_test_your_key_id'),
    ('razorpay_key_secret', 'your_key_secret')
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = EXCLUDED.setting_value; 