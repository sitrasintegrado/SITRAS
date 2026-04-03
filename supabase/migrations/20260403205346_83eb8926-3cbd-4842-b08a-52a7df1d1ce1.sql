-- Allow Marcador to insert patients
CREATE POLICY "Marcador can insert patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (has_role_name(auth.uid(), 'marcador'));

-- Allow Marcador to update patients
CREATE POLICY "Marcador can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (has_role_name(auth.uid(), 'marcador'))
WITH CHECK (has_role_name(auth.uid(), 'marcador'));