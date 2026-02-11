
-- ========== PROPOSALS TABLE ==========
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number TEXT NOT NULL UNIQUE,
  proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, accepted, declined, expired, revised, converted
  party_id UUID REFERENCES public.parties(id),
  party_name TEXT,
  party_gstin TEXT,
  subject TEXT,
  notes TEXT,
  subtotal NUMERIC DEFAULT 0,
  cgst_rate NUMERIC DEFAULT 0,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_rate NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_rate NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'none', -- none, percentage, fixed
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  converted_to_invoice_id UUID,
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[],
  allow_comments BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE,
  public_password TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposal items
CREATE TABLE public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  long_description TEXT,
  quantity NUMERIC DEFAULT 1,
  rate NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== PAYMENT RECORDS TABLE ==========
CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_id UUID REFERENCES public.invoices(id),
  party_id UUID REFERENCES public.parties(id),
  party_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash', -- cash, bank_transfer, cheque, upi, other
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== LEADS TABLE ==========
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'direct', -- direct, referral, website, other
  status TEXT NOT NULL DEFAULT 'new', -- new, contacted, qualified, working, proposal_sent, customer, lost
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  value NUMERIC DEFAULT 0,
  expected_close_date DATE,
  tags TEXT[],
  converted_to_party_id UUID REFERENCES public.parties(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Add due_date to invoices ==========
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;

-- ========== Add public sharing to invoices ==========
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS public_password TEXT;

-- ========== ENABLE RLS ==========
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS for proposals
CREATE POLICY "Auth users can view proposals" ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update proposals" ON public.proposals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete proposals" ON public.proposals FOR DELETE TO authenticated USING (true);

-- RLS for proposal_items
CREATE POLICY "Auth users can view proposal_items" ON public.proposal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert proposal_items" ON public.proposal_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update proposal_items" ON public.proposal_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete proposal_items" ON public.proposal_items FOR DELETE TO authenticated USING (true);

-- RLS for payment_records
CREATE POLICY "Auth users can view payments" ON public.payment_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert payments" ON public.payment_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update payments" ON public.payment_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete payments" ON public.payment_records FOR DELETE TO authenticated USING (true);

-- RLS for leads
CREATE POLICY "Auth users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- Add anon SELECT policy for public invoice/proposal viewing
CREATE POLICY "Public can view invoice by token" ON public.invoices FOR SELECT TO anon USING (public_token IS NOT NULL);
CREATE POLICY "Public can view proposal by token" ON public.proposals FOR SELECT TO anon USING (public_token IS NOT NULL);
CREATE POLICY "Public can view proposal_items by token" ON public.proposal_items FOR SELECT TO anon 
  USING (EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND public_token IS NOT NULL));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Triggers for updated_at
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view company assets" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "Auth users can upload company assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "Auth users can update company assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');
CREATE POLICY "Auth users can delete company assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets');

-- Add new modules to module_permissions for all roles
INSERT INTO public.module_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('super_admin', 'proposals', true, true, true, true),
  ('super_admin', 'payments', true, true, true, true),
  ('super_admin', 'leads', true, true, true, true),
  ('admin', 'proposals', true, true, true, true),
  ('admin', 'payments', true, true, true, true),
  ('admin', 'leads', true, true, true, true),
  ('manager', 'proposals', true, true, true, false),
  ('manager', 'payments', true, true, true, false),
  ('manager', 'leads', true, true, true, true),
  ('accountant', 'proposals', true, true, true, false),
  ('accountant', 'payments', true, true, true, false),
  ('accountant', 'leads', false, true, false, false),
  ('viewer', 'proposals', false, true, false, false),
  ('viewer', 'payments', false, true, false, false),
  ('viewer', 'leads', false, true, false, false);
