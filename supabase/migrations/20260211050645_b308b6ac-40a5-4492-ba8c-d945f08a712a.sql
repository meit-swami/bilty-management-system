
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'accountant', 'viewer');

-- Create roles table for role metadata
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create user_groups table
CREATE TABLE public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, group_id)
);

-- Create module_permissions table for CRUD per role
CREATE TABLE public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  module TEXT NOT NULL, -- e.g. 'bilties', 'invoices', 'expenses', 'parties', 'master_data', 'settings', 'users', 'reports', 'backup'
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(role, module)
);

-- Enable RLS on all new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Security definer function to get user permissions for a module
CREATE OR REPLACE FUNCTION public.get_module_permission(_user_id UUID, _module TEXT)
RETURNS TABLE(can_create BOOLEAN, can_read BOOLEAN, can_update BOOLEAN, can_delete BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.can_create, mp.can_read, mp.can_update, mp.can_delete
  FROM public.module_permissions mp
  JOIN public.user_roles ur ON ur.role = mp.role
  WHERE ur.user_id = _user_id AND mp.module = _module
  LIMIT 1
$$;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- RLS policies for user_roles
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for groups
CREATE POLICY "Authenticated can view groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage groups" ON public.groups FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for user_groups
CREATE POLICY "Authenticated can view user_groups" ON public.user_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage user_groups" ON public.user_groups FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for roles table
CREATE POLICY "Authenticated can view roles table" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles table" ON public.roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for module_permissions
CREATE POLICY "Authenticated can view permissions" ON public.module_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permissions" ON public.module_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed default roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Super Admin', 'Full system access', true),
  ('Admin', 'Administrative access', true),
  ('Manager', 'Managerial access', false),
  ('Accountant', 'Finance and accounting access', false),
  ('Viewer', 'Read-only access', false);

-- Seed default permissions for super_admin (full access to all modules)
INSERT INTO public.module_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('super_admin', 'dashboard', true, true, true, true),
  ('super_admin', 'master_data', true, true, true, true),
  ('super_admin', 'bilties', true, true, true, true),
  ('super_admin', 'parties', true, true, true, true),
  ('super_admin', 'invoices', true, true, true, true),
  ('super_admin', 'reports', true, true, true, true),
  ('super_admin', 'expenses', true, true, true, true),
  ('super_admin', 'settings', true, true, true, true),
  ('super_admin', 'backup', true, true, true, true),
  ('super_admin', 'users', true, true, true, true);

-- Admin permissions (same as super_admin except can't manage users)
INSERT INTO public.module_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('admin', 'dashboard', true, true, true, true),
  ('admin', 'master_data', true, true, true, true),
  ('admin', 'bilties', true, true, true, true),
  ('admin', 'parties', true, true, true, true),
  ('admin', 'invoices', true, true, true, true),
  ('admin', 'reports', true, true, true, true),
  ('admin', 'expenses', true, true, true, true),
  ('admin', 'settings', true, true, true, false),
  ('admin', 'backup', true, true, true, true),
  ('admin', 'users', false, true, false, false);

-- Accountant permissions
INSERT INTO public.module_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('accountant', 'dashboard', false, true, false, false),
  ('accountant', 'master_data', false, true, false, false),
  ('accountant', 'bilties', true, true, true, false),
  ('accountant', 'parties', true, true, true, false),
  ('accountant', 'invoices', true, true, true, false),
  ('accountant', 'reports', false, true, false, false),
  ('accountant', 'expenses', true, true, true, false),
  ('accountant', 'settings', false, true, false, false),
  ('accountant', 'backup', false, false, false, false),
  ('accountant', 'users', false, false, false, false);

-- Manager permissions
INSERT INTO public.module_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('manager', 'dashboard', false, true, false, false),
  ('manager', 'master_data', true, true, true, true),
  ('manager', 'bilties', true, true, true, true),
  ('manager', 'parties', true, true, true, false),
  ('manager', 'invoices', true, true, true, false),
  ('manager', 'reports', false, true, false, false),
  ('manager', 'expenses', true, true, true, true),
  ('manager', 'settings', false, true, false, false),
  ('manager', 'backup', false, false, false, false),
  ('manager', 'users', false, false, false, false);

-- Viewer permissions (read-only everywhere)
INSERT INTO public.module_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('viewer', 'dashboard', false, true, false, false),
  ('viewer', 'master_data', false, true, false, false),
  ('viewer', 'bilties', false, true, false, false),
  ('viewer', 'parties', false, true, false, false),
  ('viewer', 'invoices', false, true, false, false),
  ('viewer', 'reports', false, true, false, false),
  ('viewer', 'expenses', false, true, false, false),
  ('viewer', 'settings', false, true, false, false),
  ('viewer', 'backup', false, false, false, false),
  ('viewer', 'users', false, false, false, false);

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add logo fields to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_light_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_dark_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;
