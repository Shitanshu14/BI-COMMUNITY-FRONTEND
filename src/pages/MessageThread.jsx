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

// Picks whichever shared_* field a message carries (a message only ever
// has zero or one — see chat/models.py Message docstring) and normalizes
// it to a common shape SharedMessageCard can render regardless of kind.
export function sharedContentOf(m) {
  if (m.shared_post) return { kind: m.shared_post.post_type === "question" ? "question" : "post", data: m.shared_post };
  if (m.shared_question) return { kind: "circle-question", data: m.shared_question };
  if (m.shared_community) return { kind: "community", data: m.shared_community };
  if (m.shared_circle) return { kind: "circle", data: m.shared_circle };
  return null;
}

const SHARED_KIND_META = {
  post: { icon: "📝", label: "Post" },
  question: { icon: "❓", label: "Question" },
  "circle-question": { icon: "❓", label: "Circle question" },
  community: { icon: "🏘️", label: "Community" },
  circle: { icon: "⭕", label: "Circle" },
};

// WhatsApp-style "forwarded content" card — renders inline inside a chat
// bubble instead of the message just being a raw link, and is itself
// clickable through to the real thing (post detail, Q&A thread, or the
// community/circle page to join). Shared between MessageThread.jsx (DMs)
// and Chat.jsx (community/circle live chat) since a shared message looks
// the same regardless of which room it lands in.
export function SharedMessageCard({ shared, mine }) {
  const { kind, data } = shared;
  const meta = SHARED_KIND_META[kind];
  const image = data.image || data.icon || null;
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [image]);

  let href = "#";
  let title = data.title || data.name;
  let subtitle = "";
  if (kind === "post" || kind === "question") {
    href = "/posts/" + data.id;
    subtitle = data.community_name ? "in " + data.community_name : "";
  } else if (kind === "circle-question") {
    href = "/circles/" + data.circle + "/qa/" + data.id;
    subtitle = data.circle_name ? "in " + data.circle_name : "";
  } else if (kind === "community") {
    href = "/communities/" + data.id;
    subtitle = (data.member_count || 0) + " members";
  } else if (kind === "circle") {
    href = "/circles/" + data.id;
    subtitle = (data.member_count || 0) + " members";
  }

  return (
    <Link to={href} className={"shared-card" + (mine ? " mine" : "")}>
      <div className="shared-card-media">
        {image && !imgFailed ? (
          <img src={image} alt="" onError={() => setImgFailed(true)} />
        ) : (
          <span className="shared-card-icon">{meta.icon}</span>
        )}
      </div>
      <div className="shared-card-body">
        <div className="shared-card-kind">{meta.icon} {meta.label}</div>
        <div className="shared-card-title">{title}</div>
        {subtitle && <div className="shared-card-subtitle">{subtitle}</div>}
        {(kind === "community" || kind === "circle") && (
          <div className="shared-card-cta">View &amp; join →</div>
        )}
      </div>
    </Link>
  );
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
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

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
                prev.map((m) => (senderId(m) === userIdRef.current ? { ...m, read_at: new Date().toISOString() } : m))
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
        <div className="chat-header">
          <div className="chat-header-avatar">
            <Avatar name={otherUser.username} src={otherUser.avatar} size={42} />
            {status === "live" && <span className="chat-header-dot" title="Online" />}
          </div>
          <div className="chat-header-meta">
            <h1>
              <span className="truncate">{otherUser.username}</span>
              {otherUser.is_verified && <span className="verified-tick">✓</span>}
            </h1>
            <div className={"chat-header-status " + (status === "live" ? "live" : status === "down" || status === "blocked" ? "down" : "")}>
              {status === "live"
                ? "online"
                : status === "blocked"
                ? "You can't message this user."
                : status === "down"
                ? "disconnected — messages won't send"
                : otherUser.headline || otherUser.role || "connecting…"}
            </div>
          </div>
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
              {!mine && <Avatar name={otherUser?.username || "member"} src={otherUser?.avatar} size={26} />}
              <div className="bubble-col" style={{ marginLeft: mine ? 0 : 8 }}>
                {sharedContentOf(m) ? (
                  <div className={"bubble bubble-shared" + (mine ? " mine-media" : "")}>
                    <SharedMessageCard shared={sharedContentOf(m)} mine={mine} />
                    {m.body && <div className="bubble-caption">{m.body}</div>}
                  </div>
                ) : (
                  <div className="bubble">{m.message || m.body || m.text}</div>
                )}
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
          <button className="chat-send-btn" disabled={status !== "live" || !text.trim()} aria-label="Send message" title="Send">
            ➤
          </button>
        </form>
      )}
    </div>
  );
}
