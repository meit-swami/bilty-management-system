-- Super admin email: simplecapital -> setugo
UPDATE public.profiles
SET email = 'admin@setugo.in'
WHERE email = 'admin@simplecapital.co.in';

UPDATE public.app_users
SET email = 'admin@setugo.in'
WHERE email = 'admin@simplecapital.co.in';

UPDATE auth.users
SET
  email = 'admin@setugo.in',
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"email":"admin@setugo.in"}'::jsonb
WHERE email = 'admin@simplecapital.co.in';

-- Replace legacy Simple Capital branding in settings
UPDATE public.company_settings
SET company_name = 'SetuGo'
WHERE company_name ILIKE '%Simple Capital%';
