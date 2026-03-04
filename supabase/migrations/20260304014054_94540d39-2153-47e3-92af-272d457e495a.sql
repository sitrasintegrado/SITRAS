-- Drop overly permissive SELECT policies on all tables with sensitive data
DROP POLICY IF EXISTS "Authenticated users can read patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can read drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can read trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can read trip_passengers" ON public.trip_passengers;
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.vehicles;

-- Recreate with role-based access (admin, gestor, visualizador only)
CREATE POLICY "Authorized users can read patients"
ON public.patients FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'visualizador'::app_role)
);

CREATE POLICY "Authorized users can read drivers"
ON public.drivers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'visualizador'::app_role)
);

CREATE POLICY "Authorized users can read trips"
ON public.trips FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'visualizador'::app_role)
);

CREATE POLICY "Authorized users can read trip_passengers"
ON public.trip_passengers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'visualizador'::app_role)
);

CREATE POLICY "Authorized users can read vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'visualizador'::app_role)
);