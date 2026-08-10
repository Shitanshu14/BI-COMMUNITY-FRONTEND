import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, Skeleton } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import TrendingCarousel from "../components/TrendingCarousel.jsx";

export default function Communities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [joinBusy, setJoinBusy] = useState(null);
  const [stats, setStats] = useState(null);

  const load = async (search = "") => {
    try {
      const path = "/api/communities/" + (search ? "?search=" + encodeURIComponent(search) : "");
      setList(await api(path));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  // Runs once on mount (query starts empty) and again 300ms after the user
  // stops typing — a single effect avoids firing the initial load twice.
  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Dashboard strip: four counts pulled live from real endpoints, not
  // hand-typed copy — circles/notifications are already scoped
  // server-side to "mine", unread comes from the same endpoint the
  // sidebar badge polls, and joined-communities is derived from the
  // community list itself below (see `items`) so it needs no separate call.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api("/api/circles/").catch(() => null),
      api("/api/chat/dm/unread-count/").catch(() => null),
      api("/api/notifications/unread-count/").catch(() => null),
    ]).then(([circlesRes, unreadRes, notifRes]) => {
      if (cancelled) return;
      const circleCount = Array.isArray(circlesRes) ? circlesRes.length : circlesRes?.count ?? circlesRes?.results?.length ?? 0;
      setStats({ circles: circleCount, unread: unreadRes?.count || 0, notifications: notifRes?.unread_count || 0 });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = Array.isArray(list) ? list : (list && list.results) || [];
  const myCommunityCount = items.filter((c) => c.is_member).length;

  // Simple "trending among what you haven't joined" ranking — no ML, just
  // member_count desc among communities the user isn't already in. Good
  // enough for a discovery rail; only shown on the unfiltered browse view
  // so it doesn't fight with active search results.
  const suggested = [...items]
    .filter((c) => !c.is_member)
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    .slice(0, 5);

  const quickJoin = async (e, c) => {
    e.stopPropagation();
    setJoinBusy(c.id);
    try {
      const res = await api("/api/communities/" + c.id + "/join/", { method: "POST" });
      setList((prev) => {
        const arr = Array.isArray(prev) ? prev : prev.results || [];
        return arr.map((x) => (x.id === c.id ? { ...x, is_member: true, member_count: res.member_count } : x));
      });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setJoinBusy(null);
    }
  };

  return (
    <div>
      <div className="split">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>{user ? `Welcome back, ${user.username}` : "Browse communities"}</h1>
        </div>
      </div>

      <div style={{ height: 18 }} />
      <div className="stat-strip">
        <div className="stat-card" onClick={() => document.querySelector(".community-grid")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="stat-card-icon">🧑‍🤝‍🧑</span>
          {stats === null ? <Skeleton width={44} height={26} /> : <div className="stat-card-value">{myCommunityCount}</div>}
          <div className="stat-card-label">Communities joined</div>
        </div>
        <div className="stat-card" onClick={() => navigate("/circles")}>
          <span className="stat-card-icon">🎯</span>
          {stats === null ? <Skeleton width={44} height={26} /> : <div className="stat-card-value">{stats.circles}</div>}
          <div className="stat-card-label">Your circles</div>
        </div>
        <div className="stat-card" onClick={() => navigate("/messages")}>
          <span className="stat-card-icon">💬</span>
          {stats === null ? <Skeleton width={44} height={26} /> : <div className="stat-card-value">{stats.unread}</div>}
          <div className="stat-card-label">Unread messages</div>
        </div>
        <div className="stat-card" onClick={() => navigate("/notifications")}>
          <span className="stat-card-icon">🔔</span>
          {stats === null ? <Skeleton width={44} height={26} /> : <div className="stat-card-value">{stats.notifications}</div>}
          <div className="stat-card-label">New notifications</div>
        </div>
      </div>

      <TrendingCarousel />

      <input
        type="text"
        placeholder="Search communities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 420 }}
      />
      <div style={{ height: 16 }} />

      <ErrorBox message={err} />

      {!query && suggested.length > 0 && (
        <>
          <div className="rail-title" style={{ fontSize: 16, marginBottom: 10 }}>🧑‍🤝‍🧑 Suggested for you</div>
          <div className="suggested-row">
            {suggested.map((c) => (
              <div className="suggested-card" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
                <Avatar name={c.name} size={36} />
                <div className="suggested-card-name">{c.name}</div>
                <div className="suggested-card-meta">{c.member_count || 0} members</div>
                <button className="btn btn-primary btn-sm" onClick={(e) => quickJoin(e, c)} disabled={joinBusy === c.id}>
                  {joinBusy === c.id ? "…" : "Join"}
                </button>
              </div>
            ))}
          </div>
          <div style={{ height: 24 }} />
        </>
      )}

      {list === null && (
        <div className="community-grid">
          {[...Array(6)].map((_, i) => (
            <div className="community-card" key={i} style={{ cursor: "default" }}>
              <div className="community-card-head">
                <Skeleton width={40} height={40} radius="50%" />
              </div>
              <Skeleton width="70%" height={17} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
              <Skeleton width="50%" height={13} />
            </div>
          ))}
        </div>
      )}
      {list !== null && items.length === 0 && (
        <div className="empty-state">
          {query ? `No communities match "${query}".` : "No communities yet. Be the first to create one."}
        </div>
      )}

      {list !== null && (
        <div className="community-grid">
          {items.map((c) => (
            <div className="community-card" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
              <div className="community-card-head">
                <Avatar name={c.name} size={40} />
                {!c.is_public && <span className="badge badge-role">private</span>}
                {c.is_member && <span className="badge badge-verified">joined</span>}
              </div>
              <div className="entry-title">{c.name}</div>
              <div className="community-card-desc">{c.description || "No description yet."}</div>
              <div className="community-card-meta">
                <span>{c.member_count || 0} members</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
