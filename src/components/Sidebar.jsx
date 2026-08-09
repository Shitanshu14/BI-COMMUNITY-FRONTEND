import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { Avatar } from "../lib/helpers.jsx";
import { api } from "../lib/api.js";
import SearchBar from "./SearchBar.jsx";

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  communities: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5S15.5 15.7 15.5 19" />
      <circle cx="17" cy="8.5" r="2.3" />
      <path d="M15.2 13.7c2.9.3 4.8 2.2 4.8 5.3" />
    </svg>
  ),
  circles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
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
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  ),
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dmUnread, setDmUnread] = useState(0);

  const linkClass = ({ isActive }) => "sidebar-link" + (isActive ? " active" : "");

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const poll = () => {
      api("/api/chat/dm/unread-count/")
        .then((res) => !cancelled && setDmUnread(res.count || 0))
        .catch(() => {});
    };
    poll();
    // Cheap poll rather than a global websocket just for a badge — good
    // enough freshness for a sidebar counter without another persistent
    // connection running the whole time the app is open.
    const timer = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Re-poll immediately whenever the person navigates (e.g. leaves a DM
    // thread having just read it) instead of waiting up to 20s to clear.
  }, [user, location.pathname]);

  if (!user) return null;

  return (
    <aside className="sidebar">
      <NavLink to="/communities" className="sidebar-brand">
        BiCommunity<span className="dot">.</span>
      </NavLink>

      <div className="sidebar-user" onClick={() => navigate("/profile")}>
        <Avatar name={user.username} size={36} />
        <div>
          <div className="sidebar-user-name">
            {user.username}
            {user.is_verified && <span className="verified-tick" title="Verified">✓</span>}
          </div>
          <div className="sidebar-user-sub">{user.headline || user.role}</div>
        </div>
      </div>

      <div style={{ margin: "2px 0 12px" }}>
        <SearchBar />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/communities" className={linkClass}>
          {icons.communities} Communities
        </NavLink>
        <NavLink to="/circles" className={linkClass}>
          {icons.circles} Circles
        </NavLink>
        <NavLink to="/messages" className={linkClass}>
          {icons.messages} Messages
          {dmUnread > 0 && <span className="nav-badge">{dmUnread > 9 ? "9+" : dmUnread}</span>}
        </NavLink>
        <NavLink to="/saved" className={linkClass}>
          {icons.saved} Saved
        </NavLink>
        <NavLink to="/verify" className={linkClass}>
          {icons.verify} Get verified
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          {icons.profile} Profile
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          {icons.settings} Settings
        </NavLink>
      </nav>

      <div className="sidebar-foot">
        <div className="theme-toggle-row">
          <span>{theme === "dark" ? "🌙" : "☀️"} Dark Mode</span>
          <button
            type="button"
            className={"theme-switch" + (theme === "dark" ? " on" : "")}
            role="switch"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
          >
            <span className="theme-switch-knob" />
          </button>
        </div>
        <button className="sidebar-link" onClick={doLogout}>
          {icons.logout} Log out
        </button>
      </div>
    </aside>
  );
}
