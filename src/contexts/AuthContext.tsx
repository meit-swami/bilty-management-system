import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginTime: number | null;
  login: (email: string, password: string) => Promise<{ error: string | null; mfaRequired?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginTime, setLoginTime] = useState<number | null>(() => {
    const stored = localStorage.getItem("scs_login_time");
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (event === "SIGNED_OUT") {
        setLoginTime(null);
        localStorage.removeItem("scs_login_time");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Check if MFA is required
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = factors?.totp?.some((f) => f.status === "verified");
    // Set login time
    const now = Date.now();
    setLoginTime(now);
    localStorage.setItem("scs_login_time", String(now));
    if (hasVerifiedTotp) {
      return { error: null, mfaRequired: true };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("scs_auth_session");
    localStorage.removeItem("scs_login_time");
    setLoginTime(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!session, isLoading, loginTime, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
