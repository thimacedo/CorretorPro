import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, isToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  Clock, 
  User, 
  X, 
  Building2,
  AlertTriangle,
  MessageSquare,
  ArrowRightLeft,
  BellOff
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

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
  result?: string;
  notes?: string;
  assigned_user_name?: string;
  lead_name?: string;
  property_title?: string;
  flag?: {
    type: 'none' | 'overdue' | 'silenced' | 'nudge';
    updatedAt: any;
    updatedBy: string;
  };
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
}

interface Property {
  id: string;
  title: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
}

export default function Agenda() {
  const { user, profile, organization } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    assigned_to: user?.uid || '',
    lead_id: '',
    property_id: '',
    result: '',
    notes: ''
  });

  const isManager = profile?.role === 'master_admin' || profile?.role === 'manager';

  const fetchData = async () => {
    if (!organization || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch appointments
      let apptsQuery = query(
        collection(db, 'appointments'),
        where('organization_id', '==', organization.id),
        orderBy('start_time', 'asc')
      );

      // Se não for gestor, vê apenas os seus próprios compromissos
      if (!isManager) {
        apptsQuery = query(
          collection(db, 'appointments'),
          where('organization_id', '==', organization.id),
          where('assigned_to', '==', user.uid),
          orderBy('start_time', 'asc')
        );
      }

      const apptsSnapshot = await getDocs(apptsQuery);
      const apptsData = apptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      
      // Fetch leads and properties for the form
      const leadsQuery = query(collection(db, 'leads'), where('organization_id', '==', organization.id), orderBy('first_name'));
      const propsQuery = query(collection(db, 'properties'), where('organization_id', '==', organization.id), orderBy('title'));
      
      const [leadsSnapshot, propsSnapshot] = await Promise.all([
        getDocs(leadsQuery),
        getDocs(propsQuery)
      ]);

      const leadsList = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      const propsList = propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));

      setLeads(leadsList);
      setProperties(propsList);

      // Enrich appointments with names (in a real app we might denormalize or use a hook)
      const enrichedAppts = apptsData.map(appt => {
        const lead = leadsList.find(l => l.id === appt.lead_id);
        const property = propsList.find(p => p.id === appt.property_id);
        const assignedUser = teamMembers.find(m => m.id === appt.assigned_to);
        return {
          ...appt,
          lead_name: lead ? `${lead.first_name} ${lead.last_name}` : undefined,
          property_title: property ? property.title : undefined,
          assigned_user_name: assignedUser ? assignedUser.full_name : undefined
        };
      });

      setAppointments(enrichedAppts);

      // Fetch team members if manager
      if (isManager) {
        const teamQuery = query(collection(db, 'users'), where('tenant_id', '==', organization.id));
        const teamSnapshot = await getDocs(teamQuery);
        const teamList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
        setTeamMembers(teamList);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organization, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const openEditModal = (appointment: any) => {
    setEditingAppointment(appointment);
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);
    setFormData({
      title: appointment.title,
      description: appointment.description || '',
      date: format(startDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
      assigned_to: appointment.assigned_to,
      lead_id: appointment.lead_id || '',
      property_id: appointment.property_id || '',
      result: appointment.result || '',
      notes: appointment.notes || ''
    });
    setIsModalOpen(true);
  };

  const openCreateModal = (date?: Date) => {
    setEditingAppointment(null);
    const targetDate = date || new Date();
    setSelectedDate(targetDate);
    setFormData({
      title: '',
      description: '',
      date: format(targetDate, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      assigned_to: user?.uid || '',
      lead_id: '',
      property_id: '',
      result: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir compromisso:', error);
    }
  };

  const handleFlagAction = async (apptId: string, action: 'silence' | 'nudge' | 'redirect', newUserId?: string) => {
    if (!isManager) return;
    
    try {
      const apptRef = doc(db, 'appointments', apptId);
      const updateData: any = {
        'flag.updatedAt': serverTimestamp(),
        'flag.updatedBy': user?.uid
      };

      if (action === 'silence') {
        updateData['flag.type'] = 'silenced';
      } else if (action === 'nudge') {
        updateData['flag.type'] = 'nudge';
      } else if (action === 'redirect' && newUserId) {
        updateData.assigned_to = newUserId;
        updateData['flag.type'] = 'none';
      }

      await updateDoc(apptRef, updateData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) {
      alert('Erro: Organização ou usuário não encontrados. Por favor, atualize a página ou faça login novamente.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      const appointmentData: any = {
        organization_id: organization.id,
        title: formData.title,
        description: formData.description,
        start_time: startDateTime,
        end_time: endDateTime,
        assigned_to: formData.assigned_to,
        created_by: user.uid,
        status: formData.result ? 'completed' : 'scheduled',
        lead_id: formData.lead_id || null,
        property_id: formData.property_id || null,
        result: formData.result || null,
        notes: formData.notes || null,
        updated_at: serverTimestamp()
      };

      if (editingAppointment) {
        await updateDoc(doc(db, 'appointments', editingAppointment.id), appointmentData);
      } else {
        appointmentData.created_at = serverTimestamp();
        appointmentData.flag = { type: 'none', updatedAt: serverTimestamp(), updatedBy: user.uid };
        await addDoc(collection(db, 'appointments'), appointmentData);
      }

      setIsModalOpen(false);
      setFormData({
        title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00', endTime: '10:00', assigned_to: user.uid,
        lead_id: '', property_id: '', result: '', notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar compromisso:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções do Calendário
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex space-x-2">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-zinc-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-zinc-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-medium text-sm text-zinc-500 py-2">
          {format(addDays(startDate, i), 'EEEEEE', { locale: ptBR })}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Pega os compromissos do dia
        const dayAppointments = appointments.filter(appt => 
          isSameDay(parseISO(appt.start_time), cloneDay)
        );

        days.push(
          <div
            key={day.toString()}
            onClick={() => openCreateModal(cloneDay)}
            className={cn(
              "min-h-[100px] p-2 border border-zinc-100 transition-colors cursor-pointer hover:bg-zinc-50 flex flex-col",
              !isSameMonth(day, monthStart) ? "bg-zinc-50/50 text-zinc-400" : "bg-white text-zinc-800",
              isToday(day) && "bg-emerald-50/30"
            )}
          >
            <div className="flex justify-between items-start">
              <span className={cn(
                "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                isToday(day) && "bg-emerald-500 text-white"
              )}>
                {formattedDate}
              </span>
              {dayAppointments.length > 0 && (
                <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                  {dayAppointments.length}
                </span>
              )}
            </div>
            
            <div className="mt-2 flex-1 overflow-y-auto space-y-1 no-scrollbar">
              {dayAppointments.slice(0, 3).map((appt, idx) => {
                const overdueStatus = getOverdueStatus(appt);
                return (
                  <div 
                    key={appt.id} 
                    onClick={(e) => { e.stopPropagation(); openEditModal(appt); }}
                    className={cn(
                      "text-[10px] p-1 rounded truncate group relative",
                      appt.status === 'completed' ? "bg-zinc-100 text-zinc-500 line-through" : 
                      overdueStatus === 'overdue' ? "bg-red-100 text-red-800 border-l-2 border-red-500" :
                      overdueStatus === 'nudge' ? "bg-amber-100 text-amber-800 border-l-2 border-amber-500" :
                      "bg-emerald-100 text-emerald-800"
                    )} 
                    title={`${appt.title}${appt.lead_name ? ` - ${appt.lead_name}` : ''}`}
                  >
                    {format(parseISO(appt.start_time), 'HH:mm')} {appt.title}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(appt.id); }}
                      className="absolute right-0 top-0 h-full px-1 bg-inherit text-inherit opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
              {dayAppointments.length > 3 && (
                <div className="text-xs text-zinc-500 font-medium pl-1">
                  +{dayAppointments.length - 3} mais
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">{rows}</div>;
  };

  const renderListView = () => {
    // Agrupa compromissos por dia (apenas do mês atual ou próximos)
    const upcoming = appointments.filter(a => new Date(a.start_time) >= new Date(new Date().setHours(0,0,0,0)));
    
    if (upcoming.length === 0) {
      return (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 mb-2">Nenhum compromisso</h3>
          <p className="text-zinc-500">Você não tem compromissos agendados para os próximos dias.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {upcoming.map(appt => {
          const overdueStatus = getOverdueStatus(appt);
          return (
            <div key={appt.id} className={cn(
              "bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm transition-shadow group relative",
              overdueStatus === 'overdue' && "border-l-4 border-l-red-500",
              overdueStatus === 'nudge' && "border-l-4 border-l-amber-500"
            )}>
              <div className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center",
                overdueStatus === 'overdue' ? "bg-red-50 text-red-700" :
                overdueStatus === 'nudge' ? "bg-amber-50 text-amber-700" :
                "bg-emerald-50 text-emerald-700"
              )}>
                <span className="text-xs font-medium uppercase">{format(parseISO(appt.start_time), 'MMM', { locale: ptBR })}</span>
                <span className="text-xl font-bold">{format(parseISO(appt.start_time), 'dd')}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold text-zinc-900 truncate">{appt.title}</h4>
                  {overdueStatus === 'overdue' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                      <AlertTriangle className="w-3 h-3" />
                      Atrasado
                    </span>
                  )}
                  {overdueStatus === 'nudge' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
                      <MessageSquare className="w-3 h-3" />
                      Cobrado
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {format(parseISO(appt.start_time), 'HH:mm')} - {format(parseISO(appt.end_time), 'HH:mm')}
                  </div>
                  {isManager && appt.assigned_user_name && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1.5" />
                      {appt.assigned_user_name}
                    </div>
                  )}
                  {appt.lead_name && (
                    <div className="flex items-center text-emerald-600 font-medium">
                      <User className="w-4 h-4 mr-1.5" />
                      {appt.lead_name}
                    </div>
                  )}
                  {appt.property_title && (
                    <div className="flex items-center text-blue-600 font-medium">
                      <Building2 className="w-4 h-4 mr-1.5" />
                      {appt.property_title}
                    </div>
                  )}
                </div>
                {appt.description && (
                  <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{appt.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="sm:text-right flex flex-col items-end gap-1">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                    appt.status === 'scheduled' ? "bg-blue-100 text-blue-800" :
                    appt.status === 'completed' ? "bg-emerald-100 text-emerald-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {appt.status === 'scheduled' ? 'Agendado' :
                     appt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                  </span>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isManager && (overdueStatus === 'overdue' || overdueStatus === 'nudge') && (
                    <div className="flex gap-1 mr-2 pr-2 border-r border-zinc-200">
                      <button 
                        onClick={() => handleFlagAction(appt.id, 'nudge')}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Cobrar Ação"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleFlagAction(appt.id, 'silence')}
                        className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-colors"
                        title="Silenciar"
                      >
                        <BellOff className="w-4 h-4" />
                      </button>
                      <div className="relative group/redirect">
                        <button 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Redirecionar"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover/redirect:block bg-white border border-zinc-200 rounded-lg shadow-xl z-50 min-w-[200px] p-2">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase px-2 py-1">Redirecionar para:</p>
                          {teamMembers.filter(m => m.id !== appt.assigned_to).map(m => (
                            <button 
                              key={m.id}
                              onClick={() => handleFlagAction(appt.id, 'redirect', m.id)}
                              className="w-full text-left px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 rounded"
                            >
                              {m.full_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={() => openEditModal(appt)}
                    className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(appt.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agenda</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isManager ? 'Gerencie os compromissos de toda a equipe.' : 'Acompanhe seus compromissos e visitas.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-zinc-100 p-1 rounded-lg flex items-center">
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center",
                viewMode === 'calendar' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Mês
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center",
                viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <List className="w-4 h-4 mr-2" />
              Lista
            </button>
          </div>
          
          <button 
            onClick={() => openCreateModal()}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Compromisso</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {viewMode === 'calendar' ? (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm">
              {renderHeader()}
              {renderDays()}
              {renderCells()}
            </div>
          ) : (
            renderListView()
          )}
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
              <h2 className="text-base font-semibold text-zinc-900">
                {editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto">
              <form id="agenda-form" onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Título *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Ex: Visita ao Apartamento 101"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Data *</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Início *</label>
                    <input 
                      type="time" 
                      required
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Fim *</label>
                    <input 
                      type="time" 
                      required
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Cliente (Lead)</label>
                    <select 
                      value={formData.lead_id}
                      onChange={e => setFormData({...formData, lead_id: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="">Nenhum</option>
                      {leads.map(lead => (
                        <option key={lead.id} value={lead.id}>
                          {lead.first_name} {lead.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Imóvel</label>
                    <select 
                      value={formData.property_id}
                      onChange={e => setFormData({...formData, property_id: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="">Nenhum</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>
                          {prop.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {editingAppointment && (formData.lead_id || formData.property_id) && (
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Informações Cruzadas (Visita)</h3>
                      <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">VISITA</div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {formData.lead_id && (
                        <div className="flex items-start">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-emerald-100 mr-3 shrink-0">
                            <User className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Cliente Prospectado</p>
                            <p className="text-sm font-medium text-zinc-900">
                              {leads.find(l => l.id === formData.lead_id)?.first_name} {leads.find(l => l.id === formData.lead_id)?.last_name}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {formData.property_id && (
                        <div className="flex items-start">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-emerald-100 mr-3 shrink-0">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Imóvel da Carteira</p>
                            <p className="text-sm font-medium text-zinc-900">
                              {properties.find(p => p.id === formData.property_id)?.title}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editingAppointment && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Resultado da Visita</label>
                    <select 
                      value={formData.result}
                      onChange={e => setFormData({...formData, result: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="">Aguardando visita...</option>
                      <option value="proposta">Proposta Efetuada (Positivo)</option>
                      <option value="interessado">Interessado / Em Negociação (Positivo)</option>
                      <option value="aguardando">Aguardando Feedback (Neutro)</option>
                      <option value="sem_interesse">Sem Interesse (Negativo)</option>
                      <option value="nao_compareceu">Cliente não compareceu (Negativo)</option>
                    </select>
                  </div>
                )}

                {isManager && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Atribuir a *</label>
                    <select 
                      required
                      value={formData.assigned_to}
                      onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} {member.role === 'manager' || member.role === 'master_admin' ? '(Gestor)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Observações / Notas</label>
                  <textarea 
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    placeholder="Notas sobre a visita ou compromisso..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
                  <textarea 
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    placeholder="Detalhes adicionais..."
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center shrink-0">
              <div>
                {editingAppointment && (
                  <button 
                    type="button"
                    onClick={() => {
                      handleDelete(editingAppointment.id);
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="agenda-form"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    editingAppointment ? 'Salvar Alterações' : 'Agendar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
