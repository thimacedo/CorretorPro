import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  X,
  User as UserIcon
} from 'lucide-react';
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

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  photo_url?: string;
  role: 'master_admin' | 'manager' | 'broker' | 'read_only';
  created_at: any;
  phone_number?: string;
  manager_id?: string;
}

const ROLE_LABELS = {
  master_admin: { label: 'Administrador Master', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  manager: { label: 'Gerente', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  broker: { label: 'Corretor', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  read_only: { label: 'Apenas Leitura', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
};

export default function Team() {
  const { organization, profile, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isManager = profile?.role === 'master_admin' || profile?.role === 'manager' || user?.email === 'thi.macedo@gmail.com';
  const isBroker = profile?.role === 'broker';
  const canInvite = isManager || isBroker;

  const fetchMembers = async () => {
    if (!organization) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('tenant_id', '==', organization.id)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
      setMembers(data);
    } catch (error) {
      console.error('Erro ao buscar membros da equipe:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [organization]);

  const filteredMembers = members.filter(member => 
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Minha Equipe</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie os corretores e administradores da sua imobiliária.</p>
        </div>
        
        {canInvite && (
          <div className="flex items-center gap-3">
            {isManager && (
              <Link 
                to="/seed"
                className="text-zinc-500 hover:text-zinc-900 text-sm font-medium transition-colors"
              >
                Gerar Dados de Teste
              </Link>
            )}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isManager ? 'Adicionar Membro' : 'Convidar Corretor'}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{members.length}</p>
          <p className="text-sm text-zinc-500">Total de membros</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Gestão</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            {members.filter(m => m.role === 'master_admin' || m.role === 'manager').length}
          </p>
          <p className="text-sm text-zinc-500">Administradores e Gerentes</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Vendas</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            {members.filter(m => m.role === 'broker').length}
          </p>
          <p className="text-sm text-zinc-500">Corretores ativos</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Membro</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Equipe / Gestor</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Desde</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-medium border border-zinc-200 overflow-hidden">
                          {member.photo_url ? (
                            <img 
                              src={member.photo_url} 
                              alt={member.full_name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            member.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-semibold text-zinc-900">{member.full_name}</p>
                          <p className="text-xs text-zinc-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        ROLE_LABELS[member.role].color
                      )}>
                        {ROLE_LABELS[member.role].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.role === 'broker' ? (
                        <div className="flex items-center text-xs text-zinc-600">
                          <Shield className="w-3 h-3 mr-1.5 text-blue-500" />
                          {members.find(m => m.id === member.manager_id)?.full_name || (
                            <span className="text-zinc-400 italic">Sem gestor</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-zinc-600">
                          <Mail className="w-3 h-3 mr-1.5 text-zinc-400" />
                          {member.email}
                        </div>
                        {member.phone_number && (
                          <div className="flex items-center text-xs text-zinc-600">
                            <Clock className="w-3 h-3 mr-1.5 text-zinc-400" />
                            {member.phone_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {member.created_at?.toDate ? member.created_at.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedMember(member);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Membro"
                        >
                          <UserIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Convidar / Cadastrar / Editar */}
      {isModalOpen && (
        <TeamMemberModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMember(null);
          }} 
          isManager={isManager}
          organization={organization}
          onSuccess={fetchMembers}
          members={members}
          member={selectedMember}
        />
      )}
    </div>
  );
}

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  isManager: boolean;
  organization: any;
  onSuccess: () => void;
  members: TeamMember[];
  member?: TeamMember | null;
}

function TeamMemberModal({ isOpen, onClose, isManager, organization, onSuccess, members, member }: TeamMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'broker' as any,
    manager_id: ''
  });

  useEffect(() => {
    if (member) {
      setFormData({
        email: member.email,
        fullName: member.full_name,
        role: member.role,
        manager_id: member.manager_id || ''
      });
    }
  }, [member]);

  const managers = members.filter(m => (m.role === 'master_admin' || m.role === 'manager') && m.id !== member?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (member) {
        // Update existing member
        const memberRef = doc(db, 'users', member.id);
        await updateDoc(memberRef, {
          full_name: formData.fullName,
          role: formData.role,
          manager_id: formData.role === 'broker' ? formData.manager_id : null,
        });
        alert('Membro atualizado com sucesso!');
      } else {
        // Create new member
        const q = query(collection(db, 'users'), where('email', '==', formData.email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          throw new Error('Já existe um usuário cadastrado com este e-mail.');
        }

        await addDoc(collection(db, 'users'), {
          full_name: formData.fullName,
          email: formData.email,
          role: formData.role,
          manager_id: formData.role === 'broker' ? formData.manager_id : null,
          tenant_id: organization.id,
          created_at: serverTimestamp(),
          is_pending: true
        });
        alert('Usuário adicionado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao processar membro:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            {member ? 'Editar Membro' : 'Adicionar à Equipe'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {!member && (
              <p className="text-sm text-zinc-500">
                Adicione um novo membro à sua imobiliária. Ele deve usar o login do Google com o e-mail informado abaixo.
              </p>
            )}
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  required
                  placeholder="Nome do corretor"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="email" 
                  required
                  disabled={!!member}
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-zinc-50 disabled:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Cargo</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="broker">Corretor</option>
                <option value="manager">Gerente</option>
                <option value="read_only">Apenas Leitura</option>
              </select>
            </div>

            {formData.role === 'broker' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Gestor Responsável (Equipe)</label>
                <select 
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Nenhum (Sem equipe)</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div className="flex">
                <Shield className="w-5 h-5 text-emerald-600 mr-3 shrink-0" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  O usuário será associado à organização {organization?.name} assim que fizer o primeiro login.
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processando...' : member ? 'Salvar Alterações' : 'Adicionar Membro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
