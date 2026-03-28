import React, { useState } from 'react';
import { Building2, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setErrorMsg('');
    setIsSubmitting(true);

    let result;
    if (isSignUp) {
      result = await signUpWithEmail(email, password, fullName);
      if (!result.error) {
        alert('Cadastro realizado com sucesso! Se a confirmação de e-mail estiver ativada no Supabase, verifique sua caixa de entrada.');
        setIsSignUp(false);
      }
    } else {
      result = await signInWithEmail(email, password);
    }

    if (result?.error) {
      setErrorMsg(result.error.message);
    }
    setIsSubmitting(false);
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
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 sm:px-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center lg:hidden mb-6">
              <Building2 className="w-10 h-10 text-emerald-600 mr-3" />
              <span className="text-zinc-900 font-bold text-3xl tracking-tight">CorretorPro</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {isSignUp ? 'Crie sua conta' : 'Acesse sua conta'}
            </h2>
            <p className="text-sm text-zinc-500 mt-2">
              {isSignUp ? 'Preencha os dados abaixo para começar' : 'Insira suas credenciais para entrar no sistema'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-zinc-50 focus:bg-white transition-colors"
                    placeholder="João da Silva"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-zinc-50 focus:bg-white transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-zinc-50 focus:bg-white transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {isSubmitting ? 'Aguarde...' : (isSignUp ? 'Criar conta' : 'Entrar')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-zinc-500">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={signInWithGoogle}
                type="button"
                className="w-full flex items-center justify-center px-4 py-3 border border-zinc-300 rounded-xl shadow-sm bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
            >
              {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500">
              Ao continuar, você concorda com nossos <br/>
              <a href="#" className="underline hover:text-zinc-800">Termos de Serviço</a> e <a href="#" className="underline hover:text-zinc-800">Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
