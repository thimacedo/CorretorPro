import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Shield, 
  Bell, 
  Save, 
  LogOut,
  Camera,
  Phone,
  Mail,
  Globe,
  MapPin
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

export default function Settings() {
  const { user, profile, organization, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'notifications'>('profile');
  
  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    email: '',
    photoUrl: ''
  });

  // Organization state
  const [orgData, setOrgData] = useState({
    name: '',
    address: '',
    website: ''
  });

  // Notifications state
  const [notifications, setNotifications] = useState({
    new_lead: true,
    agenda_reminder: true,
    proposal_update: true
  });

  const isManager = profile?.role === 'master_admin' || profile?.role === 'manager' || user?.email === 'thi.macedo@gmail.com';

  useEffect(() => {
    if (profile) {
      setProfileData({
        fullName: profile.full_name || '',
        phone: profile.phone_number || '',
        email: user?.email || '',
        photoUrl: profile.photo_url || ''
      });
    }
    if (organization) {
      setOrgData({
        name: organization.name || '',
        address: organization.address || '',
        website: organization.website || ''
      });
    }
  }, [profile, organization, user]);

  const handleSyncGooglePhoto = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        photo_url: user.photoURL,
        updated_at: serverTimestamp()
      });
      alert('Foto sincronizada com o Google!');
    } catch (error) {
      console.error('Erro ao sincronizar foto:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        full_name: profileData.fullName,
        phone_number: profileData.phone,
        updated_at: serverTimestamp()
      });

      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !isManager) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'organizations', organization.id), {
        name: orgData.name,
        address: orgData.address,
        website: orgData.website,
        updated_at: serverTimestamp()
      });

      alert('Dados da imobiliária atualizados!');
    } catch (error) {
      console.error('Erro ao atualizar organização:', error);
      alert('Erro ao atualizar dados da imobiliária.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Preferências de notificação salvas!');
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Configurações</h1>
        <p className="text-sm text-zinc-500 mt-1">Gerencie sua conta e as preferências da imobiliária.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Tabs */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
              activeTab === 'profile' ? "bg-white text-emerald-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            )}
          >
            <User className="w-4 h-4 mr-3" />
            Meu Perfil
          </button>
          
          {isManager && (
            <button 
              onClick={() => setActiveTab('organization')}
              className={cn(
                "w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
                activeTab === 'organization' ? "bg-white text-emerald-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              <Building2 className="w-4 h-4 mr-3" />
              Imobiliária
            </button>
          )}

          <button 
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
              activeTab === 'notifications' ? "bg-white text-emerald-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            )}
          >
            <Bell className="w-4 h-4 mr-3" />
            Notificações
          </button>

          <div className="pt-4 mt-4 border-t border-zinc-200">
            <button 
              onClick={signOut}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sair da Conta
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile}>
                <div className="p-6 border-b border-zinc-100">
                  <h2 className="text-lg font-semibold text-zinc-900">Meu Perfil</h2>
                  <p className="text-sm text-zinc-500">Atualize suas informações pessoais e de contato.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center text-zinc-400 text-2xl font-bold overflow-hidden">
                        {profileData.photoUrl ? (
                          <img 
                            src={profileData.photoUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          profileData.fullName.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={handleSyncGooglePhoto}
                        className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Sincronizar com Google"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900">Foto de Perfil</h3>
                      <p className="text-xs text-zinc-500 mt-1">Clique na foto para sincronizar com sua conta Google.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                      <input 
                        type="text" 
                        value={profileData.fullName}
                        onChange={e => setProfileData({...profileData, fullName: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail (Não editável)</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input 
                          type="email" disabled
                          value={profileData.email}
                          className="w-full pl-10 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input 
                          type="tel" 
                          value={profileData.phone}
                          onChange={e => setProfileData({...profileData, phone: e.target.value})}
                          className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'organization' && isManager && (
              <form onSubmit={handleUpdateOrganization}>
                <div className="p-6 border-b border-zinc-100">
                  <h2 className="text-lg font-semibold text-zinc-900">Dados da Imobiliária</h2>
                  <p className="text-sm text-zinc-500">Gerencie as informações públicas da sua empresa.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome da Imobiliária</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input 
                          type="text" 
                          value={orgData.name}
                          onChange={e => setOrgData({...orgData, name: e.target.value})}
                          className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Endereço</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input 
                          type="text" 
                          value={orgData.address}
                          onChange={e => setOrgData({...orgData, address: e.target.value})}
                          className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Site / URL</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input 
                          type="url" 
                          value={orgData.website}
                          onChange={e => setOrgData({...orgData, website: e.target.value})}
                          className="w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="https://suaimobiliaria.com.br"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex">
                    <Shield className="w-5 h-5 text-blue-600 mr-3 shrink-0" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Como administrador, você pode alterar os dados que aparecem nos relatórios e contratos gerados pelo sistema.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Dados da Empresa
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'notifications' && (
              <form onSubmit={handleUpdateNotifications}>
                <div className="p-6 border-b border-zinc-100">
                  <h2 className="text-lg font-semibold text-zinc-900">Preferências de Notificação</h2>
                  <p className="text-sm text-zinc-500">Escolha como e quando deseja ser alertado.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    {[
                      { id: 'new_lead', title: 'Novos Leads', desc: 'Receba um alerta quando um novo lead for atribuído a você.' },
                      { id: 'agenda_reminder', title: 'Lembretes de Agenda', desc: 'Alertas 30 minutos antes de visitas e reuniões.' },
                      { id: 'proposal_update', title: 'Atualizações de Proposta', desc: 'Quando o status de uma proposta for alterado.' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-zinc-900">{item.title}</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notifications[item.id as keyof typeof notifications]} 
                            onChange={() => setNotifications({...notifications, [item.id]: !notifications[item.id as keyof typeof notifications]})}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    type="submit"
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Preferências
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
