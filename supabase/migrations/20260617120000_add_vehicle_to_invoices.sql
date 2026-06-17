ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id),
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
