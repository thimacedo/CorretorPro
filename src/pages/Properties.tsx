import React from 'react';
import { Search, Filter, MapPin, Bed, Bath, Square, Plus } from 'lucide-react';

const properties = [
  {
    id: 1,
    title: 'Apartamento Alto Padrão - Jardins',
    type: 'Venda',
    price: 'R$ 2.450.000',
    location: 'Jardins, São Paulo - SP',
    beds: 3,
    baths: 4,
    area: 180,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    title: 'Casa de Condomínio - Alphaville',
    type: 'Venda',
    price: 'R$ 4.200.000',
    location: 'Alphaville, Barueri - SP',
    beds: 4,
    baths: 5,
    area: 420,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    title: 'Studio Moderno - Pinheiros',
    type: 'Locação',
    price: 'R$ 4.500/mês',
    location: 'Pinheiros, São Paulo - SP',
    beds: 1,
    baths: 1,
    area: 45,
    image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4,
    title: 'Cobertura Duplex com Piscina',
    type: 'Venda',
    price: 'R$ 6.800.000',
    location: 'Itaim Bibi, São Paulo - SP',
    beds: 4,
    baths: 6,
    area: 320,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }
];

export default function Properties() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Inventário de Imóveis</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie as propriedades disponíveis para venda e locação.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Imóvel
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mb-8 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Buscar por código, título ou endereço..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 outline-none focus:border-emerald-500">
            <option>Todos os Tipos</option>
            <option>Venda</option>
            <option>Locação</option>
          </select>
          <select className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 outline-none focus:border-emerald-500">
            <option>Qualquer Valor</option>
            <option>Até R$ 500k</option>
            <option>R$ 500k - R$ 1M</option>
            <option>Acima de R$ 1M</option>
          </select>
          <button className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-200 flex items-center transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Mais Filtros
          </button>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {properties.map((property) => (
          <div key={property.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
            <div className="relative h-48 overflow-hidden">
              <img 
                src={property.image} 
                alt={property.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${
                  property.type === 'Venda' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {property.type}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-3">
                <h3 className="font-semibold text-zinc-900 text-base line-clamp-1" title={property.title}>
                  {property.title}
                </h3>
                <div className="flex items-center text-zinc-500 text-xs mt-1.5">
                  <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span className="truncate">{property.location}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-3 border-y border-zinc-100 mb-3">
                <div className="flex items-center text-zinc-600 text-sm" title="Quartos">
                  <Bed className="w-4 h-4 mr-1.5 text-zinc-400" />
                  {property.beds}
                </div>
                <div className="flex items-center text-zinc-600 text-sm" title="Banheiros">
                  <Bath className="w-4 h-4 mr-1.5 text-zinc-400" />
                  {property.baths}
                </div>
                <div className="flex items-center text-zinc-600 text-sm" title="Área Útil">
                  <Square className="w-4 h-4 mr-1.5 text-zinc-400" />
                  {property.area}m²
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-emerald-700">{property.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
