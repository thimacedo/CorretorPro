import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { Shield, Users, CheckCircle2, AlertCircle, ArrowLeft, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Seed() {
  const { organization, profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const isMaster = profile?.role === 'master_admin' || user?.email === 'thi.macedo@gmail.com';

  const createTestData = async () => {
    if (!organization) {
      setStatus({ 
        type: 'error', 
        message: 'Você precisa ter uma organização vinculada para criar dados de teste.' 
      });
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      // 1. Criar Usuários de Teste (apenas no Firestore)
      const testUsers = [
        { full_name: 'Gestor de Teste', email: 'gestor@teste.com', role: 'manager', tenant_id: organization.id, is_pending: true },
        { full_name: 'Corretor de Teste', email: 'corretor@teste.com', role: 'broker', tenant_id: organization.id, is_pending: true }
      ];

      const userRefs: string[] = [];
      for (const u of testUsers) {
        // Verifica se já existe antes de criar
        const q = query(collection(db, 'users'), where('email', '==', u.email));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          const docRef = await addDoc(collection(db, 'users'), {
            ...u,
            created_at: serverTimestamp(),
            is_test_user: true
          });
          userRefs.push(docRef.id);
        } else {
          userRefs.push(snap.docs[0].id);
        }
      }

      // 2. Criar Imóveis de Teste
      const testProperties = [
        {
          title: 'Apartamento Decorado no Centro',
          description: 'Lindo apartamento mobiliado com vista para a cidade.',
          property_type: 'apartment',
          price: 450000,
          status: 'available',
          bedrooms: 2,
          bathrooms: 2,
          area: 75,
          city: 'São Paulo',
          state: 'SP',
          organization_id: organization.id
        },
        {
          title: 'Casa de Condomínio de Luxo',
          description: 'Casa espaçosa com piscina e área gourmet.',
          property_type: 'house',
          price: 1250000,
          status: 'available',
          bedrooms: 4,
          bathrooms: 5,
          area: 320,
          city: 'Campinas',
          state: 'SP',
          organization_id: organization.id
        }
      ];

      const propertyRefs: string[] = [];
      for (const p of testProperties) {
        const docRef = await addDoc(collection(db, 'properties'), {
          ...p,
          created_at: serverTimestamp()
        });
        propertyRefs.push(docRef.id);
      }

      // 3. Criar Leads de Teste
      const testLeads = [
        {
          first_name: 'João',
          last_name: 'Silva',
          email: 'joao.silva@teste.com',
          phone: '(11) 99999-8888',
          interest_temperature: 'quente',
          origin_source: 'Site',
          assigned_broker_id: userRefs[1], // Atribuído ao corretor de teste
          organization_id: organization.id
        },
        {
          first_name: 'Maria',
          last_name: 'Oliveira',
          email: 'maria.oliveira@teste.com',
          phone: '(11) 97777-6666',
          interest_temperature: 'morno',
          origin_source: 'Instagram',
          assigned_broker_id: profile.id, // Atribuído ao usuário atual
          organization_id: organization.id
        }
      ];

      for (const l of testLeads) {
        await addDoc(collection(db, 'leads'), {
          ...l,
          created_at: serverTimestamp()
        });
      }

      setStatus({ 
        type: 'success', 
        message: 'Dados de teste criados com sucesso! Usuários, imóveis e leads foram adicionados à sua organização.' 
      });
    } catch (error: any) {
      console.error('Erro ao criar dados de teste:', error);
      setStatus({ type: 'error', message: `Erro: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const releaseTestManagerAccess = async () => {
    setLoading(true);
    setStatus(null);
    try {
      if (!organization) throw new Error('Organização não encontrada.');

      // 1. Criar/Garantir documento no Firestore
      const q = query(collection(db, 'users'), where('email', '==', 'gestor@teste.com'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await addDoc(collection(db, 'users'), {
          full_name: 'Gestor de Teste',
          email: 'gestor@teste.com',
          role: 'manager',
          tenant_id: organization.id,
          is_pending: true,
          created_at: serverTimestamp(),
          is_test_user: true
        });
      }

      // 2. Criar conta de autenticação
      const { signUpWithEmail: firebaseSignUpWithEmail, logout: firebaseLogout } = await import('../lib/firebase');
      try {
        await firebaseSignUpWithEmail('gestor@teste.com', 'teste123');
        await firebaseLogout();
        setStatus({ 
          type: 'success', 
          message: 'Acesso liberado para gestor@teste.com (senha: teste123). Você foi deslogado para segurança.' 
        });
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setStatus({ 
            type: 'success', 
            message: 'Acesso já estava liberado para gestor@teste.com.' 
          });
        } else {
          throw err;
        }
      }
    } catch (error: any) {
      console.error('Erro ao liberar acesso:', error);
      setStatus({ type: 'error', message: `Erro: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (!isMaster) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-zinc-900">Acesso Negado</h1>
        <p className="text-zinc-500 mt-2">Apenas administradores master podem acessar esta página.</p>
        <Link to="/" className="inline-block mt-6 text-emerald-600 font-medium hover:underline">Voltar ao Início</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link to="/team" className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Equipe
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Gerador de Dados de Teste</h1>
        <p className="text-sm text-zinc-500 mt-1">Crie rapidamente dados fictícios para testar as funcionalidades do sistema no Firebase.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-emerald-600" />
            Popular Banco de Dados
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Clique no botão abaixo para gerar uma estrutura completa de teste na sua organização.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 flex items-center mb-2">
              <Shield className="w-4 h-4 mr-2" />
              O que será criado?
            </h3>
            <ul className="text-xs text-blue-800 space-y-2 list-disc list-inside">
              <li>2 Usuários de teste (Gestor e Corretor)</li>
              <li>2 Imóveis de teste (Apartamento e Casa)</li>
              <li>2 Leads de teste com atribuições variadas</li>
            </ul>
          </div>

          {status && (
            <div className={cn(
              "p-4 rounded-xl flex items-start",
              status.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"
            )}>
              {status.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              )}
              <div className="text-sm">
                <p className="font-bold">{status.type === 'success' ? 'Sucesso!' : 'Erro'}</p>
                <p className="mt-1">{status.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row gap-3 justify-end">
          <button 
            onClick={releaseTestManagerAccess}
            disabled={loading}
            className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              'Liberar Acesso Gestor Teste'
            )}
          </button>
          <button 
            onClick={createTestData}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Gerando Dados...
              </>
            ) : (
              'Gerar Dados de Teste'
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-zinc-50 rounded-2xl border border-zinc-200">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center mb-2">
          <AlertCircle className="w-4 h-4 mr-2 text-zinc-500" />
          Observação Importante
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Os usuários de teste criados aqui são apenas registros no banco de dados para fins de visualização e atribuição. 
          Eles não possuem contas de autenticação reais. Para testar o login com diferentes usuários, você deve usar contas Google reais.
        </p>
      </div>
    </div>
  );
}
