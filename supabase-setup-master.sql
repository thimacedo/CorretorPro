-- ==============================================================================
-- SCRIPT DE BOOTSTRAP E ATUALIZAÇÃO DE RLS
-- Rode este script no SQL Editor do Supabase ANTES de fazer o login com o Google
-- ==============================================================================

-- 1. Função RPC que o front-end vai chamar logo após o login
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função crie a organização ignorando o RLS temporariamente
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_full_name TEXT;
  v_org_id UUID;
  v_role TEXT;
BEGIN
  -- Pega os dados do usuário autenticado no momento
  v_user_id := auth.uid();
  v_email := COALESCE(auth.jwt() ->> 'email', auth.email());
  v_full_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', 'Corretor');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Garante que o usuário existe na tabela public.users
  INSERT INTO public.users (id, full_name, email)
  VALUES (v_user_id, v_full_name, v_email)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Verifica se o usuário já pertence a alguma organização
  SELECT organization_id, role::text INTO v_org_id, v_role
  FROM public.organization_members
  WHERE user_id = v_user_id
  LIMIT 1;

  -- Se não pertence a nenhuma, cria uma ou vincula à existente
  IF v_org_id IS NULL THEN
    -- REGRA DE NEGÓCIO: Se for o thi.macedo@gmail.com, tenta vincular à Matriz ou cria se não existir
    IF v_email = 'thi.macedo@gmail.com' THEN
      SELECT id INTO v_org_id FROM public.organizations WHERE cnpj = '00.000.000/0001-00' LIMIT 1;
      
      IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name, cnpj, subscription_tier, slug)
        VALUES ('CorretorPro Matriz', '00.000.000/0001-00', 'premium', 'corretorpro-matriz')
        RETURNING id INTO v_org_id;
      END IF;
      v_role := 'master_admin';
    ELSE
      -- Para outros usuários, cria uma org isolada padrão
      INSERT INTO public.organizations (name, cnpj, subscription_tier, slug)
      VALUES ('Imobiliária ' || v_full_name, '00.000.000/0002-00', 'free', lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g')))
      ON CONFLICT (cnpj) DO UPDATE SET 
        name = EXCLUDED.name,
        slug = COALESCE(public.organizations.slug, EXCLUDED.slug)
      RETURNING id INTO v_org_id;
      v_role := 'master_admin'; 
    END IF;

    -- Vincula o usuário à organização (Garante que não duplique o vínculo)
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (v_user_id, v_org_id, v_role::org_role)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN jsonb_build_object('organization_id', v_org_id, 'role', v_role);
END;
$$;

-- ==============================================================================
-- 2. Atualização das Políticas RLS (Row Level Security)
-- Mudando de JWT Claims para Subqueries (Mais seguro e imediato após o login)
-- ==============================================================================

-- Propriedades (Imóveis)
DROP POLICY IF EXISTS "Leitura restrita por Tenant" ON properties;
CREATE POLICY "Acesso total por Tenant" ON properties
  FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Leads
DROP POLICY IF EXISTS "Gestão de Leads por Hierarquia" ON leads;
CREATE POLICY "Gestão de Leads por Hierarquia" ON leads
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    AND (
      EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
      OR assigned_broker_id = auth.uid()
    )
  );

-- Oportunidades (Funil)
DROP POLICY IF EXISTS "Acesso Oportunidades" ON opportunities;
CREATE POLICY "Acesso Oportunidades" ON opportunities
  FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
      AND (
        EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager'))
        OR assigned_broker_id = auth.uid()
      )
    )
  );

-- Organizações (Permite que o usuário veja a própria organização)
DROP POLICY IF EXISTS "Ver própria organização" ON organizations;
CREATE POLICY "Ver própria organização" ON organizations
  FOR SELECT
  USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Membros (Permite ver quem trabalha na mesma organização)
DROP POLICY IF EXISTS "Ver membros da equipe" ON organization_members;
CREATE POLICY "Ver membros da equipe" ON organization_members
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Usuários (Permite que o usuário gerencie o próprio perfil)
DROP POLICY IF EXISTS "Usuários gerenciam próprio perfil" ON users;
CREATE POLICY "Usuários gerenciam próprio perfil" ON users
  FOR ALL
  USING (id = auth.uid());

-- Organizações (Permite que admins atualizem os dados da imobiliária)
DROP POLICY IF EXISTS "Admins gerenciam organização" ON organizations;
CREATE POLICY "Admins gerenciam organização" ON organizations
  FOR ALL
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('master_admin', 'manager')
    )
  );
