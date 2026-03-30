import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Calendar, DollarSign, User, Building2, Phone, Mail, X, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { CurrencyInput } from '../components/ui/CurrencyInput';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  interest_temperature: 'frio' | 'morno' | 'quente';
  contact_details: {
    phone?: string;
    email?: string;
  };
}

interface Property {
  id: string;
  title: string;
}

interface Opportunity {
  id: string;
  lead_id: string;
  property_id: string | null;
  stage: string;
  expected_revenue: number;
  created_at: any;
  lead_name?: string;
  lead_temp?: string;
  property_title?: string;
  // For compatibility with existing UI
  lead?: {
    first_name: string;
    last_name: string;
    interest_temperature: string;
    contact_details: {
      email?: string;
      phone?: string;
    };
  };
  property?: {
    title: string;
  } | null;
}

const STAGES = [
  { id: 'Prospeccao', title: 'Prospecção', color: 'border-zinc-300' },
  { id: 'Visita', title: 'Visita', color: 'border-blue-300' },
  { id: 'Proposta', title: 'Proposta', color: 'border-yellow-300' },
  { id: 'Documentacao', title: 'Documentação', color: 'border-orange-300' },
  { id: 'Fechamento', title: 'Fechamento', color: 'border-emerald-400' },
];

const DraggableAny = Draggable as any;

