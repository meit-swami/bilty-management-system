
-- Registration requests table for pending user approvals
CREATE TABLE public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  requested_role TEXT NOT NULL DEFAULT 'viewer',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  auth_user_id UUID, -- set after approval and user creation
  client_subscription_id UUID REFERENCES public.client_subscriptions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public registration)
CREATE POLICY "Anyone can submit registration"
ON public.registration_requests FOR INSERT
WITH CHECK (true);

-- Only super_admin can view/update/delete
CREATE POLICY "Super admins can view registrations"
ON public.registration_requests FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update registrations"
ON public.registration_requests FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete registrations"
ON public.registration_requests FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add client_subscription_id to profiles for grouping
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_subscription_id UUID REFERENCES public.client_subscriptions(id);
