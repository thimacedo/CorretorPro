import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle as firebaseSignInWithGoogle, logout as firebaseLogout } from './firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  organization: any | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserProfile = async (currentUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userData: any;
      let orgId: string | null = null;
      let role: string = 'broker';

      if (!userDoc.exists()) {
        const email = currentUser.email;
        const fullName = currentUser.displayName || email?.split('@')[0] || 'Corretor';

        // Verifica se já existe um documento pré-cadastrado por e-mail
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // Usa o documento existente e associa ao UID do Firebase
          const existingDoc = snapshot.docs[0];
          const existingData = existingDoc.data();
          
          userData = {
            ...existingData,
            id: currentUser.uid,
            full_name: currentUser.displayName || existingData.full_name,
            photo_url: currentUser.photoURL || existingData.photo_url || null,
            is_pending: false,
            updated_at: serverTimestamp()
          };

          // Remove o documento antigo (com ID aleatório) e cria o novo com o UID
          await deleteDoc(doc(db, 'users', existingDoc.id));
          await setDoc(userDocRef, userData);
          
          orgId = userData.tenant_id;
          role = userData.role;
        } else {
          // Lógica restrita: apenas o superuser pode criar sua própria organização inicial
          // Outros usuários devem ser pré-cadastrados por um gestor
          if (email === 'thi.macedo@gmail.com') {
            const orgsQuery = query(collection(db, 'organizations'), where('cnpj', '==', '00.000.000/0001-00'));
            const orgsSnapshot = await getDocs(orgsQuery);
            
            if (orgsSnapshot.empty) {
              const newOrgRef = doc(collection(db, 'organizations'));
              orgId = newOrgRef.id;
              await setDoc(newOrgRef, {
                name: 'CorretorPro Matriz',
                cnpj: '00.000.000/0001-00',
                subscription_tier: 'premium',
                slug: 'corretorpro-matriz',
                created_at: serverTimestamp()
              });
            } else {
              orgId = orgsSnapshot.docs[0].id;
            }
            role = 'master_admin';

            userData = {
              id: currentUser.uid,
              full_name: fullName,
              email: email,
              photo_url: currentUser.photoURL || null,
              role: role,
              tenant_id: orgId,
              created_at: serverTimestamp()
            };

            await setDoc(userDocRef, userData);
          } else {
            // Usuário não autorizado (não pré-cadastrado e não é o superuser)
            console.warn(`Acesso negado para ${email}: usuário não pré-cadastrado.`);
            setProfile(null);
            setOrganization(null);
            // Podemos opcionalmente fazer logout automático ou mostrar tela de erro
            return;
          }
        }
      } else {
        userData = userDoc.data();
        orgId = userData.tenant_id;
        role = userData.role;
      }

      setProfile(userData);

      if (orgId) {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          setOrganization({ id: orgDoc.id, ...orgDoc.data() });
        }
      }
    } catch (error: any) {
      console.error('Erro na sincronização do perfil:', error);
      
      // Error handling spec for Firestore operations
      if (error.message?.includes('Missing or insufficient permissions')) {
        const errInfo = {
          error: error.message,
          operationType: 'get/write',
          path: 'users/organizations',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            tenantId: (auth.currentUser as any)?.tenantId,
            providerInfo: auth.currentUser?.providerData.map(provider => ({
              providerId: provider.providerId,
              displayName: provider.displayName,
              email: provider.email,
              photoUrl: provider.photoURL
            })) || []
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
      }
    }
  };

  const refreshAuth = async () => {
    if (user) {
      await syncUserProfile(user);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setProfile(null);
        setOrganization(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await firebaseSignInWithGoogle();
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const { signInWithEmail: firebaseSignInWithEmail } = await import('./firebase');
      await firebaseSignInWithEmail(email, pass);
    } catch (error) {
      console.error('Erro ao fazer login com e-mail:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const { signUpWithEmail: firebaseSignUpWithEmail } = await import('./firebase');
      await firebaseSignUpWithEmail(email, pass);
    } catch (error) {
      console.error('Erro ao cadastrar com e-mail:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, organization, loading, refreshAuth, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
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
