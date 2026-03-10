-- Add 'ride_on' to rental_orders order_type to support ride-on toy orders in admin panel
-- Ride-on orders paid via website were not appearing because they need distinct order_type

ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_order_type_check;
ALTER TABLE public.rental_orders ADD CONSTRAINT rental_orders_order_type_check 
  CHECK (order_type IN ('subscription', 'one_time', 'trial', 'ride_on'));
