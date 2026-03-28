import React, { useState } from 'react';
import { Plus, MoreHorizontal, Calendar, DollarSign } from 'lucide-react';

const initialColumns = [
  { id: 'prospeccao', title: 'Prospecção', color: 'border-zinc-300' },
  { id: 'visita', title: 'Visita', color: 'border-blue-300' },
  { id: 'proposta', title: 'Proposta', color: 'border-yellow-300' },
  { id: 'documentacao', title: 'Documentação', color: 'border-orange-300' },
  { id: 'fechamento', title: 'Fechamento', color: 'border-emerald-400' },
];

const initialCards = [
  { id: 1, title: 'Carlos Eduardo', property: 'Apt 3Q Jardins', value: 'R$ 850.000', column: 'prospeccao', temp: 'quente' },
  { id: 2, title: 'Mariana Costa', property: 'Casa Alphaville', value: 'R$ 2.100.000', column: 'visita', temp: 'morno' },
  { id: 3, title: 'Roberto Almeida', property: 'Cobertura Centro', value: 'R$ 1.450.000', column: 'proposta', temp: 'quente' },
  { id: 4, title: 'Fernanda Lima', property: 'Lote 360m²', value: 'R$ 320.000', column: 'documentacao', temp: 'frio' },
  { id: 5, title: 'João Pedro', property: 'Studio Bueno', value: 'R$ 410.000', column: 'prospeccao', temp: 'morno' },
];

export default function CRM() {
  const [cards, setCards] = useState(initialCards);

  const getTempColor = (temp: string) => {
    switch (temp) {
      case 'quente': return 'bg-orange-500';
      case 'morno': return 'bg-yellow-400';
      case 'frio': return 'bg-blue-400';
      default: return 'bg-zinc-300';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-8 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Funil de Vendas</h1>
          <p className="text-sm text-zinc-500 mt-1">Arraste os cards para atualizar o status das negociações.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-8 pt-4">
        <div className="flex gap-6 h-full min-w-max">
          {initialColumns.map((col) => (
            <div key={col.id} className="w-80 flex flex-col bg-zinc-100/50 rounded-xl border border-zinc-200/60">
              <div className={`p-4 border-t-4 ${col.color} rounded-t-xl bg-white/50 backdrop-blur-sm flex items-center justify-between`}>
                <h3 className="font-semibold text-zinc-800">{col.title}</h3>
                <span className="bg-zinc-200 text-zinc-600 text-xs font-bold px-2 py-1 rounded-full">
                  {cards.filter(c => c.column === col.id).length}
                </span>
              </div>
              
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {cards.filter(c => c.column === col.id).map(card => (
                  <div key={card.id} className="bg-white p-4 rounded-lg shadow-sm border border-zinc-200 cursor-grab hover:border-emerald-300 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getTempColor(card.temp)}`} title={`Temperatura: ${card.temp}`} />
                        <h4 className="font-medium text-zinc-900 text-sm">{card.title}</h4>
                      </div>
                      <button className="text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">{card.property}</p>
                    <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                      <div className="flex items-center font-medium text-emerald-700">
                        <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                        {card.value}
                      </div>
                      <div className="flex items-center text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        Hoje
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
