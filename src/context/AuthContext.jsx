import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getTokens, setTokens, clearTokens } from "../lib/api.js";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const { access } = getTokens();
    if (!access) {
      setLoading(false);
      return;
    }
    try {
      const me = await api("/api/users/me/");
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const data = await api("/api/users/login/", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setTokens(data.access, data.refresh);
    await loadMe();
  };

  const register = async (payload) => {
    await api("/api/users/register/", { method: "POST", body: payload, auth: false });
    await login(payload.email, payload.password);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
