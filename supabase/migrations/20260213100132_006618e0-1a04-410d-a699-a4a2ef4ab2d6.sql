
-- Create bilty_bills table for multiple bill entries per bilty
CREATE TABLE public.bilty_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bilty_id UUID NOT NULL REFERENCES public.bilties(id) ON DELETE CASCADE,
  bill_number TEXT,
  bill_date TEXT,
  eway_bill_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bilty_bills ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage bilty_bills
CREATE POLICY "Authenticated users can manage bilty_bills" ON public.bilty_bills FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bilty_bills;
