
-- Create a new table specifically for admin panel user management
CREATE TABLE public.admin_users_view (
  id uuid PRIMARY KEY,
  email text,
  phone text NOT NULL,
  first_name text,
  last_name text,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  city text,
  state text,
  address_line1 text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Populate the new table with existing data from custom_users
INSERT INTO public.admin_users_view (
  id, email, phone, first_name, last_name, role, created_at, 
  is_active, last_login, city, state, address_line1, updated_at
)
SELECT 
  id, email, phone, first_name, last_name, role, created_at,
  is_active, last_login, city, state, address_line1, updated_at
FROM public.custom_users;

-- Create a function to sync changes from custom_users to admin_users_view
CREATE OR REPLACE FUNCTION public.sync_admin_users_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_users_view (
      id, email, phone, first_name, last_name, role, created_at,
      is_active, last_login, city, state, address_line1, updated_at
    )
    VALUES (
      NEW.id, NEW.email, NEW.phone, NEW.first_name, NEW.last_name, NEW.role, NEW.created_at,
      NEW.is_active, NEW.last_login, NEW.city, NEW.state, NEW.address_line1, NEW.updated_at
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.admin_users_view SET
      email = NEW.email,
      phone = NEW.phone,
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      role = NEW.role,
      is_active = NEW.is_active,
      last_login = NEW.last_login,
      city = NEW.city,
      state = NEW.state,
      address_line1 = NEW.address_line1,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.admin_users_view WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers to automatically sync changes
CREATE TRIGGER sync_admin_users_insert
  AFTER INSERT ON public.custom_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();

CREATE TRIGGER sync_admin_users_update
  AFTER UPDATE ON public.custom_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();

CREATE TRIGGER sync_admin_users_delete
  AFTER DELETE ON public.custom_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();

-- Add indexes for better performance
CREATE INDEX idx_admin_users_view_role ON public.admin_users_view(role);
CREATE INDEX idx_admin_users_view_created_at ON public.admin_users_view(created_at);
CREATE INDEX idx_admin_users_view_is_active ON public.admin_users_view(is_active);
