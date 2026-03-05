
-- Allow motorista role users to read drivers (already covered by existing SELECT policy for all roles)
-- Add policy for motorista to read trips assigned to them
CREATE POLICY "Motorista can read own trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'motorista'::app_role)
  AND driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Allow motorista to read trip_passengers for their trips
CREATE POLICY "Motorista can read own trip passengers"
ON public.trip_passengers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'motorista'::app_role)
  AND trip_id IN (
    SELECT t.id FROM public.trips t
    JOIN public.drivers d ON d.id = t.driver_id
    WHERE d.user_id = auth.uid()
  )
);

-- Allow motorista to read patients (for passenger names)
CREATE POLICY "Motorista can read patients"
ON public.patients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'motorista'::app_role));

-- Allow motorista to read vehicles (for vehicle info)
CREATE POLICY "Motorista can read vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'motorista'::app_role));

-- Allow motorista to read their own driver record
CREATE POLICY "Motorista can read own driver record"
ON public.drivers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'motorista'::app_role) AND user_id = auth.uid());
