import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { Avatar, Spinner } from "../lib/helpers.jsx";

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = not searched yet
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api("/api/search/?q=" + encodeURIComponent(q));
        setResults(data);
      } catch {
        setResults({ users: [], posts: [], communities: [] });
      } finally {
        setLoading(false);
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

  const goToResults = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    navigate("/search?q=" + encodeURIComponent(query.trim()));
  };

  const hasAny =
    results && (results.users?.length || results.posts?.length || results.communities?.length);

  return (
    <div className="search-box" ref={boxRef}>
      <form onSubmit={goToResults}>
        <input
          type="text"
          placeholder="Search people, posts, communities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </form>

      {open && query.trim() && (
        <div className="search-dropdown">
          {loading && <div className="search-dropdown-loading"><Spinner /> Searching…</div>}

          {!loading && !hasAny && <div className="search-dropdown-empty">No results for "{query}".</div>}

          {!loading && results?.users?.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">People</div>
              {results.users.slice(0, 4).map((u) => (
                <div
                  key={u.id}
                  className="search-result-row"
                  onClick={() => {
                    setOpen(false);
                    navigate("/profile/" + u.id);
                  }}
                >
                  <Avatar name={u.username} size={28} />
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

          {!loading && results?.communities?.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Communities</div>
              {results.communities.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="search-result-row"
                  onClick={() => {
                    setOpen(false);
                    navigate("/communities/" + c.id);
                  }}
                >
                  <Avatar name={c.name} size={28} />
                  <div>
                    <div className="search-result-title">{c.name}</div>
                    <div className="search-result-sub">{c.member_count || 0} members</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results?.posts?.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">Posts</div>
              {results.posts.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="search-result-row"
                  onClick={() => {
                    setOpen(false);
                    navigate("/posts/" + p.id);
                  }}
                >
                  <div>
                    <div className="search-result-title">{p.title}</div>
                    <div className="search-result-sub">by {p.author?.username || "member"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && hasAny && (
            <div className="search-dropdown-footer" onClick={goToResults}>
              See all results for "{query}" →
            </div>
          )}
        </div>
      )}
    </div>
  );
}
