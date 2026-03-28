import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Building2, 
  LayoutDashboard, 
  KanbanSquare, 
  Home, 
  Users, 
  Settings,
  Bell,
  Search,
  ChevronDown,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

import { useAuth } from '../lib/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Funil de Vendas', href: '/crm', icon: KanbanSquare },
  { name: 'Imóveis', href: '/properties', icon: Home },
  { name: 'Equipe', href: '/team', icon: Users },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    async function checkConnection() {
      try {
        // Verifica a conexão tentando acessar a tabela (mesmo que não exista ainda)
        const { error } = await supabase.from('organizations').select('id').limit(1);
        
        // Se não houver erro, ou se o erro for "relation does not exist" (42P01), a conexão com o banco foi bem sucedida.
        if (!error || error.code === '42P01') {
          setStatus('connected');
        } else {
          console.error('Erro de conexão Supabase:', error);
          setStatus('error');
        }
      } catch (err) {
        console.error('Exceção na conexão Supabase:', err);
        setStatus('error');
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="flex items-center text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200" title={status === 'connected' ? 'Conectado ao Supabase' : 'Falha na conexão'}>
      <Database className={cn("w-3.5 h-3.5 mr-1.5", 
        status === 'checking' ? 'text-yellow-500 animate-pulse' :
        status === 'connected' ? 'text-emerald-500' : 'text-red-500'
      )} />
      <span className="text-zinc-600">
        {status === 'checking' ? 'Conectando...' :
         status === 'connected' ? 'Supabase Online' : 'Erro de Conexão'}
      </span>
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900 text-zinc-300 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <Building2 className="w-6 h-6 text-emerald-500 mr-3" />
          <span className="text-white font-semibold text-lg tracking-tight">CorretorPro</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'hover:bg-zinc-800 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-medium shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-white truncate">{user?.user_metadata?.full_name || 'Corretor'}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="ml-2 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              title="Sair"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center flex-1">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar leads, imóveis ou corretores..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <ConnectionStatus />

            {/* Tenant Selector Mock */}
            <button className="flex items-center text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
              Imobiliária Alpha
              <ChevronDown className="w-4 h-4 ml-1 text-zinc-400" />
            </button>

            <button className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
