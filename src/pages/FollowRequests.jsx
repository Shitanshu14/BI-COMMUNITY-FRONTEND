import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, Skeleton, timeAgo } from "../lib/helpers.jsx";

export default function FollowRequests() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api("/api/follow-requests/")
      .then((res) => setList(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  };

  useEffect(load, []);

  const respond = async (id, action) => {
    setBusyId(id);
    setErr("");
    try {
      await api("/api/follow-requests/" + id + "/" + action + "/", { method: "POST" });
      // Both accept and reject remove the request from this inbox — accept
      // because it's no longer pending, reject because it's deleted server-side.
      setList((prev) => prev.filter((r) => r.id !== id));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="eyebrow">Follow requests</div>
      <h1>Waiting for your approval</h1>

      <div style={{ height: 16 }} />
      <ErrorBox message={err} />

      {list === null &&
        [...Array(3)].map((_, i) => (
          <div className="entry" key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton width={40} height={40} radius="50%" />
            <Skeleton width="40%" height={14} />
          </div>
        ))}

      {list !== null && list.length === 0 && (
        <div className="empty-state">No pending follow requests right now.</div>
      )}

      {list !== null &&
        list.map((r) => (
          <div className="entry" key={r.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
              onClick={() => navigate("/profile/" + r.follower.id)}
            >
              <Avatar name={r.follower.username} size={40} />
              <div>
                <div style={{ fontWeight: 700 }}>
                  {r.follower.username}
                  {r.follower.is_verified && <span className="verified-tick">✓</span>}
                </div>
                <div className="entry-meta">
                  <span>wants to follow you · {timeAgo(r.created_at)}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => respond(r.id, "accept")} disabled={busyId === r.id}>
                Accept
              </button>
              <button className="btn btn-sm" onClick={() => respond(r.id, "reject")} disabled={busyId === r.id}>
                Reject
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
