
-- Create maintenance type enum
CREATE TYPE public.maintenance_type AS ENUM ('preventiva', 'corretiva', 'emergencial');

-- Create maintenances table
CREATE TABLE public.maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date date NOT NULL,
  type maintenance_type NOT NULL DEFAULT 'preventiva',
  part_replaced text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  cost numeric(10,2) DEFAULT 0,
  workshop text NOT NULL DEFAULT '',
  next_review_date date DEFAULT NULL,
  next_review_km integer DEFAULT NULL,
  vehicle_km integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authorized users can read maintenances"
  ON public.maintenances FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'visualizador'));

CREATE POLICY "Gestor and admin can insert maintenances"
  ON public.maintenances FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestor and admin can update maintenances"
  ON public.maintenances FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admin can delete maintenances"
  ON public.maintenances FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Drop the maintenance columns from vehicles (no longer needed there)
ALTER TABLE public.vehicles
  DROP COLUMN IF EXISTS last_maintenance,
  DROP COLUMN IF EXISTS next_review,
  DROP COLUMN IF EXISTS oil_change_km;
