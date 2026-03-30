import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  AlertCircle,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ArrowRightLeft,
  BellOff,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { format, parseISO, isAfter, isBefore, addDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  assigned_to: string;
  lead_id?: string;
  property_id?: string;
  lead_name?: string;
  property_title?: string;
  assigned_user_name?: string;
  flag?: {
    type: 'none' | 'overdue' | 'silenced' | 'nudge';
    updatedAt: any;
    updatedBy: string;
  };
}

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  manager_id?: string;
}

export default function Dashboard() {
  const { organization, user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState<string>(user?.uid || '');
  const [redirectingAppt, setRedirectingAppt] = useState<Appointment | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string>('');
  const [redirectDate, setRedirectDate] = useState<string>('');
  
  const isManager = profile?.role === 'master_admin' || profile?.role === 'manager';

  useEffect(() => {
    if (user) {
      setFilterUserId(user.uid);
    }
  }, [user]);

  const fetchData = async () => {
    if (!organization || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch team members if manager
      if (isManager) {
        const teamQuery = query(collection(db, 'users'), where('tenant_id', '==', organization.id));
        const teamSnapshot = await getDocs(teamQuery);
        const teamList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
        setTeamMembers(teamList);
      }

      // Fetch appointments
      // We'll fetch all upcoming and recent ones to check for overdue
      const startOfToday = startOfDay(new Date()).toISOString();
      const endOfNextWeek = endOfDay(addDays(new Date(), 7)).toISOString();

      let apptsQuery = query(
        collection(db, 'appointments'),
        where('organization_id', '==', organization.id),
        where('assigned_to', '==', filterUserId),
        orderBy('start_time', 'asc'),
        limit(20)
      );

      const apptsSnapshot = await getDocs(apptsQuery);
      const apptsData = apptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

      // Fetch leads and properties to enrich
      const leadsSnapshot = await getDocs(query(collection(db, 'leads'), where('organization_id', '==', organization.id)));
      const propsSnapshot = await getDocs(query(collection(db, 'properties'), where('organization_id', '==', organization.id)));
      
      const leadsList = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const propsList = propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const enriched = apptsData.map(appt => {
        const lead = leadsList.find(l => l.id === appt.lead_id);
        const property = propsList.find(p => p.id === appt.property_id);
        return {
          ...appt,
          lead_name: lead ? `${lead.first_name} ${lead.last_name}` : undefined,
          property_title: property ? property.title : undefined
        };
      });

      setAppointments(enriched);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organization, filterUserId]);

  const handleFlagAction = async (apptId: string, action: 'silence' | 'nudge' | 'redirect', newUserId?: string, newDate?: string) => {
    if (!isManager || !organization) return;
    
    try {
      const apptRef = doc(db, 'appointments', apptId);
      const updateData: any = {
        'flag.updatedAt': serverTimestamp(),
        'flag.updatedBy': user?.uid
      };

      const currentAppt = appointments.find(a => a.id === apptId);
      let notificationTargetId = currentAppt?.assigned_to;
      let notificationTitle = '';
      let notificationMessage = '';

      if (action === 'silence') {
        updateData['flag.type'] = 'silenced';
      } else if (action === 'nudge') {
        updateData['flag.type'] = 'nudge';
        notificationTitle = 'Cobrança de Ação';
        notificationMessage = `O gestor solicitou uma atualização sobre o compromisso: ${currentAppt?.title}`;
      } else if (action === 'redirect' && newUserId && newDate) {
        const newStart = new Date(newDate);
        
        // Manter a duração original
        if (currentAppt) {
          const originalStart = parseISO(currentAppt.start_time);
          const originalEnd = parseISO(currentAppt.end_time);
          const durationMs = originalEnd.getTime() - originalStart.getTime();
          const newEnd = new Date(newStart.getTime() + durationMs);
          
          updateData.start_time = newStart.toISOString();
          updateData.end_time = newEnd.toISOString();
        }

        updateData.assigned_to = newUserId;
        updateData['flag.type'] = 'none'; // Reset flag on redirect
        notificationTargetId = newUserId;
        notificationTitle = 'Novo Compromisso Redirecionado';
        notificationMessage = `Um novo compromisso foi atribuído a você para o dia ${format(newStart, "dd/MM 'às' HH:mm")}: ${currentAppt?.title}`;
      }

      await updateDoc(apptRef, updateData);

      if (notificationTargetId && notificationTitle) {
        await addDoc(collection(db, 'notifications'), {
          user_id: notificationTargetId,
          title: notificationTitle,
          message: notificationMessage,
          read: false,
          type: action,
          created_at: serverTimestamp(),
          organization_id: organization.id
        });
      }

      setRedirectingAppt(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    }
  };

  const getOverdueStatus = (appt: Appointment) => {
    if (appt.status === 'completed' || appt.status === 'cancelled') return 'none';
    if (appt.flag?.type === 'silenced') return 'silenced';
    
    const now = new Date();
    const endTime = parseISO(appt.end_time);
    
    if (isBefore(endTime, now)) {
      return appt.flag?.type === 'nudge' ? 'nudge' : 'overdue';
    }
    
    return 'none';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const overdueAppts = appointments.filter(a => getOverdueStatus(a) === 'overdue' || getOverdueStatus(a) === 'nudge');
  const upcomingAppts = appointments.filter(a => getOverdueStatus(a) === 'none' && isAfter(parseISO(a.start_time), new Date()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Bem-vindo, {profile?.full_name?.split(' ')[0] || 'Corretor'}</h1>
          <p className="text-sm text-zinc-500 mt-1">Aqui está o resumo das suas atividades.</p>
        </div>

        {isManager && (
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-zinc-200 shadow-sm">
            <Filter className="w-4 h-4 text-zinc-400 ml-2" />
            <select 
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="text-sm font-medium text-zinc-700 bg-transparent border-none focus:ring-0 outline-none pr-8"
            >
              <option value={user?.uid}>Meus Compromissos</option>
              
              {/* Gestores e seus subordinados */}
              {teamMembers
                .filter(m => m.role === 'master_admin' || m.role === 'manager')
                .map(manager => {
                  const subordinates = teamMembers.filter(m => m.manager_id === manager.id && m.id !== user?.uid);
                  
                  return (
                    <optgroup key={manager.id} label={`Equipe: ${manager.full_name}`}>
                      {manager.id !== user?.uid && (
                        <option value={manager.id}>{manager.full_name} (Gestor)</option>
                      )}
                      {subordinates.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.full_name}</option>
                      ))}
                    </optgroup>
                  );
                })
              }

              {/* Corretores sem gestor definido */}
              {teamMembers.filter(m => m.role === 'broker' && !m.manager_id && m.id !== user?.uid).length > 0 && (
                <optgroup label="Sem Equipe">
                  {teamMembers
                    .filter(m => m.role === 'broker' && !m.manager_id && m.id !== user?.uid)
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))
                  }
                </optgroup>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Overdue Alerts */}
      {overdueAppts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold">Atividades em Atraso ({overdueAppts.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdueAppts.map(appt => (
              <div key={appt.id} className="bg-white border-l-4 border-red-500 rounded-xl shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-zinc-900">{appt.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-1 rounded">Atrasado</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{appt.description || 'Sem descrição'}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {format(parseISO(appt.start_time), "dd 'de' MMM", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(appt.start_time), "HH:mm")} - {format(parseISO(appt.end_time), "HH:mm")}
                    </div>
                  </div>
                </div>

                {isManager && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleFlagAction(appt.id, 'nudge')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors text-xs font-bold"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Cobrar Ação
                      </button>
                      
                      <button 
                        onClick={() => {
                          setRedirectingAppt(appt);
                          setRedirectTarget('');
                          setRedirectDate(format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"));
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors text-xs font-bold"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Redirecionar
                      </button>

                      <button 
                        onClick={() => handleFlagAction(appt.id, 'silence')}
                        className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-colors"
                        title="Silenciar Alerta"
                      >
                        <BellOff className="w-4 h-4" />
                      </button>
                    </div>
                    <Link to="/agenda" className="text-xs font-medium text-zinc-400 hover:text-zinc-600">Ver na Agenda</Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900">Próximos Compromissos</h2>
            <Link to="/agenda" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
              Ver agenda completa
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            {upcomingAppts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-zinc-300" />
                </div>
                <p className="text-zinc-500">Nenhum compromisso agendado para os próximos dias.</p>
                <Link to="/agenda" className="mt-4 inline-flex items-center text-sm font-bold text-emerald-600">
                  Agendar agora
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {upcomingAppts.map(appt => (
                  <div key={appt.id} className="p-4 hover:bg-zinc-50 transition-colors flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex flex-col items-center justify-center text-emerald-600 shrink-0">
                      <span className="text-[10px] font-bold uppercase">{format(parseISO(appt.start_time), 'MMM', { locale: ptBR })}</span>
                      <span className="text-lg font-bold leading-none">{format(parseISO(appt.start_time), 'dd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-zinc-900 truncate">{appt.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(parseISO(appt.start_time), 'HH:mm')}
                        </span>
                        {appt.lead_name && (
                          <span className="flex items-center gap-1 truncate">
                            <User className="w-3.5 h-3.5" />
                            {appt.lead_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 rounded-full">Agendado</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats / Actions */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-zinc-900">Acesso Rápido</h2>
          <div className="grid grid-cols-1 gap-4">
            <Link to="/crm" className="group bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm hover:border-emerald-500 transition-all flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">Gerenciar Leads</h3>
                <p className="text-xs text-zinc-500">Acompanhe seu funil de vendas</p>
              </div>
            </Link>
            <Link to="/properties" className="group bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm hover:border-emerald-500 transition-all flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">Ver Imóveis</h3>
                <p className="text-xs text-zinc-500">Explore o portfólio disponível</p>
              </div>
            </Link>
          </div>

          {/* Tips / Info Card */}
          <div className="bg-zinc-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Dica do Dia</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Manter sua agenda atualizada aumenta sua produtividade em até 40%. Não esqueça de registrar o resultado de cada visita!
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* Redirect Modal */}
      {redirectingAppt && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-100 shrink-0">
              <h3 className="text-lg font-bold text-zinc-900">Redirecionar Atividade</h3>
              <p className="text-sm text-zinc-500 mt-1">Defina o novo responsável e a nova data.</p>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Novo Responsável</label>
                <select 
                  value={redirectTarget}
                  onChange={(e) => setRedirectTarget(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Selecione um corretor...</option>
                  
                  {/* Gestores e seus subordinados */}
                  {teamMembers
                    .filter(m => m.role === 'master_admin' || m.role === 'manager')
                    .map(manager => {
                      const subordinates = teamMembers.filter(m => m.manager_id === manager.id && m.id !== redirectingAppt.assigned_to);
                      
                      return (
                        <optgroup key={manager.id} label={`Equipe: ${manager.full_name} (Gestor)`}>
                          {manager.id !== redirectingAppt.assigned_to && (
                            <option value={manager.id}>{manager.full_name} (Gestor)</option>
                          )}
                          {subordinates.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.full_name}</option>
                          ))}
                        </optgroup>
                      );
                    })
                  }

                  {/* Corretores sem gestor definido */}
                  {teamMembers.filter(m => m.role === 'broker' && !m.manager_id && m.id !== redirectingAppt.assigned_to).length > 0 && (
                    <optgroup label="Sem Equipe Definida">
                      {teamMembers
                        .filter(m => m.role === 'broker' && !m.manager_id && m.id !== redirectingAppt.assigned_to)
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))
                      }
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nova Data e Hora</label>
                <input 
                  type="datetime-local"
                  value={redirectDate}
                  onChange={(e) => setRedirectDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Nota:</strong> O novo responsável receberá uma notificação imediata com os detalhes e o novo horário.
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 flex gap-3">
              <button 
                onClick={() => setRedirectingAppt(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={!redirectTarget || !redirectDate}
                onClick={() => handleFlagAction(redirectingAppt.id, 'redirect', redirectTarget, redirectDate)}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
