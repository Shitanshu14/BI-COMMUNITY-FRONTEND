import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, timeAgo } from "../lib/helpers.jsx";

export default function Circles() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState(null);
  const [invites, setInvites] = useState(null);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(null);

  const load = async () => {
    try {
      const [c, i] = await Promise.all([
        api("/api/circles/"),
        api("/api/circles/invites/"),
      ]);
      setCircles(Array.isArray(c) ? c : c.results || []);
      setInvites(Array.isArray(i) ? i : i.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCircle = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const circle = await api("/api/circles/", {
        method: "POST",
        body: { name: name.trim(), description },
      });
      setName("");
      setDescription("");
      setShowCreate(false);
      navigate("/circles/" + circle.id);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const respondInvite = async (invite, accept) => {
    setInviteBusy(invite.id);
    setErr("");
    try {
      const res = await api(`/api/circles/invites/${invite.id}/${accept ? "accept" : "decline"}/`, {
        method: "POST",
      });
      setInvites((prev) => prev.filter((x) => x.id !== invite.id));
      if (accept && res.circle_id) navigate("/circles/" + res.circle_id);
      else load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setInviteBusy(null);
    }
  };

  return (
    <div>
      <div className="split">
        <div>
          <div className="eyebrow">Circles</div>
          <h1>Your circles</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Cancel" : "+ New circle"}
        </button>
      </div>

      <div style={{ height: 8 }} />
      <p style={{ color: "var(--muted, #888)", maxWidth: 560 }}>
        Circles are small, private, invite-only groups — for a project team,
        classmates, or close collaborators. Unlike Communities, Circles never
        show up in search or discovery; the only way in is an invite.
      </p>

      <ErrorBox message={err} />

      {showCreate && (
        <form onSubmit={createCircle} className="card" style={{ maxWidth: 420, padding: 16, marginBottom: 20 }}>
          <label>Name</label>
          <input
            type="text"
            placeholder="e.g. Final Year Project Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div style={{ height: 10 }} />
          <label>Description (optional)</label>
          <textarea
            placeholder="What's this circle for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div style={{ height: 12 }} />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create circle"}
          </button>
        </form>
      )}

      {invites !== null && invites.length > 0 && (
        <>
          <div className="rail-title" style={{ fontSize: 16, marginBottom: 10 }}>📩 Pending invites</div>
          <div className="suggested-row">
            {invites.map((inv) => (
              <div className="suggested-card" key={inv.id}>
                <Avatar name={inv.circle.name} size={36} />
                <div className="suggested-card-name">{inv.circle.name}</div>
                <div className="suggested-card-meta">
                  invited by {inv.invited_by?.username || "someone"} · {timeAgo(inv.created_at)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={inviteBusy === inv.id}
                    onClick={() => respondInvite(inv, true)}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={inviteBusy === inv.id}
                    onClick={() => respondInvite(inv, false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 24 }} />
        </>
      )}

      {circles === null && <div className="empty-state">Loading circles…</div>}
      {circles !== null && circles.length === 0 && (
        <div className="empty-state">
          You're not in any circle yet. Create one, or wait for an invite.
        </div>
      )}

      <div className="community-grid">
        {(circles || []).map((c) => (
          <div className="community-card" key={c.id} onClick={() => navigate("/circles/" + c.id)}>
            <div className="community-card-head">
              <Avatar name={c.name} size={40} />
              <span className="badge badge-role">private</span>
              {c.is_owner && <span className="badge badge-verified">owner</span>}
            </div>
            <div className="entry-title">{c.name}</div>
            <div className="community-card-desc">{c.description || "No description yet."}</div>
            <div className="community-card-meta">
              <span>{c.member_count || 0} / {c.max_members} members</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