export default function CRM() {
  const { user, organization, profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    temperature: 'morno' as 'frio' | 'morno' | 'quente',
    propertyId: '',
    value: 0,
    stage: 'Prospeccao'
  });

  const [properties, setProperties] = useState<Property[]>([]);

  const isManager = profile?.role === 'master_admin' || profile?.role === 'manager';

  const fetchData = async () => {
    if (!organization || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch Leads first to filter opportunities
      const leadsQuery = query(
        collection(db, 'leads'),
        where('organization_id', '==', organization.id)
      );
      const leadsSnapshot = await getDocs(leadsQuery);
      const leadsList = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Filter leads by broker if not manager
      const filteredLeads = isManager ? leadsList : leadsList.filter(l => l.assigned_broker_id === user.uid);
      const leadIds = filteredLeads.map(l => l.id);

      if (leadIds.length === 0) {
        setOpportunities([]);
      } else {
        // Fetch opportunities
        const oppsQuery = query(
          collection(db, 'opportunities'),
          where('organization_id', '==', organization.id),
          orderBy('created_at', 'desc')
        );
        const oppsSnapshot = await getDocs(oppsQuery);
        const allOpps = oppsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Filter opportunities by leadIds (for broker view)
        const filteredOpps = isManager ? allOpps : allOpps.filter(opp => leadIds.includes(opp.lead_id));
        
        // Fetch properties
        const propsQuery = query(
          collection(db, 'properties'),
          where('organization_id', '==', organization.id)
        );
        const propsSnapshot = await getDocs(propsQuery);
        const propsList = propsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setProperties(propsList);

        // Enrich opportunities
        const enrichedOpps = filteredOpps.map(opp => {
          const lead = filteredLeads.find(l => l.id === opp.lead_id);
          const property = propsList.find(p => p.id === opp.property_id);
          return {
            ...opp,
            lead: lead ? {
              first_name: lead.first_name,
              last_name: lead.last_name,
              interest_temperature: lead.interest_temperature,
              contact_details: lead.contact_details || {}
            } : { first_name: 'Desconhecido', last_name: '', interest_temperature: 'frio', contact_details: {} },
            property: property ? { title: property.title } : null
          };
        });

        setOpportunities(enrichedOpps);
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organization, user, profile]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId;
    
    // Optimistic update
    const updatedOpportunities = opportunities.map(opp => 
      opp.id === draggableId ? { ...opp, stage: newStage } : opp
    );
    setOpportunities(updatedOpportunities);

    try {
      await updateDoc(doc(db, 'opportunities', draggableId), {
        stage: newStage,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar estágio:', error);
      fetchData(); // Rollback
    }
  };

  const openEditModal = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      firstName: opportunity.lead?.first_name || '',
      lastName: opportunity.lead?.last_name || '',
      email: opportunity.lead?.contact_details?.email || '',
      phone: opportunity.lead?.contact_details?.phone || '',
      temperature: (opportunity.lead?.interest_temperature as any) || 'morno',
      propertyId: opportunity.property_id || '',
      value: opportunity.expected_revenue || 0,
      stage: opportunity.stage
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingOpportunity(null);
    setFormData({
      firstName: '', lastName: '', email: '', phone: '',
      temperature: 'morno', propertyId: '', value: 0, stage: 'Prospeccao'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'opportunities', id));
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir oportunidade:', error);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) {
      alert('Erro: Organização ou usuário não encontrados. Por favor, atualize a página ou faça login novamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingOpportunity) {
        // Update Lead
        await updateDoc(doc(db, 'leads', editingOpportunity.lead_id), {
          first_name: formData.firstName,
          last_name: formData.lastName,
          interest_temperature: formData.temperature,
          contact_details: {
            email: formData.email,
            phone: formData.phone
          },
          updated_at: serverTimestamp()
        });

        // Update Opportunity
        await updateDoc(doc(db, 'opportunities', editingOpportunity.id), {
          property_id: formData.propertyId || null,
          stage: formData.stage,
          expected_revenue: formData.value,
          updated_at: serverTimestamp()
        });
      } else {
        // 1. Create Lead
        const leadRef = await addDoc(collection(db, 'leads'), {
          organization_id: organization.id,
          assigned_broker_id: user.uid,
          first_name: formData.firstName,
          last_name: formData.lastName,
          interest_temperature: formData.temperature,
          contact_details: {
            email: formData.email,
            phone: formData.phone
          },
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });

        // 2. Create Opportunity
        await addDoc(collection(db, 'opportunities'), {
          organization_id: organization.id,
          lead_id: leadRef.id,
          property_id: formData.propertyId || null,
          stage: formData.stage,
          expected_revenue: formData.value,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      setFormData({
        firstName: '', lastName: '', email: '', phone: '',
        temperature: 'morno', propertyId: '', value: 0, stage: 'Prospeccao'
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar lead/oportunidade:', error);
      alert('Erro ao salvar o lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTempColor = (temp: string) => {
    switch (temp) {
      case 'quente': return 'bg-orange-500';
      case 'morno': return 'bg-yellow-400';
      case 'frio': return 'bg-blue-400';
      default: return 'bg-zinc-300';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 sm:p-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Funil de Vendas</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie seus leads e oportunidades de negócio.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4 sm:p-8 pt-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full min-w-max pb-4">
              {STAGES.map((stage) => (
                <div key={stage.id} className="w-72 sm:w-80 flex flex-col bg-zinc-100/50 rounded-xl border border-zinc-200/60">
                  <div className={cn(
                    "p-4 border-t-4 rounded-t-xl bg-white/50 backdrop-blur-sm flex items-center justify-between",
                    stage.color
                  )}>
                    <h3 className="font-semibold text-zinc-800">{stage.title}</h3>
                    <span className="bg-zinc-200 text-zinc-600 text-xs font-bold px-2 py-1 rounded-full">
                      {opportunities.filter(o => o.stage === stage.id).length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={cn(
                          "flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px] transition-colors",
                          snapshot.isDraggingOver ? "bg-emerald-50/30" : ""
                        )}
                      >
                        {opportunities
                          .filter(o => o.stage === stage.id)
                          .map((opp, index) => (
                            <DraggableAny key={opp.id} draggableId={opp.id} index={index}>
                              {(provided: any, snapshot: any) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "bg-white p-4 rounded-lg shadow-sm border border-zinc-200 hover:border-emerald-300 transition-all group",
                                    snapshot.isDragging ? "shadow-lg ring-2 ring-emerald-500/20 border-emerald-500" : ""
                                  )}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center min-w-0">
                                      <div 
                                        className={cn("w-2 h-2 rounded-full mr-2 shrink-0", getTempColor(opp.lead?.interest_temperature || 'frio'))} 
                                        title={`Temperatura: ${opp.lead?.interest_temperature}`} 
                                      />
                                      <h4 className="font-medium text-zinc-900 text-sm truncate">
                                        {opp.lead?.first_name} {opp.lead?.last_name}
                                      </h4>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <button 
                                        onClick={() => openEditModal(opp)}
                                        className="p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
                                        title="Editar"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(opp.id)}
                                        className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                                        title="Excluir"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-zinc-500 mb-3 truncate">
                                    {opp.property?.title || 'Sem imóvel vinculado'}
                                  </p>
                                  
                                  <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                                    <div className="flex items-center font-medium text-emerald-700">
                                      <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                      {formatCurrency(opp.expected_revenue)}
                                    </div>
                                    <div className="flex items-center text-zinc-400">
                                      <Calendar className="w-3.5 h-3.5 mr-1" />
                                      {opp.created_at?.toDate ? opp.created_at.toDate().toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DraggableAny>
                          ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Modal Novo Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingOpportunity ? 'Editar Oportunidade' : 'Novo Lead / Oportunidade'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="lead-form" onSubmit={handleCreateLead} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome *</label>
                    <input 
                      type="text" required
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Sobrenome</label>
                    <input 
                      type="text"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                      <input 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                      <input 
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Temperatura do Lead</label>
                    <select 
                      value={formData.temperature}
                      onChange={e => setFormData({...formData, temperature: e.target.value as any})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option value="frio">Frio (Apenas curioso)</option>
                      <option value="morno">Morno (Interessado)</option>
                      <option value="quente">Quente (Urgência)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Estágio Inicial</label>
                    <select 
                      value={formData.stage}
                      onChange={e => setFormData({...formData, stage: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-6">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-emerald-600" />
                    Dados da Oportunidade
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Imóvel de Interesse</label>
                      <select 
                        value={formData.propertyId}
                        onChange={e => setFormData({...formData, propertyId: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      >
                        <option value="">Nenhum imóvel selecionado</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Valor Estimado do Negócio</label>
                      <CurrencyInput 
                        value={formData.value}
                        onChangeValue={val => setFormData({...formData, value: val})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center shrink-0">
              <div>
                {editingOpportunity && (
                  <button 
                    type="button"
                    onClick={() => {
                      handleDelete(editingOpportunity.id);
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
                  form="lead-form"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    editingOpportunity ? 'Salvar Oportunidade' : 'Criar Lead'
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
