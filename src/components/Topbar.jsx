import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="topbar">
      <NavLink to="/" className="brand" style={{ textDecoration: "none" }}>
        setu<span className="dot">.</span>
      </NavLink>
      <nav>
        {user && (
          <NavLink to="/communities" className={linkClass}>
            Communities
          </NavLink>
        )}
        {user && (
          <NavLink to="/verify" className={linkClass}>
            Get verified
          </NavLink>
        )}
        {user && (
          <NavLink to="/profile" className={linkClass}>
            Roll no. {user.username}
          </NavLink>
        )}
        {user && (
          <button className="nav-link" onClick={doLogout}>
            Log out
          </button>
        )}
        {!user && (
          <NavLink to="/login" className={linkClass}>
            Log in
          </NavLink>
        )}
      </nav>
    </div>
  );
}
