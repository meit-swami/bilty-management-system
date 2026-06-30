ALTER TABLE public.bilties
  ADD COLUMN IF NOT EXISTS freight_status TEXT DEFAULT 'to_be_billed',
  ADD COLUMN IF NOT EXISTS gst_paid_by TEXT DEFAULT 'consignor';
