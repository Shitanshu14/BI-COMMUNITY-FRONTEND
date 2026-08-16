import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Avatar, ErrorBox, Spinner, timeAgo } from "../lib/helpers.jsx";

const STAT_BOXES = [
  { key: "total_users", label: "Total users", icon: "👥" },
  { key: "active_users", label: "Active users", icon: "✅" },
  { key: "blocked_users", label: "Blocked users", icon: "🚫" },
  { key: "total_communities", label: "Communities", icon: "🧑‍🤝‍🧑" },
  { key: "total_circles", label: "Circles", icon: "🎯" },
  { key: "pending_verifications", label: "Pending verifications", icon: "🪪" },
];

/**
 * The support/admin control room — everything one person needs to keep an
 * eye on the app without touching Django Admin (which wasn't built for
 * "quickly search a user and block them", it's built for "edit any field
 * on any model"). Gated by is_support/is_staff on both ends: the backend
 * rejects anyone else at /api/support/*, and this component redirects
 * away before even trying, so a regular user never sees a flash of it.
 */
export default function SupportDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState("users"); // users | communities | circles
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  const loadStats = useCallback(() => {
    api("/api/support/stats/").then(setStats).catch((ex) => setErr(ex.message));
  }, []);

  useEffect(() => {
    if (user?.is_support || user?.is_staff) loadStats();
  }, [user, loadStats]);

  if (authLoading) return <div className="empty-state">Loading…</div>;
  if (!user?.is_support && !user?.is_staff) return <Navigate to="/communities" replace />;

  return (
    <div className="page support-dash">
      <div className="eyebrow">Support</div>
      <h1>Control room</h1>
      <ErrorBox message={err} />

      <div className="support-stat-grid">
        {STAT_BOXES.map((box) => (
          <div className="stat-card" key={box.key}>
            <span className="stat-card-icon">{box.icon}</span>
            <div className="stat-card-value">{stats ? stats[box.key] : <Spinner />}</div>
            <div className="stat-card-label">{box.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 28, marginBottom: 18 }}>
        {[
          { value: "users", label: "👥 Users" },
          { value: "communities", label: "🧑‍🤝‍🧑 Communities" },
          { value: "circles", label: "🎯 Circles" },
        ].map((t) => (
          <button
            key={t.value}
            className={"pill-btn" + (tab === t.value ? " active" : "")}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersPanel onUserChanged={loadStats} />}
      {tab === "communities" && <GroupPanel kind="communities" />}
      {tab === "circles" && <GroupPanel kind="circles" />}
    </div>
  );
}

function UsersPanel({ onUserChanged }) {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | active | blocked
  const [busyId, setBusyId] = useState(null);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);

  const load = useCallback((url) => {
    const path = url
      ? url.replace(/^https?:\/\/[^/]+/, "") // keep same-origin, ignore DRF's absolute host
      : "/api/support/users/?" + new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}) }).toString();
    api(path)
      .then((res) => {
        setUsers(Array.isArray(res) ? res : res.results || []);
        setNext(res?.next || null);
        setPrev(res?.previous || null);
      })
      .catch((ex) => setErr(ex.message));
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(() => load(), q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const toggleActive = async (u) => {
    setBusyId(u.id);
    setErr("");
    try {
      const updated = await api("/api/support/users/" + u.id + "/toggle-active/", { method: "POST" });
      setUsers((prevList) => prevList.map((x) => (x.id === u.id ? updated : x)));
      onUserChanged?.();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="support-toolbar">
        <input
          type="text"
          placeholder="Search username or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        {["all", "active", "blocked"].map((s) => (
          <button
            key={s}
            className={"pill-btn pill-btn-sm" + (status === s ? " active" : "")}
            onClick={() => setStatus(s)}
          >
            {s === "all" ? "All" : s === "active" ? "Active" : "Blocked"}
          </button>
        ))}
      </div>

      <ErrorBox message={err} />

      {users === null && <div className="empty-state">Loading users…</div>}
      {users !== null && users.length === 0 && <div className="empty-state">No users match this search.</div>}

      {users && users.length > 0 && (
        <div className="support-table">
          {users.map((u) => (
            <div className="support-user-row" key={u.id}>
              <Avatar name={u.username} src={u.avatar} size={36} />
              <div className="support-user-main">
                <div className="support-user-name">
                  {u.username}
                  {u.is_verified && <span className="verified-tick" title="Verified">✓</span>}
                  {u.is_staff && <span className="badge badge-tag" style={{ marginLeft: 6 }}>staff</span>}
                  {u.is_support && <span className="badge badge-tag" style={{ marginLeft: 6 }}>support</span>}
                </div>
                <div className="support-user-sub">{u.email} · {u.role} · joined {timeAgo(u.created_at)}</div>
              </div>
              <div className="support-user-counts">
                <span>{u.community_count} communities</span>
                <span>{u.circle_count} circles</span>
                <span>{u.post_count} posts</span>
              </div>
              <span className={"badge " + (u.is_active ? "badge-solved" : "badge-unsolved")}>
                {u.is_active ? "Active" : "Blocked"}
              </span>
              <button
                className={"btn btn-sm" + (u.is_active ? "" : " btn-primary")}
                disabled={busyId === u.id}
                onClick={() => toggleActive(u)}
              >
                {busyId === u.id ? <Spinner /> : u.is_active ? "Block" : "Unblock"}
              </button>
            </div>
          ))}
        </div>
      )}

      {(next || prev) && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-sm" disabled={!prev} onClick={() => load(prev)}>← Previous</button>
          <button className="btn btn-sm" disabled={!next} onClick={() => load(next)}>Next →</button>
        </div>
      )}
    </div>
  );
}

