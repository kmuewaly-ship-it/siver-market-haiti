import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const navigate = useNavigate();

  const getUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        return UserRole.CLIENT;
      }

      // Mapeo de roles de la BD a roles de la app
      const dbRole = data?.role as string;
      if (dbRole === 'admin') return UserRole.ADMIN;
      if (dbRole === 'seller') return UserRole.SELLER;
      // 'user' en BD = 'client' en app
      return UserRole.CLIENT;
    } catch (error) {
      console.error('Error checking user role:', error);
      return UserRole.CLIENT;
    }
  };

  const fetchUserProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email || '',
        name: data.full_name || 'Usuario',
        role: UserRole.CLIENT, // Se obtiene de la tabla user_roles
        avatar_url: data.avatar_url || null,
        banner_url: data.banner_url || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        // Defer profile and role check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            const userRole = await getUserRole(session.user.id);
            
            const appUser: AppUser | null = profile ? {
              ...profile,
              role: userRole,
            } : null;
            
            setUser(appUser);
            setRole(userRole);
            setIsLoading(false);

            // Solo redirigir si es un nuevo login desde una página PROTEGIDA o LOGIN
            if (event === 'SIGNED_IN') {
              const currentPath = window.location.pathname;

              // Si estamos en login, SIEMPRE redirigir
              if (currentPath === '/login') {
                if (userRole === UserRole.SELLER) {
                  navigate('/seller/adquisicion-lotes');
                } else if (userRole === UserRole.ADMIN) {
                  navigate('/admin/dashboard');
                } else {
                  navigate('/');
                }
                return;
              }

              // Páginas públicas donde NO queremos redirigir (si ya estaba ahí)
              // Usamos validación más estricta para evitar que '/' coincida con todo
              const publicPagesPrefixes = ['/marketplace', '/tienda/', '/producto/'];
              const isPublicPage = currentPath === '/' || publicPagesPrefixes.some(page => currentPath.startsWith(page));

              if (isPublicPage) {
                // Usuario se logueó en una página pública, lo dejamos donde está
                return;
              }

              // Si está en una página protegida (que no sea las públicas listadas), redirigir según rol
              if (userRole === UserRole.SELLER) {
                navigate('/seller/adquisicion-lotes');
              } else if (userRole === UserRole.ADMIN) {
                navigate('/admin/dashboard');
              } else {
                navigate('/');
              }
            }
          }, 0);
        } else {
          setUser(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const userRole = await getUserRole(session.user.id);
        
        const appUser: AppUser | null = profile ? {
          ...profile,
          role: userRole,
        } : null;
        
        setUser(appUser);
        setRole(userRole);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
      
      // Marcar como inicializado después de cargar la sesión
      setHasInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [navigate, hasInitialized]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    navigate('/');
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
