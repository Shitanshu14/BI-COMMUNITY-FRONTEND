import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="empty-state">Loading…</div>;

  if (!user) {
    // Preserve where the person was trying to go (e.g. a shared post link:
    // /posts/<id>) so Login can send them straight back after they sign in.
    const next = location.pathname + location.search;
    return <Navigate to={"/login?next=" + encodeURIComponent(next)} replace />;
  }

  return children;
}
