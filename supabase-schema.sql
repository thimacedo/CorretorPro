-- ==========================================
-- CRM Imobiliário - Schema Multi-Tenant
-- ==========================================

-- Habilitar extensão PostGIS para o Radar Imobiliário (matching geoespacial)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Organizações (Imobiliárias/Franquias)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Usuários (Corretores/Gestores) - Estende auth.users do Supabase
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  creci_registry TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Membros da Organização (Tabela de Junção M:N)
CREATE TYPE org_role AS ENUM ('master_admin', 'manager', 'broker', 'read_only');

CREATE TABLE organization_members (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'broker',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

-- 4. Propriedades (Imóveis)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('venda', 'locacao')),
  property_type TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  condo_fee NUMERIC(10, 2),
  bedrooms INT DEFAULT 0,
  parking_spaces INT DEFAULT 0,
  area NUMERIC(10, 2),
  geom GEOMETRY(Point, 4326), -- PostGIS
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Leads (Clientes Potenciais)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  assigned_broker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  contact_details JSONB,
  origin_source TEXT,
  interest_temperature TEXT CHECK (interest_temperature IN ('frio', 'morno', 'quente')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Oportunidades (Funil/Pipeline)
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Prospeccao', 'Visita', 'Proposta', 'Documentacao', 'Fechamento')),
  expected_revenue NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Interações (Timeline)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'whatsapp', 'email', 'in-person')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Exemplo de Policy RLS para Propriedades (Isolamento de Tenant)
-- Assume que o JWT contém o tenant_id no app_metadata
CREATE POLICY "Leitura restrita por Tenant" ON properties
  FOR SELECT
  USING (
    organization_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Exemplo de Policy RLS para Leads (Hierarquia Master vs Broker)
CREATE POLICY "Gestão de Leads por Hierarquia" ON leads
  FOR SELECT
  USING (
    organization_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('master_admin', 'manager')
      OR assigned_broker_id = auth.uid()
    )
  );
