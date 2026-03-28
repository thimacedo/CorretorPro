export type Role = 'master_admin' | 'manager' | 'broker' | 'read_only';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  tenant_id: string;
}

export interface Organization {
  id: string;
  name: string;
  cnpj: string;
  subscription_tier: string;
}

export interface Property {
  id: string;
  title: string;
  listing_type: 'venda' | 'locacao';
  property_type: string;
  price: number;
  bedrooms: number;
  area: number;
  image_url?: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  interest_temperature: 'frio' | 'morno' | 'quente';
  origin_source: string;
  assigned_broker_id?: string;
}

export interface Opportunity {
  id: string;
  lead: Lead;
  property?: Property;
  stage: 'Prospeccao' | 'Visita' | 'Proposta' | 'Documentacao' | 'Fechamento';
  expected_revenue: number;
}
