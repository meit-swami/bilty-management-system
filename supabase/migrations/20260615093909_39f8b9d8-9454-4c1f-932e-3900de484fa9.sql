
DROP POLICY IF EXISTS "Allow all access" ON public.app_users;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_users FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
CREATE POLICY "Authenticated can view app users" ON public.app_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage app users" ON public.app_users FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow all access" ON public.parties;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parties FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
CREATE POLICY "Authenticated can manage parties" ON public.parties FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.vehicles;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
CREATE POLICY "Authenticated can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
