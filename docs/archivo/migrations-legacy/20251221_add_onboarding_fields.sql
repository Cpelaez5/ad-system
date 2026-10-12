-- Add onboarding fields to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free_trial',
ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 5368709120; -- Default 5GB

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly_cents INTEGER NOT NULL,
    price_yearly_cents INTEGER NOT NULL,
    storage_limit_bytes BIGINT NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed plans
INSERT INTO public.plans (id, name, price_monthly_cents, price_yearly_cents, storage_limit_bytes, features)
VALUES 
    ('free_trial', 'Prueba Gratuita', 0, 0, 5368709120, '{"ai_invoices": true, "chatbot": true, "users": 1}'::jsonb),
    ('basic', 'Básico', 1500, 15000, 5368709120, '{"ai_invoices": true, "chatbot": true, "users": 1}'::jsonb),
    ('pro', 'Profesional', 3000, 30000, 21474836480, '{"ai_invoices": true, "chatbot": true, "users": 3, "advanced_reports": true}'::jsonb),
    ('enterprise', 'Empresarial', 6000, 60000, 107374182400, '{"ai_invoices": true, "chatbot": true, "users": 10, "advanced_reports": true, "api_access": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price_monthly_cents = EXCLUDED.price_monthly_cents,
    price_yearly_cents = EXCLUDED.price_yearly_cents,
    storage_limit_bytes = EXCLUDED.storage_limit_bytes,
    features = EXCLUDED.features;

-- Enable RLS on plans (read-only for public)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone" 
ON public.plans FOR SELECT 
USING (true);
