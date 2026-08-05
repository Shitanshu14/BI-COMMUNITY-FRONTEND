import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, timeAgo } from "../lib/helpers.jsx";

export default function Messages() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/chat/dm/")
      .then((res) => setRows(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  }, []);

  return (
    <div className="page">
      <div className="eyebrow">Direct messages</div>
      <h1>Messages</h1>
      <div style={{ height: 16 }} />
      <ErrorBox message={err} />

      {rows === null && <div className="empty-state">Loading…</div>}
      {rows !== null && rows.length === 0 && (
        <div className="empty-state">
          No conversations yet. Open someone's profile and tap "Message" to start one.
        </div>
      )}

      {rows &&
        rows.map((r) => (
          <div className="user-row" key={r.user.id} onClick={() => navigate("/messages/" + r.user.id)}>
            <Avatar name={r.user.username} size={44} />
            <div className="user-row-meta">
              <div className="user-row-name">
                {r.user.username}
                {r.user.is_verified && <span className="verified-tick">✓</span>}
                {r.unread && <span className="badge badge-type" style={{ marginLeft: 6 }}>new</span>}
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
