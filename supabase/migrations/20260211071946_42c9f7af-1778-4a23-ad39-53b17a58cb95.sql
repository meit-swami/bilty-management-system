-- Add mfa_enabled column to profiles for admin-controlled 2FA toggle
-- 0 = disabled (bypass MFA even if enrolled), 1 = enabled (enforce MFA if enrolled)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_enabled smallint NOT NULL DEFAULT 1;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.mfa_enabled IS '0 = 2FA disabled (bypass), 1 = 2FA enabled (enforce if enrolled). Super admin can toggle this to help locked-out users.';
