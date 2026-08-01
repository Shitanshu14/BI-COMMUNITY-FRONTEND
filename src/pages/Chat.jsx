import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api, getTokens, WS_BASE } from "../lib/api.js";
import { timeAgo } from "../lib/helpers.jsx";

export default function Chat() {
  const { id: communityId } = useParams();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [text, setText] = useState("");
  const wsRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const history = await api("/api/chat/" + communityId + "/history/");
        const items = Array.isArray(history) ? history : history.results || [];
        if (!cancelled) setMessages(items.reverse());
      } catch {
        // chat can just start empty if history fails
      }
    })();

    const { access } = getTokens();
    const ws = new WebSocket(
      WS_BASE + "/ws/chat/" + communityId + "/?token=" + encodeURIComponent(access || "")
    );
    wsRef.current = ws;
    ws.onopen = () => setStatus("live");
    ws.onclose = () => setStatus("down");
    ws.onerror = () => setStatus("down");
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
  }, [communityId]);

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
    <div className="margin-page">
      <Link className="nav-link" to={"/communities/" + communityId}>
        ← Back to community
      </Link>
      <div style={{ height: 14 }} />
      <div className="eyebrow">Live</div>
      <h1>Community chat</h1>

      <div className={"chat-status " + (status === "live" ? "live" : status === "down" ? "down" : "")}>
        {status === "live"
          ? "● connected"
          : status === "down"
          ? "● disconnected — messages won't send"
          : "connecting…"}
      </div>

      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && <div className="empty-state">No messages yet. Say hello.</div>}
        {messages.map((m, i) => (
          <div className="chat-msg" key={m.id || i}>
            <span className="who">
              {(m.sender && (m.sender.username || m.sender)) || m.sender_username || "someone"}
            </span>
            <span>{m.message || m.body || m.text}</span>
            {m.created_at && <span className="when">{timeAgo(m.created_at)}</span>}
          </div>
        ))}
      </div>

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
    </div>
  );
}
