
-- Replace overly permissive policies on existing tables with auth-required policies

-- patients
DROP POLICY IF EXISTS "Allow all access to patients" ON public.patients;
CREATE POLICY "Authenticated users can read patients"
  ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor and admin can insert patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor and admin can update patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Admin can delete patients"
  ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- vehicles
DROP POLICY IF EXISTS "Allow all access to vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can read vehicles"
  ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor and admin can insert vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor and admin can update vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Admin can delete vehicles"
  ON public.vehicles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- drivers
DROP POLICY IF EXISTS "Allow all access to drivers" ON public.drivers;
CREATE POLICY "Authenticated users can read drivers"
  ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor and admin can insert drivers"
  ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor and admin can update drivers"
  ON public.drivers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Admin can delete drivers"
  ON public.drivers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- trips
DROP POLICY IF EXISTS "Allow all access to trips" ON public.trips;
CREATE POLICY "Authenticated users can read trips"
  ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor and admin can insert trips"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor and admin can update trips"
  ON public.trips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Admin can delete trips"
  ON public.trips FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- trip_passengers
DROP POLICY IF EXISTS "Allow all access to trip_passengers" ON public.trip_passengers;
CREATE POLICY "Authenticated users can read trip_passengers"
  ON public.trip_passengers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor and admin can insert trip_passengers"
  ON public.trip_passengers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor and admin can update trip_passengers"
  ON public.trip_passengers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Admin can delete trip_passengers"
  ON public.trip_passengers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
