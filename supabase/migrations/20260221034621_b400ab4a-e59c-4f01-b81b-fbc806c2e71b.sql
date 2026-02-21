
-- Client subscriptions table for tracking project sales
CREATE TABLE public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,
  domain_url TEXT,
  plan_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
  subscription_price NUMERIC NOT NULL DEFAULT 0,
  hosting_cost NUMERIC NOT NULL DEFAULT 0,
  amc_cost NUMERIC NOT NULL DEFAULT 0,
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  total_monthly_cost NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN plan_type = 'yearly' THEN (subscription_price + hosting_cost + amc_cost) / 12
      WHEN plan_type = 'quarterly' THEN (subscription_price + hosting_cost + amc_cost) / 3
      ELSE subscription_price + hosting_cost + amc_cost
    END
  ) STORED,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, suspended, trial
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access
CREATE POLICY "Super admins can manage client subscriptions"
ON public.client_subscriptions FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Client payment tracking
CREATE TABLE public.client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage client payments"
ON public.client_payments FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));
