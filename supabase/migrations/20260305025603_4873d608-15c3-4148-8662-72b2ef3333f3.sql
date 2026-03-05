
-- Replace the view with security_invoker=on and use a security definer function instead
DROP VIEW IF EXISTS public.drivers_public;

-- Create a security definer function that returns only id and name
CREATE OR REPLACE FUNCTION public.get_drivers_summary()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT d.id, d.name FROM public.drivers d ORDER BY d.name;
$$;
