-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE AVISOS DO LINTER DE SEGURANÇA (SUPABASE)
-- Rode este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. CORREÇÃO: rls_disabled_in_public (spatial_ref_sys)
-- A tabela spatial_ref_sys é criada automaticamente pelo PostGIS. 
-- Habilitar RLS nela evita que seja exposta publicamente via API (PostgREST).
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- 2. CORREÇÃO: rls_enabled_no_policy (public.interactions)
-- A tabela interactions tinha RLS habilitado, mas nenhuma política, bloqueando o acesso.
DROP POLICY IF EXISTS "Acesso Interações" ON public.interactions;
CREATE POLICY "Acesso Interações" ON public.interactions
  FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE organization_id IN (SELECT get_user_organizations())
      AND (
        EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
        OR assigned_broker_id = auth.uid()
      )
    )
  );

-- 3. CORREÇÃO: rls_enabled_no_policy (public.users)
-- A tabela users tinha RLS habilitado, mas nenhuma política, bloqueando o acesso.
-- Política de Leitura: Usuário pode ver a si mesmo e membros da mesma organização
DROP POLICY IF EXISTS "Acesso Usuários" ON public.users;
CREATE POLICY "Acesso Usuários" ON public.users
  FOR SELECT
  USING (
    id = auth.uid() OR
    id IN (
      SELECT user_id FROM public.organization_members WHERE organization_id IN (SELECT get_user_organizations())
    )
  );

-- Política de Atualização: Usuário pode atualizar apenas o próprio perfil
DROP POLICY IF EXISTS "Atualizar próprio perfil" ON public.users;
CREATE POLICY "Atualizar próprio perfil" ON public.users
  FOR UPDATE
  USING (id = auth.uid());

-- 4. CORREÇÃO: extension_in_public (postgis)
-- Move a extensão PostGIS do schema 'public' para um schema 'extensions' dedicado.
-- (Nota: Se houver erro ao rodar este bloco devido a dependências, você pode ignorar o aviso do linter, 
-- pois o RLS na spatial_ref_sys já protege os dados).
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION postgis SET SCHEMA extensions;
