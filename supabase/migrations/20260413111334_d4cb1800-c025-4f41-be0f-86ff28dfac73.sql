
-- 1. Create fixed_trips table
CREATE TABLE public.fixed_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  departure_time TEXT NOT NULL DEFAULT '',
  default_destination TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_trips ENABLE ROW LEVEL SECURITY;

-- RLS policies for fixed_trips
CREATE POLICY "Admin and gestor can manage fixed_trips"
  ON public.fixed_trips FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Marcador can read active fixed_trips"
  ON public.fixed_trips FOR SELECT
  TO authenticated
  USING (has_role_name(auth.uid(), 'marcador') AND is_active = true);

CREATE POLICY "Visualizador can read fixed_trips"
  ON public.fixed_trips FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'visualizador'::app_role));

CREATE POLICY "Motorista can read fixed_trips"
  ON public.fixed_trips FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'motorista'::app_role));

-- 2. Add columns to trip_passengers
ALTER TABLE public.trip_passengers
  ADD COLUMN boarding_location TEXT NOT NULL DEFAULT '',
  ADD COLUMN consult_time TEXT NOT NULL DEFAULT '',
  ADD COLUMN consult_location TEXT NOT NULL DEFAULT '';

-- 3. Add fixed_trip_id to trips
ALTER TABLE public.trips
  ADD COLUMN fixed_trip_id UUID REFERENCES public.fixed_trips(id);

-- 4. Seed initial fixed trips
INSERT INTO public.fixed_trips (label, departure_time, default_destination) VALUES
  ('Ônibus 4h30', '04:30', ''),
  ('Ônibus 9h30', '09:30', ''),
  ('Hemodiálise', '', ''),
  ('Tapiraí', '', 'Tapiraí');
