DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'transport_request_status'
  ) THEN
    CREATE TYPE public.transport_request_status AS ENUM (
      'Pendente de Aprovação da Frota',
      'Aprovada',
      'Cancelada'
    );
  END IF;
END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marcador';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'Ambulância';
ALTER TYPE public.trip_status ADD VALUE IF NOT EXISTS 'Pendente de Frota';
ALTER TYPE public.trip_status ADD VALUE IF NOT EXISTS 'Aguardando Motorista';
ALTER TYPE public.trip_status ADD VALUE IF NOT EXISTS 'Em andamento';
ALTER TYPE public.trip_status ADD VALUE IF NOT EXISTS 'Finalizada';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role_name(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  );
$$;

CREATE TABLE public.transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  consult_time text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  consult_location text NOT NULL DEFAULT '',
  has_companion boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  status public.transport_request_status NOT NULL DEFAULT 'Pendente de Aprovação da Frota',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  sender_user_id uuid,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  read_at timestamp with time zone,
  related_request_id uuid REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  related_trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.marcador_vehicle_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_type public.vehicle_type NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_type)
);

ALTER TABLE public.marcador_vehicle_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trip_passengers
ADD COLUMN IF NOT EXISTS is_pcd boolean NOT NULL DEFAULT false;

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS transport_request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trips_transport_request_id_fkey'
  ) THEN
    ALTER TABLE public.trips
    ADD CONSTRAINT trips_transport_request_id_fkey
    FOREIGN KEY (transport_request_id)
    REFERENCES public.transport_requests(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_transport_request_id_unique
  ON public.trips (transport_request_id)
  WHERE transport_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transport_requests_created_by_status
  ON public.transport_requests (created_by, status, date);

CREATE INDEX IF NOT EXISTS idx_transport_requests_patient_id
  ON public.transport_requests (patient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at
  ON public.notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_related_request_id
  ON public.notifications (related_request_id);

CREATE INDEX IF NOT EXISTS idx_marcador_vehicle_permissions_user_id
  ON public.marcador_vehicle_permissions (user_id);

CREATE OR REPLACE FUNCTION public.has_marcador_vehicle_access(_user_id uuid, _vehicle_type public.vehicle_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _vehicle_type::text = 'Ônibus'
    OR EXISTS (
      SELECT 1
      FROM public.marcador_vehicle_permissions
      WHERE user_id = _user_id
        AND vehicle_type = _vehicle_type
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_marcador_read_vehicle(_user_id uuid, _vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vehicles v
    WHERE v.id = _vehicle_id
      AND (
        public.has_marcador_vehicle_access(_user_id, v.type)
        OR EXISTS (
          SELECT 1
          FROM public.trips t
          JOIN public.transport_requests tr ON tr.id = t.transport_request_id
          WHERE t.vehicle_id = v.id
            AND tr.created_by = _user_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_marcador_read_trip(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    LEFT JOIN public.transport_requests tr ON tr.id = t.transport_request_id
    WHERE t.id = _trip_id
      AND (
        (t.vehicle_id IS NOT NULL AND public.can_marcador_read_vehicle(_user_id, t.vehicle_id))
        OR tr.created_by = _user_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_marcador_modify_trip(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.vehicles v ON v.id = t.vehicle_id
    WHERE t.id = _trip_id
      AND t.driver_id IS NULL
      AND t.status::text = 'Aguardando Motorista'
      AND public.has_marcador_vehicle_access(_user_id, v.type)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_marcador_create_trip(
  _user_id uuid,
  _vehicle_id uuid,
  _status public.trip_status,
  _driver_id uuid,
  _transport_request_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _transport_request_id IS NULL
    AND _vehicle_id IS NOT NULL
    AND _driver_id IS NULL
    AND _status::text = 'Aguardando Motorista'
    AND EXISTS (
      SELECT 1
      FROM public.vehicles v
      WHERE v.id = _vehicle_id
        AND public.has_marcador_vehicle_access(_user_id, v.type)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.notify_fleet_on_transport_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_user_id,
    sender_user_id,
    title,
    message,
    type,
    related_request_id
  )
  SELECT DISTINCT
    ur.user_id,
    NEW.created_by,
    'Nova solicitação de transporte',
    'Nova solicitação de transporte aguardando definição.',
    'transport_request_created',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role::text IN ('admin', 'gestor');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_requester_on_transport_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'Aprovada' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      sender_user_id,
      title,
      message,
      type,
      related_request_id
    )
    VALUES (
      NEW.created_by,
      auth.uid(),
      'Viagem confirmada pela frota',
      'A viagem solicitada foi confirmada pela frota.',
      'transport_request_approved',
      NEW.id
    );
  ELSIF NEW.status::text = 'Cancelada' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      sender_user_id,
      title,
      message,
      type,
      related_request_id
    )
    VALUES (
      NEW.created_by,
      auth.uid(),
      'Solicitação cancelada',
      'A solicitação de transporte foi cancelada.',
      'transport_request_cancelled',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_transport_request_as_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transport_request_id IS NOT NULL THEN
    UPDATE public.transport_requests
    SET status = 'Aprovada',
        updated_at = now()
    WHERE id = NEW.transport_request_id
      AND status::text = 'Pendente de Aprovação da Frota';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_transport_requests_updated_at ON public.transport_requests;
CREATE TRIGGER update_transport_requests_updated_at
BEFORE UPDATE ON public.transport_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS notify_fleet_on_transport_request_created ON public.transport_requests;
CREATE TRIGGER notify_fleet_on_transport_request_created
AFTER INSERT ON public.transport_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_fleet_on_transport_request_created();

DROP TRIGGER IF EXISTS notify_requester_on_transport_request_status_change ON public.transport_requests;
CREATE TRIGGER notify_requester_on_transport_request_status_change
AFTER UPDATE OF status ON public.transport_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_requester_on_transport_request_status_change();

DROP TRIGGER IF EXISTS sync_transport_request_from_trip ON public.trips;
CREATE TRIGGER sync_transport_request_from_trip
AFTER INSERT OR UPDATE OF transport_request_id ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.mark_transport_request_as_approved();

CREATE POLICY "Admin and gestor can manage transport requests"
ON public.transport_requests
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'gestor'::public.app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'gestor'::public.app_role)
);

CREATE POLICY "Marcador can read own transport requests"
ON public.transport_requests
FOR SELECT
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND created_by = auth.uid()
);

CREATE POLICY "Marcador can create own transport requests"
ON public.transport_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_name(auth.uid(), 'marcador')
  AND created_by = auth.uid()
);

CREATE POLICY "Marcador can update own pending transport requests"
ON public.transport_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND created_by = auth.uid()
  AND status::text = 'Pendente de Aprovação da Frota'
)
WITH CHECK (
  public.has_role_name(auth.uid(), 'marcador')
  AND created_by = auth.uid()
  AND status::text = 'Pendente de Aprovação da Frota'
);

CREATE POLICY "Recipients can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY "Admin and gestor can read notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'gestor'::public.app_role)
);

CREATE POLICY "Recipients can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

CREATE POLICY "Admin and gestor can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (sender_user_id = auth.uid() OR sender_user_id IS NULL)
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'gestor'::public.app_role)
  )
);

CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage marcador vehicle permissions"
ON public.marcador_vehicle_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Gestor and users can read marcador vehicle permissions"
ON public.marcador_vehicle_permissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::public.app_role)
  OR user_id = auth.uid()
);

CREATE POLICY "Marcador can read patients"
ON public.patients
FOR SELECT
TO authenticated
USING (public.has_role_name(auth.uid(), 'marcador'));

CREATE POLICY "Marcador can read authorized vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_read_vehicle(auth.uid(), id)
);

CREATE POLICY "Marcador can read authorized trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_read_trip(auth.uid(), id)
);

CREATE POLICY "Marcador can create awaiting driver trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_create_trip(
    auth.uid(),
    vehicle_id,
    status,
    driver_id,
    transport_request_id
  )
);

CREATE POLICY "Marcador can read authorized trip passengers"
ON public.trip_passengers
FOR SELECT
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_read_trip(auth.uid(), trip_id)
);

CREATE POLICY "Marcador can add passengers to awaiting driver trips"
ON public.trip_passengers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_modify_trip(auth.uid(), trip_id)
);

CREATE POLICY "Marcador can update passengers on awaiting driver trips"
ON public.trip_passengers
FOR UPDATE
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_modify_trip(auth.uid(), trip_id)
)
WITH CHECK (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_modify_trip(auth.uid(), trip_id)
);

CREATE POLICY "Marcador can remove passengers from awaiting driver trips"
ON public.trip_passengers
FOR DELETE
TO authenticated
USING (
  public.has_role_name(auth.uid(), 'marcador')
  AND public.can_marcador_modify_trip(auth.uid(), trip_id)
);