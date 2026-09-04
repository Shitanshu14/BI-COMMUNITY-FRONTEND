import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, Spinner, timeAgo } from "../lib/helpers.jsx";

export default function Messages() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  // "New message" search — lets you find someone by username and jump
  // straight into a thread with them, instead of only being able to open
  // an existing conversation or reach the DM via their profile page.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = not searched yet
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    api("/api/chat/dm/")
      .then((res) => setRows(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api("/api/search/?type=users&q=" + encodeURIComponent(q));
        setResults(Array.isArray(data) ? data : data.users || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const openThreadWith = (userId) => {
    setOpen(false);
    setQuery("");
    navigate("/messages/" + userId);
  };

  return (
    <div className="page">
      <div className="eyebrow">Direct messages</div>
      <h1>Messages</h1>
      <div style={{ height: 16 }} />

      <div className="search-box" ref={boxRef} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search people to message…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {open && query.trim() && (
          <div className="search-dropdown">
            {searching && (
              <div className="search-dropdown-loading">
                <Spinner /> Searching…
              </div>
            )}
            {!searching && results && results.length === 0 && (
              <div className="search-dropdown-empty">No one found for "{query}".</div>
            )}
            {!searching &&
              results &&
              results.map((u) => (
                <div key={u.id} className="search-result-row" onClick={() => openThreadWith(u.id)}>
                  <Avatar name={u.username} src={u.avatar} size={28} />
                  <div>
                    <div className="search-result-title">
                      {u.username}
                      {u.is_verified && <span className="verified-tick">✓</span>}
                    </div>
                    <div className="search-result-sub">{u.headline || u.role}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <ErrorBox message={err} />

      {rows === null && <div className="empty-state">Loading…</div>}
      {rows !== null && rows.length === 0 && (
        <div className="empty-state">
          No conversations yet. Search for someone above to start one.
        </div>
      )}

      {rows &&
        rows.filter((r) => r.user).map((r) => (
          <div className="user-row" key={r.user.id} onClick={() => navigate("/messages/" + r.user.id)}>
            <Avatar name={r.user.username} src={r.user.avatar} size={44} />
            <div className="user-row-meta">
              <div className="user-row-name">
                <span className="truncate">{r.user.username}</span>
                {r.user.is_verified && <span className="verified-tick">✓</span>}
                {r.unread && <span className="badge badge-type" style={{ marginLeft: 6, flexShrink: 0 }}>new</span>}
              </div>
              <div className="user-row-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.last_message}
              </div>
            </div>
            <div className="user-row-sub" style={{ flexShrink: 0 }}>{timeAgo(r.last_message_at)}</div>
          </div>
        ))}
    </div>
  );
}
