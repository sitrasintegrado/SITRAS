
-- Remove visualizador from the existing drivers SELECT policy
DROP POLICY IF EXISTS "Authorized users can read drivers" ON public.drivers;

CREATE POLICY "Admin and gestor can read drivers"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

-- Create a public view with only non-sensitive columns (no security_invoker = bypasses RLS)
CREATE OR REPLACE VIEW public.drivers_public AS
  SELECT id, name
  FROM public.drivers;

-- Grant access to the view
GRANT SELECT ON public.drivers_public TO authenticated;
GRANT SELECT ON public.drivers_public TO anon;
