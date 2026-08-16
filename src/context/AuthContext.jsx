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
    await api("/api/users/login/", { method: "POST", body: { email, password } });
    // Don't just `setUser(data.user)` from the login response — that uses
    // a slimmer serializer than /api/users/me/ (missing is_support/is_staff,
    // used to gate the Support Dashboard link), so the sidebar would be
    // wrong until the next full page load. Fetching /me/ here keeps one
    // source of truth for "what does the signed-in user object look like".
    await loadMe();
  };

  const register = async (payload) => {
    await api("/api/users/register/", { method: "POST", body: payload });
    await loadMe();
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
