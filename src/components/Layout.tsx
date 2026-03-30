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
  Database,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDocFromServer, collection, query, where, orderBy, limit, onSnapshot, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '../lib/AuthContext';

const navigation = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'Funil de Vendas', href: '/crm', icon: KanbanSquare },
  { name: 'Imóveis', href: '/properties', icon: Home },
  { name: 'Equipe', href: '/team', icon: Users },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: any;
  type?: string;
}

function NotificationDropdown() {
  const { user, organization } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || !organization) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(list);
    }, (err) => {
      console.error('Erro ao ouvir notificações:', err);
    });

    return () => unsubscribe();
  }, [user, organization]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900">Notificações</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                >
                  Marcar todas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Nenhuma notificação.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={cn(
                        "p-4 hover:bg-zinc-50 transition-colors cursor-pointer",
                        !n.read && "bg-emerald-50/30"
                      )}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={cn("text-sm font-bold text-zinc-900", !n.read && "text-emerald-900")}>{n.title}</h4>
                        {!n.read && <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-zinc-400 mt-2">
                        {n.created_at?.toDate ? format(n.created_at.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'Agora'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, profile, organization, loading, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-zinc-900 text-zinc-300 flex flex-col z-50 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-emerald-500 mr-3" />
            <span className="text-white font-semibold text-lg tracking-tight">CorretorPro</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setIsSidebarOpen(false)}
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
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-medium shrink-0 overflow-hidden">
                {profile?.photo_url ? (
                  <img 
                    src={profile.photo_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-white truncate">{profile?.full_name || user?.user_metadata?.full_name || 'Corretor'}</p>
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
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 lg:px-8 z-30 shrink-0">
          <div className="flex items-center flex-1 gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar leads, imóveis ou corretores..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-6">
            {/* Tenant Selector */}
            <div className="flex items-center gap-2">
              <button className="flex items-center text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">
                <span className={cn("w-2 h-2 rounded-full mr-2", organization ? "bg-emerald-500" : "bg-red-500")}></span>
                <span className="max-w-[100px] sm:max-w-none truncate">
                  {loading ? '...' : (organization?.name || 'Sem Org')}
                </span>
                <ChevronDown className="w-4 h-4 ml-1 text-zinc-400 shrink-0" />
              </button>
              {!organization && !loading && user?.email === 'thi.macedo@gmail.com' && (
                <NavLink to="/seed" className="hidden sm:block px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full hover:bg-amber-200 transition-colors animate-pulse">
                  Sincronizar
                </NavLink>
              )}
            </div>

            <NotificationDropdown />
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
