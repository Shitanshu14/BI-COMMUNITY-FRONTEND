import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar } from "../lib/helpers.jsx";

export default function CircleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [inviteBusyId, setInviteBusyId] = useState(null);
  const [invited, setInvited] = useState({}); // user_id -> true, to disable button after sending

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        api("/api/circles/" + id + "/"),
        api("/api/circles/" + id + "/members/"),
      ]);
      setCircle(c);
      setMembers(m);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api("/api/search/?type=users&q=" + encodeURIComponent(query))
        .then((res) => setResults((res.users || []).filter((u) => !members?.some((m) => m.id === u.id))))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, members]);

  const inviteUser = async (u) => {
    setInviteBusyId(u.id);
    setErr("");
    try {
      await api("/api/circles/" + id + "/invite/", { method: "POST", body: { user_id: u.id } });
      setInvited((prev) => ({ ...prev, [u.id]: true }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setInviteBusyId(null);
    }
  };

  const leaveCircle = async () => {
    setBusy(true);
    setErr("");
    try {
      await api("/api/circles/" + id + "/leave/", { method: "POST" });
      navigate("/circles");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteCircle = async () => {
    if (!window.confirm(`Delete "${circle.name}" for everyone? This can't be undone.`)) return;
    setBusy(true);
    setErr("");
    try {
      await api("/api/circles/" + id + "/", { method: "DELETE" });
      navigate("/circles");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (!circle) {
    return (
      <div>
        <ErrorBox message={err} />
        {!err && <div className="empty-state">Loading circle…</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="split">
        <div>
          <div className="eyebrow">Circle</div>
          <h1>{circle.name}</h1>
          {circle.description && <p style={{ color: "var(--muted, #888)" }}>{circle.description}</p>}
        </div>
        {circle.is_owner ? (
          <button className="btn" onClick={deleteCircle} disabled={busy}>
            Delete circle
          </button>
        ) : (
          <button className="btn" onClick={leaveCircle} disabled={busy}>
            Leave circle
          </button>
        )}
      </div>

      <ErrorBox message={err} />

      <div className="community-card-meta" style={{ marginBottom: 16 }}>
        {circle.member_count} / {circle.max_members} members
      </div>

      {circle.is_owner && (
        <div className="card" style={{ padding: 16, maxWidth: 460, marginBottom: 24 }}>
          <div className="rail-title" style={{ fontSize: 15, marginBottom: 10 }}>Invite someone</div>
          <input
            type="text"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={u.username} size={28} />
                  <span style={{ flex: 1 }}>{u.username}</span>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={inviteBusyId === u.id || invited[u.id]}
                    onClick={() => inviteUser(u)}
                  >
                    {invited[u.id] ? "Invited" : inviteBusyId === u.id ? "…" : "Invite"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rail-title" style={{ fontSize: 16, marginBottom: 10 }}>Members</div>
      {members === null && <div className="empty-state">Loading members…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(members || []).map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={m.username} size={32} />
            <span>{m.username}</span>
            {m.is_verified && <span className="verified-tick" title="Verified">✓</span>}
            {m.role === "owner" && <span className="badge badge-role">owner</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
