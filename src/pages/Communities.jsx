import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar } from "../lib/helpers.jsx";

export default function Communities() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setList(await api("/api/communities/"));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const items = Array.isArray(list) ? list : (list && list.results) || [];

  return (
    <div>
      <div className="split">
        <div>
          <div className="eyebrow">Communities</div>
          <h1>Browse communities</h1>
        </div>
      </div>

      <ErrorBox message={err} />

      {list === null && <div className="empty-state">Loading communities…</div>}
      {list !== null && items.length === 0 && (
        <div className="empty-state">No communities yet. Be the first to create one.</div>
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
