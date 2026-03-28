import React from 'react';
import { TrendingUp, Users, Home, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const stats = [
  { name: 'Receita Prevista', value: 'R$ 2.4M', change: '+12.5%', trend: 'up', icon: DollarSign },
  { name: 'Leads Ativos', value: '342', change: '+18.2%', trend: 'up', icon: Users },
  { name: 'Imóveis Captados', value: '1,204', change: '-2.4%', trend: 'down', icon: Home },
  { name: 'Taxa de Conversão', value: '4.2%', change: '+1.1%', trend: 'up', icon: TrendingUp },
];

const recentLeads = [
  { id: 1, name: 'Carlos Eduardo', status: 'Quente', property: 'Apartamento 3Q - Jardins', broker: 'Ana Silva', date: 'Hoje, 10:42' },
  { id: 2, name: 'Mariana Costa', status: 'Morno', property: 'Casa de Condomínio - Alphaville', broker: 'João Santos', date: 'Hoje, 09:15' },
  { id: 3, name: 'Roberto Almeida', status: 'Quente', property: 'Cobertura Duplex - Centro', broker: 'Ana Silva', date: 'Ontem, 16:30' },
  { id: 4, name: 'Fernanda Lima', status: 'Frio', property: 'Lote 360m² - Portal do Sol', broker: 'Marcos Paulo', date: 'Ontem, 14:20' },
];

export default function Dashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Visão Geral</h1>
        <p className="text-sm text-zinc-500 mt-1">Acompanhe as métricas principais da sua imobiliária.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className={stat.trend === 'up' ? 'text-emerald-600 flex items-center text-sm font-medium' : 'text-red-600 flex items-center text-sm font-medium'}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-zinc-500 text-sm font-medium">{stat.name}</h3>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity & Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">Leads Recentes</h2>
            <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50/50 border-y border-zinc-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Interesse</th>
                  <th className="px-4 py-3 font-medium">Imóvel Alvo</th>
                  <th className="px-4 py-3 font-medium">Corretor</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900">{lead.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                        ${lead.status === 'Quente' ? 'bg-orange-100 text-orange-700' : 
                          lead.status === 'Morno' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{lead.property}</td>
                    <td className="px-4 py-3 text-zinc-600">{lead.broker}</td>
                    <td className="px-4 py-3 text-zinc-500">{lead.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Funil Atual</h2>
          <div className="space-y-4">
            {[
              { stage: 'Prospecção', count: 145, color: 'bg-zinc-200' },
              { stage: 'Visita', count: 89, color: 'bg-blue-200' },
              { stage: 'Proposta', count: 34, color: 'bg-yellow-200' },
              { stage: 'Documentação', count: 12, color: 'bg-orange-200' },
              { stage: 'Fechamento', count: 8, color: 'bg-emerald-400' },
            ].map((item, index) => (
              <div key={item.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-zinc-700">{item.stage}</span>
                  <span className="text-zinc-500">{item.count}</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.max((item.count / 145) * 100, 5)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
