-- Adicionar campos de relacionamento e resultado à agenda
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS result TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.result IS 'Resultado da visita: proposta, interessado, aguardando, sem_interesse, nao_compareceu';
