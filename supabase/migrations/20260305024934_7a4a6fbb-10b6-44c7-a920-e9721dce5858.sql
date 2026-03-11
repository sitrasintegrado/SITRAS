
CREATE OR REPLACE FUNCTION public.get_email_by_cpf(_cpf text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.email
  FROM public.drivers d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE d.cpf = _cpf
  LIMIT 1;
$$;
