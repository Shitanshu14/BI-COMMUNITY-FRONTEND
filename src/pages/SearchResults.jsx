import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { Avatar, ErrorBox, timeAgo } from "../lib/helpers.jsx";
import { typeIcon, subtypeLabel, groupLabel } from "../lib/postTypes.js";

const TABS = [
  { value: "all", label: "All" },
  { value: "users", label: "People" },
  { value: "posts", label: "Posts" },
  { value: "communities", label: "Communities" },
];

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [tab, setTab] = useState("all");
  const [results, setResults] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!query) {
      setResults({ users: [], posts: [], communities: [] });
      return;
    }
    setResults(null);
    setErr("");
    api("/api/search/?type=" + tab + "&q=" + encodeURIComponent(query))
      .then(setResults)
      .catch((ex) => setErr(ex.message));
  }, [query, tab]);

  const users = results?.users || [];
  const posts = results?.posts || [];
  const communities = results?.communities || [];
  const totalKnown = tab === "all" ? users.length + posts.length + communities.length : null;

  return (
    <div className="page">
      <div className="eyebrow">Search</div>
      <h1>Results for "{query}"</h1>

      <div className="composer-types" style={{ margin: "16px 0" }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={"pill-btn" + (tab === t.value ? " active" : "")}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ErrorBox message={err} />

      {results === null && <div className="empty-state">Searching…</div>}

      {results !== null && totalKnown === 0 && (
        <div className="empty-state">No results found. Try a different search term.</div>
      )}

      {results !== null && (tab === "all" || tab === "users") && users.length > 0 && (
        <>
          <h2 style={{ fontSize: 16 }}>People</h2>
          {users.map((u) => (
            <div
              className="entry"
              key={u.id}
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              onClick={() => navigate("/profile/" + u.id)}
            >
              <Avatar name={u.username} size={36} />
              <div>
                <div className="entry-title" style={{ fontSize: 14 }}>
                  {u.username}
                  {u.is_verified && <span className="verified-tick">✓</span>}
                </div>
                <div className="entry-meta">
                  <span>{u.headline || u.role}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ height: 20 }} />
        </>
      )}

      {results !== null && (tab === "all" || tab === "communities") && communities.length > 0 && (
        <>
          <h2 style={{ fontSize: 16 }}>Communities</h2>
          <div className="community-grid">
            {communities.map((c) => (
              <div className="community-card" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
                <div className="community-card-head">
                  <Avatar name={c.name} size={40} />
                  {!c.is_public && <span className="badge badge-role">private</span>}
                </div>
                <div className="entry-title">{c.name}</div>
                <div className="community-card-desc">{c.description || "No description yet."}</div>
                <div className="community-card-meta">
                  <span>{c.member_count || 0} members</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 20 }} />
        </>
      )}

      {results !== null && (tab === "all" || tab === "posts") && posts.length > 0 && (
        <>
          <h2 style={{ fontSize: 16 }}>Posts</h2>
          {posts.map((p) => (
            <div className="entry" key={p.id} onClick={() => navigate("/posts/" + p.id)} style={{ cursor: "pointer" }}>
              <div className="entry-head">
                <span className="entry-title">{p.title}</span>
                <span className="badge badge-type">{typeIcon(p.post_type)} {groupLabel(p.post_type)}</span>
                {subtypeLabel(p.post_type) && <span className="badge badge-tag">{subtypeLabel(p.post_type)}</span>}
              </div>
              <div className="entry-body">{p.body}</div>
              <div className="entry-meta">
                <span>{p.author?.username || "member"}</span>
                <span>{timeAgo(p.created_at)}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
