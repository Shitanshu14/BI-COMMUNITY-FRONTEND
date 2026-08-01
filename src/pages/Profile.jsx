import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { RoleBadge, timeAgo } from "../lib/helpers.jsx";

export default function Profile() {
  const { user } = useAuth();
  const [verif, setVerif] = useState(null);

  useEffect(() => {
    api("/api/verification/me/")
      .then((v) => setVerif(Array.isArray(v) ? v : v.results || []))
      .catch(() => setVerif([]));
  }, []);

  if (!user) return <div className="empty-state">Loading…</div>;

  return (
    <div className="margin-page">
      <div className="eyebrow">Attendance record</div>
      <h1>{user.username}</h1>
      <div style={{ margin: "8px 0 20px" }}>
        <RoleBadge role={user.role} isVerified={user.is_verified} />
      </div>

      <div className="card" style={{ marginBottom: 26 }}>
        <label>Email</label>
        <p>{user.email}</p>
        <label>Headline</label>
        <p>{user.headline || "—"}</p>
        <label>Bio</label>
        <p>{user.bio || "—"}</p>
        <label>Reputation points</label>
        <p>{user.reputation_points || 0}</p>
      </div>

      <h2>Verification history</h2>
      {verif === null && <div className="empty-state">Loading…</div>}
      {verif && verif.length === 0 && (
        <div className="empty-state">No verification requests filed yet.</div>
      )}
      {verif &&
        verif.map((v) => (
          <div className="entry" key={v.id}>
            <div className="entry-head">
              <span className="entry-title">{v.proof_type}</span>
            </div>
            <div className="entry-meta">
              <span className="badge badge-role">{v.status}</span>
              <span>{timeAgo(v.created_at)}</span>
            </div>
          </div>
        ))}
    </div>
  );
}
