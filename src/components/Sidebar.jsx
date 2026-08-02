import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { Avatar } from "../lib/helpers.jsx";

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
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) => "sidebar-link" + (isActive ? " active" : "");

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

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

      <nav className="sidebar-nav">
        <NavLink to="/communities" className={linkClass}>
          {icons.communities} Communities
        </NavLink>
        <NavLink to="/verify" className={linkClass}>
          {icons.verify} Get verified
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          {icons.profile} Profile
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
