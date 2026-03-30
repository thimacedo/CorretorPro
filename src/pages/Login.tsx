import React, { useState } from 'react';
import { Building2, AlertCircle, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Se estiver carregando o estado de autenticação, mostra um loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se o usuário já estiver logado, redireciona para o Dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthLoading(true);

    try {
      if (isRegistering) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError('Ocorreu um erro ao processar sua solicitação.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding/Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Arquitetura moderna" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-lg px-12">
          <div className="flex items-center mb-8">
            <Building2 className="w-10 h-10 text-emerald-500 mr-4" />
            <span className="text-white font-bold text-3xl tracking-tight">CorretorPro</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            A plataforma definitiva para gestão imobiliária.
          </h1>
          <p className="text-lg text-zinc-300">
            Gerencie seus leads, automatize seu funil de vendas e feche mais negócios com o CRM construído para o mercado imobiliário moderno.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 sm:px-16 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center lg:hidden mb-6">
              <Building2 className="w-10 h-10 text-emerald-600 mr-3" />
              <span className="text-zinc-900 font-bold text-3xl tracking-tight">CorretorPro</span>
            </div>
            <h2 className="text-3xl font-bold text-zinc-900">
              {isRegistering ? 'Criar sua conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-sm text-zinc-500 mt-4">
              {isRegistering 
                ? 'Cadastre-se para começar a gerenciar seus imóveis.' 
                : 'Acesse sua conta para gerenciar seus imóveis e clientes.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center px-4 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isRegistering ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                  {isRegistering ? 'Criar Conta' : 'Entrar'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white text-zinc-400 uppercase tracking-widest font-medium">Ou continue com</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <button 
              onClick={signInWithGoogle}
              type="button"
              className="w-full flex items-center justify-center px-4 py-3.5 border border-zinc-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-zinc-500/10 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div className="text-center">
              <p className="text-sm text-zinc-500">
                Acesso restrito a corretores autorizados.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ao entrar, você concorda com nossos <br/>
              <a href="#" className="underline hover:text-zinc-600">Termos de Serviço</a> e <a href="#" className="underline hover:text-zinc-600">Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
