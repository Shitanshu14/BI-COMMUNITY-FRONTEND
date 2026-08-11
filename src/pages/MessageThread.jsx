import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api, WS_BASE } from "../lib/api.js";
import { timeAgo, Avatar, ErrorBox } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// A message from history has a nested `sender: {id, username, ...}`; a
// message that arrived live over the WebSocket has a flat `sender_id`
// string instead (see chat/consumers.py's group_send payload). This
// normalizes both shapes to a single id for comparison.
function senderId(m) {
  return m.sender_id || (m.sender && m.sender.id);
}

export default function MessageThread() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const wsRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setStatus("connecting");
    setErr("");

    (async () => {
      try {
        // Validates the DM is allowed (not yourself, not blocked) and gets
        // the other person's profile so the header has a name even with
        // zero message history yet.
        const profile = await api("/api/chat/dm/" + userId + "/start/", { method: "POST" });
        if (cancelled) return;
        setOtherUser(profile);

        const history = await api("/api/chat/dm/" + userId + "/history/");
        const items = Array.isArray(history) ? history : history.results || [];
        if (!cancelled) setMessages(items.reverse());
      } catch (ex) {
        if (!cancelled) {
          setErr(ex.message);
          setStatus("down");
        }
        return;
      }

      if (cancelled) return;
      const ws = new WebSocket(WS_BASE + "/ws/dm/" + userId + "/");
      wsRef.current = ws;
      ws.onopen = () => setStatus("live");
      ws.onclose = (evt) => setStatus(evt.code === 4003 ? "blocked" : "down");
      ws.onerror = () => setStatus((s) => (s === "blocked" ? s : "down"));
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === "read_receipt") {
            // The other person just opened/refreshed the thread — flip my
            // sent messages to "read" so the ticks update live.
            if (data.reader_id === userId) {
              setMessages((prev) =>
                prev.map((m) => (senderId(m) === user.id ? { ...m, read_at: new Date().toISOString() } : m))
              );
            }
            return;
          }
          setMessages((prev) => [...prev, data]);
        } catch {
          // ignore malformed frame
        }
      };
    })();

    return () => {
      cancelled = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, [userId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ message: text }));
    setText("");
  };

  return (
    <div className="page">
      <Link className="nav-link" to="/messages">
        ← Back to messages
      </Link>
      <div style={{ height: 14 }} />
      <ErrorBox message={err} />

      {otherUser && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Avatar name={otherUser.username} size={38} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>
              {otherUser.username}
              {otherUser.is_verified && <span className="verified-tick">✓</span>}
            </h1>
            <div className="subtle" style={{ fontSize: 12 }}>{otherUser.headline || otherUser.role}</div>
          </div>
        </div>
      )}

      {!err && (
        <div className={"chat-status " + (status === "live" ? "live" : status === "down" || status === "blocked" ? "down" : "")}>
          {status === "live"
            ? "● connected"
            : status === "blocked"
            ? "You can't message this user."
            : status === "down"
            ? "● disconnected — messages won't send"
            : "connecting…"}
        </div>
      )}

      <div className="chat-log" ref={logRef}>
        {status !== "blocked" && !err && messages.length === 0 && (
          <div className="empty-state">No messages yet. Say hello.</div>
        )}
        {messages.map((m, i) => {
          const mine = senderId(m) === user.id;
          return (
            <div className={"bubble-row " + (mine ? "mine" : "theirs")} key={m.id || i}>
              {!mine && <Avatar name={otherUser?.username || "member"} size={26} />}
              <div style={{ marginLeft: mine ? 0 : 8 }}>
                <div className="bubble">{m.message || m.body || m.text}</div>
                <div className="bubble-meta">
                  {m.created_at && <span>{timeAgo(m.created_at)}</span>}
                  {mine && (
                    <span className={"read-tick" + (m.read_at ? " read" : "")} title={m.read_at ? "Read" : "Sent"}>
                      {m.read_at ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {status !== "blocked" && !err && (
        <form onSubmit={send} className="chat-input-row">
          <input
            type="text"
            placeholder={"Message " + (otherUser?.username || "") + "…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary" disabled={status !== "live"}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
