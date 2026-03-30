-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DA AGENDA (COMPROMISSOS)
-- Rode este script no SQL Editor do Supabase
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso a compromissos" ON public.appointments;
CREATE POLICY "Acesso a compromissos" ON public.appointments
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    AND (
      EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );
