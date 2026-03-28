import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
// Substitua pelas suas chaves do projeto Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vcgjpwawrrxsvqzmyapm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZ2pwd2F3cnJ4c3Zxem15YXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODUxOTcsImV4cCI6MjA5MDI2MTE5N30.QOPy4TRJwfTylIRp7agioFw6aQpJcWkCIiV0LG4cqwA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
