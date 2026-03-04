
ALTER TABLE public.vehicles
  ADD COLUMN last_maintenance date DEFAULT NULL,
  ADD COLUMN next_review date DEFAULT NULL,
  ADD COLUMN oil_change_km integer DEFAULT NULL;
