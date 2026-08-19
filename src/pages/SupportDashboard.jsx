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
          { value: "tickets", label: "🆘 Support tickets" },
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
      {tab === "tickets" && <TicketsPanel />}
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
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailErr, setDetailErr] = useState("");

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
      setDetail((d) => (d && d.id === u.id ? { ...d, ...updated } : d));
      onUserChanged?.();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId(null);
    }
  };

  const openDetail = (u) => {
    if (openId === u.id) {
      setOpenId(null);
      return;
    }
    setOpenId(u.id);
    setDetail(null);
    setDetailErr("");
    api("/api/support/users/" + u.id + "/")
      .then(setDetail)
      .catch((ex) => setDetailErr(ex.message));
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
            <div key={u.id}>
              <div className="support-user-row" style={{ cursor: "pointer" }} onClick={() => openDetail(u)}>
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
                  onClick={(e) => { e.stopPropagation(); toggleActive(u); }}
                >
                  {busyId === u.id ? <Spinner /> : u.is_active ? "Block" : "Unblock"}
                </button>
              </div>

              {openId === u.id && (
                <div className="support-members-panel">
                  <ErrorBox message={detailErr} />
                  {detail === null && <div className="empty-state">Loading profile…</div>}
                  {detail && (
                    <div className="support-detail-grid">
                      <div>
                        <div className="support-detail-label">Headline</div>
                        <div>{detail.headline || "—"}</div>
                      </div>
                      <div>
                        <div className="support-detail-label">Bio</div>
                        <div>{detail.bio || "—"}</div>
                      </div>
                      <div>
                        <div className="support-detail-label">Communities ({detail.communities.length})</div>
                        {detail.communities.length === 0 && <div className="support-detail-empty">None</div>}
                        {detail.communities.map((c) => (
                          <div key={c.id} className="support-detail-chip">{c.name} <span className="support-detail-role">{c.role}</span></div>
                        ))}
                      </div>
                      <div>
                        <div className="support-detail-label">Circles ({detail.circles.length})</div>
                        {detail.circles.length === 0 && <div className="support-detail-empty">None</div>}
                        {detail.circles.map((c) => (
                          <div key={c.id} className="support-detail-chip">{c.name} <span className="support-detail-role">{c.role}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [createBusy, setCreateBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [removeBusyId, setRemoveBusyId] = useState(null);
  const [holdBusyId, setHoldBusyId] = useState(null);

  const label = kind === "communities" ? "community" : "circle";

  const load = useCallback(() => {
    api("/api/support/" + kind + "/")
      .then((res) => setGroups(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  }, [kind]);

  useEffect(() => {
    setGroups(null);
    setOpenId(null);
    load();
  }, [kind, load]);

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

  const createGroup = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreateBusy(true);
    setErr("");
    try {
      const created = await api("/api/support/" + kind + "/", { method: "POST", body: form });
      setGroups((prev) => [...(prev || []), created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", description: "" });
      setCreating(false);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setCreateBusy(false);
    }
  };

  const deleteGroup = async (g) => {
    if (!window.confirm(`Delete "${g.name}"? This removes the ${label} for everyone and can't be undone.`)) return;
    setDeleteBusyId(g.id);
    setErr("");
    try {
      await api("/api/support/" + kind + "/" + g.id + "/", { method: "DELETE" });
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      if (openId === g.id) setOpenId(null);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setDeleteBusyId(null);
    }
  };

  const toggleHold = async (g) => {
    setHoldBusyId(g.id);
    setErr("");
    try {
      const updated = await api("/api/support/communities/" + g.id + "/toggle-hold/", { method: "POST" });
      setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, is_on_hold: updated.is_on_hold } : x)));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setHoldBusyId(null);
    }
  };

  const removeMember = async (groupId, member) => {
    setRemoveBusyId(member.id);
    setMembersErr("");
    try {
      await api("/api/support/" + kind + "/" + groupId + "/members/" + member.id + "/", { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g)));
    } catch (ex) {
      setMembersErr(ex.message);
    } finally {
      setRemoveBusyId(null);
    }
  };

  return (
    <div>
      <div className="support-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancel" : "+ New " + label}
        </button>
      </div>

      {creating && (
        <form onSubmit={createGroup} className="card" style={{ marginBottom: 16 }}>
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={kind === "communities" ? "e.g. Design Community" : "e.g. Core Team"}
            autoFocus
          />
          <label>Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button className="btn btn-primary btn-sm" disabled={createBusy || !form.name.trim()}>
            {createBusy ? <Spinner /> : "Create " + label}
          </button>
        </form>
      )}

      <ErrorBox message={err} />
      {groups === null && <div className="empty-state">Loading…</div>}
      {groups !== null && groups.length === 0 && <div className="empty-state">None yet.</div>}

      {groups && groups.length > 0 && (
        <div className="support-table">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="support-group-row">
                <div className="support-user-main" style={{ cursor: "pointer" }} onClick={() => openMembers(g)}>
                  <div className="support-user-name">
                    {g.name}
                    {kind === "communities" && g.is_on_hold && (
                      <span className="badge badge-unsolved" style={{ marginLeft: 8 }}>⏸️ On hold</span>
                    )}
                  </div>
                  <div className="support-user-sub">{g.description || "No description"}</div>
                </div>
                <span className="badge badge-tag" style={{ cursor: "pointer" }} onClick={() => openMembers(g)}>{g.member_count} members</span>
                {kind === "communities" && (
                  <button
                    className={"btn btn-sm" + (g.is_on_hold ? " btn-primary" : "")}
                    disabled={holdBusyId === g.id}
                    onClick={() => toggleHold(g)}
                    title={g.is_on_hold ? "Lift hold" : "Put this community on hold"}
                  >
                    {holdBusyId === g.id ? <Spinner /> : g.is_on_hold ? "Unhold" : "⏸️ Hold"}
                  </button>
                )}
                <button
                  className="btn btn-sm"
                  disabled={deleteBusyId === g.id}
                  onClick={() => deleteGroup(g)}
                  title={`Delete this ${label}`}
                >
                  {deleteBusyId === g.id ? <Spinner /> : "🗑️"}
                </button>
                <span className="support-group-chevron" style={{ cursor: "pointer" }} onClick={() => openMembers(g)}>
                  {openId === g.id ? "▲" : "▼"}
                </span>
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
                      {!m.is_active && <span className="badge badge-unsolved" style={{ marginRight: 8 }}>Blocked</span>}
                      <button
                        className="btn btn-sm"
                        disabled={removeBusyId === m.id}
                        onClick={() => removeMember(g.id, m)}
                      >
                        {removeBusyId === m.id ? <Spinner /> : "Remove"}
                      </button>
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

function TicketsPanel() {
  const [tickets, setTickets] = useState(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("open"); // open | resolved | all
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    const path = "/api/support/tickets/" + (status !== "all" ? "?status=" + status : "");
    api(path)
      .then((res) => setTickets(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  }, [status]);

  useEffect(() => {
    setTickets(null);
    load();
  }, [status, load]);

  const resolve = async (t) => {
    setBusyId(t.id);
    try {
      const updated = await api("/api/support/tickets/" + t.id + "/resolve/", { method: "POST" });
      setTickets((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="support-toolbar">
        {["open", "resolved", "all"].map((s) => (
          <button
            key={s}
            className={"pill-btn pill-btn-sm" + (status === s ? " active" : "")}
            onClick={() => setStatus(s)}
          >
            {s === "open" ? "Open" : s === "resolved" ? "Resolved" : "All"}
          </button>
        ))}
      </div>

      <ErrorBox message={err} />
      {tickets === null && <div className="empty-state">Loading tickets…</div>}
      {tickets !== null && tickets.length === 0 && <div className="empty-state">Nothing here.</div>}

      {tickets && tickets.length > 0 && (
        <div className="support-table">
          {tickets.map((t) => (
            <div className="support-user-row" key={t.id} style={{ alignItems: "flex-start" }}>
              <div className="support-user-main">
                <div className="support-user-name">
                  {t.username || "(no username given)"}
                  {t.email && <span className="support-user-sub" style={{ marginLeft: 8 }}>{t.email}</span>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4, whiteSpace: "pre-wrap" }}>{t.message}</div>
                <div className="support-user-sub" style={{ marginTop: 6 }}>{timeAgo(t.created_at)}</div>
              </div>
              <span className={"badge " + (t.status === "open" ? "badge-unsolved" : "badge-solved")}>
                {t.status === "open" ? "Open" : "Resolved"}
              </span>
              <button className="btn btn-sm" disabled={busyId === t.id} onClick={() => resolve(t)}>
                {busyId === t.id ? <Spinner /> : t.status === "open" ? "Mark resolved" : "Reopen"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
