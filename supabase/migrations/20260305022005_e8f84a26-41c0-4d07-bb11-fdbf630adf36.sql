
-- Add 'motorista' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'motorista';

-- Add user_id to drivers table to link driver to auth user
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;
