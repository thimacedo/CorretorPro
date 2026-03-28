import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  organization: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSession = async (currentSession: Session | null) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      // 1. Chama a RPC para sincronizar o usuário e criar a organização se for o primeiro login (ex: thi.macedo@gmail.com)
      const { error: syncError } = await supabase.rpc('sync_user_profile');
      if (syncError) console.error('Erro ao sincronizar perfil (RPC):', syncError);

      // 2. Busca os dados completos do usuário e da organização
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          organization_members (
            role,
            organizations (*)
          )
        `)
        .eq('id', currentSession.user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError);
      } else if (userData) {
        setProfile(userData);
        if (userData.organization_members && userData.organization_members.length > 0) {
          setOrganization(userData.organization_members[0].organizations);
        }
      }
    } else {
      setProfile(null);
      setOrganization(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Busca a sessão atual no carregamento inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Escuta mudanças de estado da autenticação (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Erro ao fazer login com Google:', error.message);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) console.error('Erro ao fazer login com email:', error.message);
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    if (error) console.error('Erro ao fazer cadastro:', error.message);
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Erro ao fazer logout:', error.message);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, organization, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
