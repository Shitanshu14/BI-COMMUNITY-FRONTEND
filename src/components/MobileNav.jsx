import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

// Bottom tab bar shown only on small screens (see .mobile-bottom-nav in
// index.css). Kept to routes that actually exist in the app — there's no
// single global "feed" or "chat list" route yet, so this links to the
// closest real equivalents (Communities acts as the home/explore feed).
const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  verify: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 12 2 2 4-4" />
      <path d="M12 3 4.5 6v5.5C4.5 16 7.5 19.5 12 21c4.5-1.5 7.5-5 7.5-9.5V6L12 3Z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8.5a6 6 0 0 1 12 0c0 4.2 1.5 5.8 2 6.5H4c.5-.7 2-2.3 2-6.5Z" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
    </svg>
  ),
};

export default function MobileNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const poll = () => {
      api("/api/notifications/unread-count/")
        .then((res) => !cancelled && setNotifUnread(res.unread_count || 0))
        .catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  if (!user) return null;

  const linkClass = ({ isActive }) => "mobile-nav-link" + (isActive ? " active" : "");

  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/communities" className={linkClass} end>
        {icons.home}
        <span>Communities</span>
      </NavLink>
      <button type="button" className="mobile-nav-link" onClick={() => navigate("/search")}>
        {icons.search}
        <span>Search</span>
      </button>
      <NavLink to="/messages" className={linkClass}>
        {icons.messages}
        <span>Messages</span>
      </NavLink>
      <NavLink to="/notifications" className={linkClass} style={{ position: "relative" }}>
        {icons.bell}
        <span>Alerts</span>
        {notifUnread > 0 && <span className="nav-badge mobile-nav-badge">{notifUnread > 9 ? "9+" : notifUnread}</span>}
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        {icons.profile}
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
