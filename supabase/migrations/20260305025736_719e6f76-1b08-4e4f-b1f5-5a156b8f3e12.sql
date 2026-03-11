
DROP POLICY IF EXISTS "Enable read access for all users" ON public.empresas;

CREATE POLICY "Authenticated users can read empresas"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (true);
