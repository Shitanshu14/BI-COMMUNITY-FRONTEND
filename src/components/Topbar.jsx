import { NavLink } from "react-router-dom";

/** Top nav shown only to signed-out visitors (Landing / Login / Register). */
export default function Topbar() {
  return (
    <div className="topbar">
      <NavLink to="/" className="brand" style={{ textDecoration: "none" }}>
        BiCommunity<span className="dot">.</span>
      </NavLink>
      <nav>
        <NavLink to="/login" className="nav-link">
          Log in
        </NavLink>
        <NavLink to="/register" className="btn btn-primary btn-sm">
          Get started
        </NavLink>
      </nav>
    </div>
  );
}
