import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api.js";
import { Avatar, Spinner, ErrorBox } from "../lib/helpers.jsx";

// Maps the picker tab to the right REST endpoint + payload shape for
// each destination kind. All three mirror DMAttachmentUploadView's
// pattern (see chat/views.py): create the Message row, broadcast it to
// the live room over the channel layer, return the saved message.
function shareEndpoint(kind, targetId) {
  if (kind === "dm") return "/api/chat/dm/" + targetId + "/share/";
  if (kind === "community") return "/api/chat/" + targetId + "/share/";
  return "/api/chat/circle/" + targetId + "/share/";
}

const KIND_LABEL = { post: "Post", question: "Question", community: "Community", circle: "Circle" };

function ContentPreview({ item }) {
  return (
    <div className="share-preview-card">
      <div className="share-preview-icon">
        {item.image ? <img src={item.image} alt="" /> : <span>{item.type === "question" ? "❓" : item.type === "community" ? "🏘️" : item.type === "circle" ? "⭕" : "📝"}</span>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="share-preview-kind">{KIND_LABEL[item.type] || "Content"}</div>
        <div className="share-preview-title">{item.title}</div>
        {item.subtitle && <div className="share-preview-subtitle">{item.subtitle}</div>}
      </div>
    </div>
  );
}

export default function ShareSheet({ item, onClose }) {
  const [tab, setTab] = useState("dm"); // "dm" | "community" | "circle"
  const [targets, setTargets] = useState(null); // { dms, communities, circles }
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(null); // target id currently in flight
  const [sent, setSent] = useState({}); // target id -> true
  const dialogRef = useRef(null);

  useEffect(() => {
    api("/api/chat/share-targets/")
      .then(setTargets)
      .catch((ex) => setErr(ex.message));
  }, []);

  // Person search (People tab only) — same debounce pattern as
  // Messages.jsx's "new message" search, so you can share with someone
  // you haven't already DMed before.
  useEffect(() => {
    if (tab !== "dm" || !query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api("/api/search/?type=users&q=" + encodeURIComponent(query));
        setSearchResults(Array.isArray(data) ? data : data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, tab]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onBackdrop = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  const sendTo = async (kind, targetId) => {
    setSending(targetId);
    setErr("");
    try {
      await api(shareEndpoint(kind, targetId), {
        method: "POST",
        body: { share_type: item.type, share_id: item.id, body: caption.trim() },
      });
      setSent((prev) => ({ ...prev, [targetId]: true }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSending(null);
    }
  };

  const rowsFor = () => {
    if (tab === "dm") {
      if (query.trim()) return searchResults || [];
      return targets?.dms || [];
    }
    if (tab === "community") return targets?.communities || [];
    return targets?.circles || [];
  };

  const rows = rowsFor();

  return (
    <div className="modal-backdrop" ref={dialogRef} onMouseDown={onBackdrop}>
      <div className="modal-panel share-sheet">
        <div className="modal-head">
          <h3>Share</h3>
          <button type="button" className="modal-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="modal-body">
          <ContentPreview item={item} />

          <input
            type="text"
            className="share-caption-input"
            placeholder="Add a message (optional)…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div className="share-tabs">
            <button type="button" className={"share-tab" + (tab === "dm" ? " active" : "")} onClick={() => setTab("dm")}>
              👤 People
            </button>
            <button type="button" className={"share-tab" + (tab === "community" ? " active" : "")} onClick={() => setTab("community")}>
              🏘️ Communities
            </button>
            <button type="button" className={"share-tab" + (tab === "circle" ? " active" : "")} onClick={() => setTab("circle")}>
              ⭕ Circles
            </button>
          </div>

          {tab === "dm" && (
            <input
              type="text"
              className="share-caption-input"
              style={{ marginTop: 10 }}
              placeholder="Search people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}

          <ErrorBox message={err} />

          <div className="share-target-list">
            {targets === null && !err && (
              <div className="empty-state" style={{ padding: "18px 0" }}><Spinner /> Loading…</div>
            )}
            {searching && tab === "dm" && query.trim() && (
              <div className="empty-state" style={{ padding: "10px 0" }}><Spinner /> Searching…</div>
            )}
            {targets !== null && !searching && rows.length === 0 && (
              <div className="empty-state" style={{ padding: "18px 0" }}>
                {tab === "dm"
                  ? query.trim() ? "No one found." : "No conversations yet — search for someone above."
                  : tab === "community" ? "You haven't joined any communities yet." : "You aren't in any circles yet."}
              </div>
            )}
            {rows.map((t) => {
              const isSent = !!sent[t.id];
              const isBusy = sending === t.id;
              return (
                <div className="share-target-row" key={t.id}>
                  <Avatar name={t.username || t.name} src={t.avatar || t.icon} size={38} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="share-target-name">
                      {t.username || t.name}
                      {t.is_verified && <span className="verified-tick">✓</span>}
                    </div>
                    <div className="share-target-sub">
                      {tab === "dm" ? t.headline || t.role || "" : (t.member_count || 0) + " members"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={"btn btn-sm" + (isSent ? "" : " btn-primary")}
                    disabled={isBusy || isSent}
                    onClick={() => sendTo(tab, t.id)}
                  >
                    {isBusy ? <Spinner /> : isSent ? "Sent ✓" : "Send"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
