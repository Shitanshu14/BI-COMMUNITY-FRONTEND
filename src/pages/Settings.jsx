import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { Avatar, ErrorBox, Spinner } from "../lib/helpers.jsx";

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [err, setErr] = useState("");

  const [blocked, setBlocked] = useState(null);
  const [unblockBusy, setUnblockBusy] = useState(null);

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [password, setPassword] = useState("");
  const [deactivateUsername, setDeactivateUsername] = useState("");
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [deactivateErr, setDeactivateErr] = useState("");

  const loadBlocked = async () => {
    try {
      const data = await api("/api/users/blocked/");
      setBlocked(Array.isArray(data) ? data : data.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    loadBlocked();
  }, []);

  const togglePrivacy = async () => {
    setPrivacyBusy(true);
    setErr("");
    try {
      const updated = await api("/api/users/me/", {
        method: "PATCH",
        body: { is_private: !user.is_private },
      });
      setUser((u) => ({ ...u, ...updated }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setPrivacyBusy(false);
    }
  };

  const unblock = async (id) => {
    setUnblockBusy(id);
    setErr("");
    try {
      await api("/api/users/" + id + "/unblock/", { method: "POST" });
      setBlocked((prev) => prev.filter((u) => u.id !== id));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setUnblockBusy(null);
    }
  };

  const deactivate = async (e) => {
    e.preventDefault();
    setDeactivateErr("");
    setDeactivateBusy(true);
    try {
      await api("/api/users/deactivate/", { method: "POST", body: { username: deactivateUsername, password } });
      await logout();
      navigate("/login");
    } catch (ex) {
      setDeactivateErr(ex.message);
    } finally {
      setDeactivateBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="eyebrow">Account</div>
      <h1>Settings</h1>
      <div style={{ height: 16 }} />
      <ErrorBox message={err} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="rail-title">Privacy</div>
        <div className="theme-toggle-row">
          <span>
            Private account
            <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
              When on, new followers need your approval before they can follow you.
            </div>
          </span>
          <button
            type="button"
            className={"theme-switch" + (user.is_private ? " on" : "")}
            role="switch"
            aria-checked={!!user.is_private}
            onClick={togglePrivacy}
            disabled={privacyBusy}
          >
            <span className="theme-switch-knob" />
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="rail-title">Blocked accounts</div>
        {blocked === null && <div className="subtle">Loading…</div>}
        {blocked && blocked.length === 0 && (
          <div className="subtle">You haven't blocked anyone.</div>
        )}
        {blocked &&
          blocked.map((b) => (
            <div
              key={b.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--border-soft)" }}
            >
              <Avatar name={b.username} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{b.username}</div>
              </div>
              <button className="btn btn-sm" onClick={() => unblock(b.id)} disabled={unblockBusy === b.id}>
                {unblockBusy === b.id ? <Spinner /> : "Unblock"}
              </button>
            </div>
          ))}
      </div>

      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <div className="rail-title" style={{ color: "var(--danger)" }}>Danger zone</div>
        <p className="subtle" style={{ margin: "0 0 12px" }}>
          Deactivating hides your profile and posts from everyone. You'll be signed out, and
          a BiCommunity admin will need to reactivate your account before you can log in again.
        </p>
        {!showDeactivate ? (
          <button className="btn btn-sm" onClick={() => setShowDeactivate(true)}>
            Deactivate account
          </button>
        ) : (
          <form onSubmit={deactivate}>
            <ErrorBox message={deactivateErr} />
            
            <label>Confirm your username or email</label>
            <input
              type="text"
              placeholder="Username or email"
              value={deactivateUsername}
              onChange={(e) => setDeactivateUsername(e.target.value)}
              required
              style={{ marginBottom: 12 }}
            />

            <label>Confirm your password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginBottom: 6 }}
            />
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, textDecoration: "underline", color: "var(--text-soft)" }}>
                Forgot password?
              </Link>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-sm" style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }} disabled={deactivateBusy}>
                {deactivateBusy ? <Spinner /> : "Yes, deactivate my account"}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => {
                setShowDeactivate(false);
                setDeactivateUsername("");
                setPassword("");
              }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
