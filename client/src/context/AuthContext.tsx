import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ authenticated: boolean }>("/api/auth/status")
      .then((res) => setAuthenticated(res.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  async function login(password: string) {
    await api.post("/api/auth/login", { password });
    setAuthenticated(true);
  }

  async function logout() {
    await api.post("/api/auth/logout");
    setAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
