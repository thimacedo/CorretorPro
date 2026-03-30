-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE RLS (Evitar Recursão Infinita)
-- Rode este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. Cria uma função segura para buscar as organizações do usuário sem disparar RLS
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

-- 2. Atualiza a política de Membros da Organização
DROP POLICY IF EXISTS "Ver membros da equipe" ON organization_members;
CREATE POLICY "Ver membros da equipe" ON organization_members
  FOR SELECT
  USING (organization_id IN (SELECT get_user_organizations()));

-- 3. Atualiza a política de Organizações
DROP POLICY IF EXISTS "Ver própria organização" ON organizations;
CREATE POLICY "Ver própria organização" ON organizations
  FOR SELECT
  USING (id IN (SELECT get_user_organizations()));

-- 4. Atualiza a política de Imóveis (Properties)
DROP POLICY IF EXISTS "Acesso total por Tenant" ON properties;
CREATE POLICY "Acesso total por Tenant" ON properties
  FOR ALL
  USING (organization_id IN (SELECT get_user_organizations()));

-- 5. Atualiza a política de Leads
DROP POLICY IF EXISTS "Gestão de Leads por Hierarquia" ON leads;
CREATE POLICY "Gestão de Leads por Hierarquia" ON leads
  FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
    AND (
      EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
      OR assigned_broker_id = auth.uid()
    )
  );

-- 6. Atualiza a política de Oportunidades
DROP POLICY IF EXISTS "Acesso Oportunidades" ON opportunities;
CREATE POLICY "Acesso Oportunidades" ON opportunities
  FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (SELECT get_user_organizations())
      AND (
        EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
        OR assigned_broker_id = auth.uid()
      )
    )
  );

-- 7. Atualiza a política de Agenda (Appointments)
DROP POLICY IF EXISTS "Acesso a compromissos" ON public.appointments;
CREATE POLICY "Acesso a compromissos" ON public.appointments
  FOR ALL
  USING (
    organization_id IN (SELECT get_user_organizations())
    AND (
      EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );
