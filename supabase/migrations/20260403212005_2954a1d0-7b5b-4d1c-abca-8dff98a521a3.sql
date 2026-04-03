
CREATE POLICY "Marcador can mark trips as concluded"
ON public.trips
FOR UPDATE
TO authenticated
USING (
  has_role_name(auth.uid(), 'marcador')
  AND can_marcador_read_trip(auth.uid(), id)
)
WITH CHECK (
  has_role_name(auth.uid(), 'marcador')
  AND status = 'Concluída'
);
