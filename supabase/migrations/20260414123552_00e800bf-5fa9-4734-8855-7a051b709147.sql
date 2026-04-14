
-- Update can_marcador_create_trip to allow fixed_trip flow (no vehicle required)
CREATE OR REPLACE FUNCTION public.can_marcador_create_trip(_user_id uuid, _vehicle_id uuid, _status trip_status, _driver_id uuid, _transport_request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT (
    _driver_id IS NULL
    AND _status::text = 'Aguardando Motorista'
    AND (
      -- Original flow: marcador picks a vehicle they have access to
      (
        _transport_request_id IS NULL
        AND _vehicle_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.vehicles v
          WHERE v.id = _vehicle_id
            AND public.has_marcador_vehicle_access(_user_id, v.type)
        )
      )
      -- New flow: marcador creates trip from fixed_trip template (no vehicle needed)
      OR (
        _vehicle_id IS NULL
        AND _transport_request_id IS NULL
      )
    )
  );
$$;

-- Update can_marcador_read_trip to also allow reading trips with fixed_trip_id
CREATE OR REPLACE FUNCTION public.can_marcador_read_trip(_user_id uuid, _trip_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    LEFT JOIN public.transport_requests tr ON tr.id = t.transport_request_id
    WHERE t.id = _trip_id
      AND (
        -- Has vehicle access
        (t.vehicle_id IS NOT NULL AND public.can_marcador_read_vehicle(_user_id, t.vehicle_id))
        -- Created via transport request by this user
        OR tr.created_by = _user_id
        -- Fixed trip (any marcador can see)
        OR t.fixed_trip_id IS NOT NULL
      )
  );
$$;

-- Update can_marcador_modify_trip to allow modifying fixed trips without vehicle
CREATE OR REPLACE FUNCTION public.can_marcador_modify_trip(_user_id uuid, _trip_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = _trip_id
      AND t.driver_id IS NULL
      AND t.status::text = 'Aguardando Motorista'
      AND (
        -- Original: vehicle-based access
        (t.vehicle_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.vehicles v
          WHERE v.id = t.vehicle_id
            AND public.has_marcador_vehicle_access(_user_id, v.type)
        ))
        -- New: fixed trip without vehicle assigned yet
        OR (t.fixed_trip_id IS NOT NULL AND t.vehicle_id IS NULL)
      )
  );
$$;
