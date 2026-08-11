import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, WS_BASE } from "../lib/api.js";
import { timeAgo, Avatar } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function senderName(m) {
  return (m.sender && (m.sender.username || m.sender)) || m.sender_username || "someone";
}
function senderId(m) {
  return m.sender_id || (m.sender && m.sender.id);
}

// One component powers both room types — a Community's live chat and a
// Circle's live chat — since they're identical except for the API/WS path
// and the "join to use it" copy. `kind` picks which: "circle" or
// "community" (default). See App.jsx for the two routes that render this
// with different `kind`s.
export default function Chat({ kind = "community" }) {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCircle = kind === "circle";
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [text, setText] = useState("");
  const [roomName, setRoomName] = useState("");
  const wsRef = useRef(null);
  const logRef = useRef(null);

  const historyPath = isCircle ? "/api/chat/circle/" + roomId + "/history/" : "/api/chat/" + roomId + "/history/";
  const wsPath = isCircle ? "/ws/chat/circle/" + roomId + "/" : "/ws/chat/" + roomId + "/";
  const backLink = isCircle ? "/circles/" + roomId : "/communities/" + roomId;
  const backLabel = isCircle ? "← Back to circle" : "← Back to community";
  // Real circle/community name once loaded, so the header doesn't just
  // say the same generic "Circle chat" for every circle.
  const title = roomName || (isCircle ? "Circle chat" : "Community chat");
  const notMemberCopy = isCircle
    ? "You need to be a member of this circle to view and send messages."
    : "Join this community to view and send messages.";

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setStatus("connecting");
    setRoomName("");

    const roomPath = isCircle ? "/api/circles/" + roomId + "/" : "/api/communities/" + roomId + "/";
    api(roomPath)
      .then((r) => !cancelled && setRoomName(r.name || ""))
      .catch(() => {});

    (async () => {
      try {
        const history = await api(historyPath);
        const items = Array.isArray(history) ? history : history.results || [];
        if (!cancelled) setMessages(items.reverse());
      } catch (ex) {
        // A 403 here means "not a member yet" — surface that clearly instead
        // of silently starting an empty chat the person can't actually use.
        if (!cancelled && ex.status === 403) setStatus("not-a-member");
      }
    })();

    const ws = new WebSocket(WS_BASE + wsPath);
    wsRef.current = ws;
    ws.onopen = () => setStatus("live");
    ws.onclose = (evt) => setStatus(evt.code === 4003 ? "not-a-member" : "down");
    ws.onerror = () => setStatus((s) => (s === "not-a-member" ? s : "down"));
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setMessages((prev) => [...prev, data]);
      } catch {
        // ignore malformed frame
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, kind]);

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
      <Link className="nav-link" to={backLink}>
        {backLabel}
      </Link>
      <div style={{ height: 14 }} />
      <div className="eyebrow">Live</div>
      <h1>{title}</h1>

      <div className={"chat-status " + (status === "live" ? "live" : status === "down" || status === "not-a-member" ? "down" : "")}>
        {status === "live"
          ? "● connected"
          : status === "not-a-member"
          ? notMemberCopy
          : status === "down"
          ? "● disconnected — messages won't send"
          : "connecting…"}
      </div>

      <div className="chat-log" ref={logRef}>
        {status !== "not-a-member" && messages.length === 0 && (
          <div className="empty-state">No messages yet. Say hello.</div>
        )}
        {messages.map((m, i) => {
          const mine = senderId(m) === user?.id;
          const name = senderName(m);
          const prevMine = i > 0 ? senderId(messages[i - 1]) === user?.id : null;
          const showName = !mine && prevMine !== false;
          return (
            <div key={m.id || i}>
              {showName && <div className="bubble-who">{name}</div>}
              <div className={"bubble-row " + (mine ? "mine" : "theirs")}>
                {!mine && <Avatar name={name} size={26} />}
                <div style={{ marginLeft: mine ? 0 : 8 }}>
                  <div className="bubble">{m.message || m.body || m.text}</div>
                  {m.created_at && (
                    <div className="bubble-meta">
                      <span>{timeAgo(m.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {status !== "not-a-member" && (
        <form onSubmit={send} className="chat-input-row">
          <input
            type="text"
            placeholder="Type a message…"
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
