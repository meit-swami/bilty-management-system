import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "scs_auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(SESSION_KEY) === "true";
  });

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(SESSION_KEY, "true");
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [isAuthenticated]);

  const login = (username: string, password: string): boolean => {
    if (username === "admin" && password === "12345") {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
