import React, { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Bed, Bath, Square, X, Home, Building, Map } from 'lucide-react';
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
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { NumberInput } from '../components/ui/NumberInput';

// Tipagem baseada no nosso banco de dados
interface Property {
  id: string;
  title: string;
  description: string;
  property_type: string;
  price: number;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  city: string;
  state: string;
  created_at: any;
}

export default function Properties() {
  const { organization } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado do formulário
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    price: '',
    status: 'available',
    bedrooms: '',
    bathrooms: '',
    area: '',
    city: '',
    state: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca os imóveis no Firestore
  const fetchProperties = async () => {
    if (!organization) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'properties'),
        where('organization_id', '==', organization.id),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      setProperties(data);
    } catch (error) {
      console.error('Erro ao buscar imóveis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [organization]);

  // Filtra os imóveis pela busca
  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description || '',
      property_type: property.property_type,
      price: String(property.price),
      status: property.status,
      bedrooms: property.bedrooms ? String(property.bedrooms) : '',
      bathrooms: property.bathrooms ? String(property.bathrooms) : '',
      area: property.area ? String(property.area) : '',
      city: property.city || '',
      state: property.state || ''
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingProperty(null);
    setFormData({
      title: '', description: '', property_type: 'apartment', price: '',
      status: 'available', bedrooms: '', bathrooms: '', area: '', city: '', state: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'properties', id));
      fetchProperties();
    } catch (error) {
      console.error('Erro ao excluir imóvel:', error);
    }
  };

  // Lida com a submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) {
      alert('Erro: Organização não encontrada. Por favor, atualize a página ou faça login novamente.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const propertyData = {
        organization_id: organization.id,
        title: formData.title,
        description: formData.description,
        property_type: formData.property_type,
        price: Number(formData.price),
        status: formData.status,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        area: formData.area ? Number(formData.area) : null,
        city: formData.city,
        state: formData.state,
        updated_at: serverTimestamp()
      };

      if (editingProperty) {
        await updateDoc(doc(db, 'properties', editingProperty.id), propertyData);
      } else {
        await addDoc(collection(db, 'properties'), {
          ...propertyData,
          created_at: serverTimestamp()
        });
      }

      // Limpa o formulário e fecha o modal
      setIsModalOpen(false);
      
      // Recarrega a lista
      fetchProperties();
    } catch (error) {
      console.error('Erro ao salvar imóvel:', error);
      alert('Erro ao salvar o imóvel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'house': return <Home className="w-4 h-4" />;
      case 'apartment': return <Building className="w-4 h-4" />;
      case 'land': return <Map className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  const getPropertyTypeName = (type: string) => {
    switch (type) {
      case 'house': return 'Casa';
      case 'apartment': return 'Apartamento';
      case 'commercial': return 'Comercial';
      case 'land': return 'Terreno';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">Disponível</span>;
      case 'sold':
        return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Vendido</span>;
      case 'rented':
        return <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Alugado</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-800 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Imóveis</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie o portfólio de imóveis da sua imobiliária.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Buscar imóveis..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Imóvel
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 mb-2">Nenhum imóvel encontrado</h3>
          <p className="text-zinc-500 mb-6 max-w-md mx-auto">
            {searchTerm ? 'Não encontramos nenhum imóvel com esse termo de busca.' : 'Você ainda não cadastrou nenhum imóvel no seu portfólio.'}
          </p>
          {!searchTerm && (
            <button 
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Imóvel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col relative">
              {/* Actions Overlay */}
              <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(property); }}
                  className="p-2 bg-white/90 backdrop-blur-sm text-zinc-600 hover:text-emerald-600 rounded-lg shadow-sm transition-colors"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(property.id); }}
                  className="p-2 bg-white/90 backdrop-blur-sm text-zinc-600 hover:text-red-600 rounded-lg shadow-sm transition-colors"
                  title="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>

              {/* Image Placeholder */}
              <div className="h-48 bg-zinc-200 relative overflow-hidden">
                <img 
                  src={`https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`} 
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {getStatusBadge(property.status)}
                  <span className="px-2.5 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm text-zinc-800 rounded-full flex items-center shadow-sm">
                    {getPropertyTypeIcon(property.property_type)}
                    <span className="ml-1.5">{getPropertyTypeName(property.property_type)}</span>
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <span className="px-3 py-1.5 text-sm font-bold bg-zinc-900/90 backdrop-blur-sm text-white rounded-lg shadow-sm">
                    {formatCurrency(property.price)}
                  </span>
                </div>
              </div>
              
              {/* Details */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-zinc-900 mb-1 line-clamp-1" title={property.title}>
                  {property.title}
                </h3>
                <div className="flex items-center text-zinc-500 text-sm mb-4">
                  <MapPin className="w-4 h-4 mr-1 shrink-0" />
                  <span className="truncate">{property.city}{property.state ? ` - ${property.state}` : ''}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-zinc-100 flex items-center justify-between text-zinc-600 text-sm">
                  <div className="flex items-center" title="Quartos">
                    <Bed className="w-4 h-4 mr-1.5 text-zinc-400" />
                    <span>{property.bedrooms || '-'}</span>
                  </div>
                  <div className="flex items-center" title="Banheiros">
                    <Bath className="w-4 h-4 mr-1.5 text-zinc-400" />
                    <span>{property.bathrooms || '-'}</span>
                  </div>
                  <div className="flex items-center" title="Área">
                    <Square className="w-4 h-4 mr-1.5 text-zinc-400" />
                    <span>{property.area ? `${property.area}m²` : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingProperty ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Básicas */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-4 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-2">1</span>
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Título do Anúncio *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Ex: Lindo apartamento no centro"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Imóvel *</label>
                      <select 
                        required
                        value={formData.property_type}
                        onChange={e => setFormData({...formData, property_type: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                      >
                        <option value="apartment">Apartamento</option>
                        <option value="house">Casa</option>
                        <option value="commercial">Comercial</option>
                        <option value="land">Terreno</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Preço (R$) *</label>
                      <CurrencyInput 
                        required
                        value={formData.price}
                        onChangeValue={val => setFormData({...formData, price: String(val)})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
                      <textarea 
                        rows={3}
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                        placeholder="Descreva os detalhes do imóvel..."
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-200" />

                {/* Características */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-4 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-2">2</span>
                    Características
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Quartos</label>
                      <NumberInput 
                        value={formData.bedrooms}
                        onChangeValue={val => setFormData({...formData, bedrooms: String(val)})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Ex: 3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Banheiros</label>
                      <NumberInput 
                        value={formData.bathrooms}
                        onChangeValue={val => setFormData({...formData, bathrooms: String(val)})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Ex: 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Área (m²)</label>
                      <NumberInput 
                        value={formData.area}
                        onChangeValue={val => setFormData({...formData, area: String(val)})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Ex: 120"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-200" />

                {/* Localização */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-4 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs mr-2">3</span>
                    Localização e Status
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Cidade *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Ex: São Paulo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Estado (UF) *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={2}
                        value={formData.state}
                        onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase"
                        placeholder="SP"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Status do Imóvel *</label>
                      <select 
                        required
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                      >
                        <option value="available">Disponível para Venda/Locação</option>
                        <option value="sold">Vendido</option>
                        <option value="rented">Alugado</option>
                        <option value="unavailable">Indisponível</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center shrink-0">
              <div>
                {editingProperty && (
                  <button 
                    type="button"
                    onClick={() => {
                      handleDelete(editingProperty.id);
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
                  form="property-form"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    editingProperty ? 'Salvar Alterações' : 'Cadastrar Imóvel'
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
