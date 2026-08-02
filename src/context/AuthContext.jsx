import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // No token to check for anymore — the browser sends the httpOnly auth
  // cookie automatically, so we just ask "who am I" and see if it works.
  const loadMe = useCallback(async () => {
    try {
      const me = await api("/api/users/me/");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const data = await api("/api/users/login/", { method: "POST", body: { email, password } });
    setUser(data.user);
  };

  const register = async (payload) => {
    const data = await api("/api/users/register/", { method: "POST", body: payload });
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api("/api/users/logout/", { method: "POST" });
    } catch {
      // even if the request fails, drop the local session
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
