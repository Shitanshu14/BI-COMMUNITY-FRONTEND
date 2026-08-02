import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar } from "../lib/helpers.jsx";

export default function Communities() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

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

  const items = Array.isArray(list) ? list : (list && list.results) || [];

  return (
    <div>
      <div className="split">
        <div>
          <div className="eyebrow">Communities</div>
          <h1>Browse communities</h1>
        </div>
      </div>

      <div style={{ height: 16 }} />
      <input
        type="text"
        placeholder="Search communities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 420 }}
      />
      <div style={{ height: 16 }} />

      <ErrorBox message={err} />

      {list === null && <div className="empty-state">Loading communities…</div>}
      {list !== null && items.length === 0 && (
        <div className="empty-state">
          {query ? `No communities match "${query}".` : "No communities yet. Be the first to create one."}
        </div>
      )}

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
    </div>
  );
}
