import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type User } from '../service';

const AUTH_STORAGE_KEY = 'referrer_ai.auth.user';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void api.users.getById(user.id).catch(() => {
      if (cancelled) return;
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const loginWithGoogleCredential = async (credential: string) => {
    const result = await api.users.loginWithGoogle({ credential });
    setUser(result.user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loginWithGoogleCredential,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