function GroupPanel({ kind }) {
  // kind: "communities" | "circles" — same shape (id, name, member_count),
  // same members-drill-down interaction, just a different endpoint.
  const [groups, setGroups] = useState(null);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [members, setMembers] = useState(null);
  const [membersErr, setMembersErr] = useState("");

  useEffect(() => {
    setGroups(null);
    setOpenId(null);
    api("/api/support/" + kind + "/")
      .then((res) => setGroups(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  }, [kind]);

  const openMembers = (g) => {
    if (openId === g.id) {
      setOpenId(null);
      return;
    }
    setOpenId(g.id);
    setMembers(null);
    setMembersErr("");
    api("/api/support/" + kind + "/" + g.id + "/members/")
      .then((res) => setMembers(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setMembersErr(ex.message));
  };

  return (
    <div>
      <ErrorBox message={err} />
      {groups === null && <div className="empty-state">Loading…</div>}
      {groups !== null && groups.length === 0 && <div className="empty-state">None yet.</div>}

      {groups && groups.length > 0 && (
        <div className="support-table">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="support-group-row" onClick={() => openMembers(g)}>
                <div className="support-user-main">
                  <div className="support-user-name">{g.name}</div>
                  <div className="support-user-sub">{g.description || "No description"}</div>
                </div>
                <span className="badge badge-tag">{g.member_count} members</span>
                <span className="support-group-chevron">{openId === g.id ? "▲" : "▼"}</span>
              </div>

              {openId === g.id && (
                <div className="support-members-panel">
                  <ErrorBox message={membersErr} />
                  {members === null && <div className="empty-state">Loading members…</div>}
                  {members !== null && members.length === 0 && <div className="empty-state">No members.</div>}
                  {members && members.map((m) => (
                    <div className="support-user-row support-user-row-compact" key={m.id}>
                      <Avatar name={m.username} src={m.avatar} size={28} />
                      <div className="support-user-main">
                        <div className="support-user-name">
                          {m.username}
                          <span className="badge badge-tag" style={{ marginLeft: 6 }}>{m.role}</span>
                        </div>
                        <div className="support-user-sub">{m.email} · joined {timeAgo(m.joined_at)}</div>
                      </div>
                      {!m.is_active && <span className="badge badge-unsolved">Blocked</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
