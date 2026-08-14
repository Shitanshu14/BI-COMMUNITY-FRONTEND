import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Avatar, ErrorBox, Spinner, timeAgo } from "../lib/helpers.jsx";

const RSVP_OPTS = [
  { value: "going", label: "Going", icon: "✅" },
  { value: "maybe", label: "Maybe", icon: "🤔" },
  { value: "declined", label: "Can't go", icon: "✕" },
];

function fmtWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/** Circle events board — lightweight shared calendar for a circle: title,
 * time, optional location (a URL, a room name, an address — whatever
 * "where we meet" means for this group), and a going/maybe/can't-go RSVP.
 * Sits alongside chat and Q&A as the third circle-only surface. */
export default function CircleEvents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [circle, setCircle] = useState(null);
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rsvpBusyId, setRsvpBusyId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", starts_at: "", location: "" });

  const load = async () => {
    try {
      const [c, evs] = await Promise.all([
        api("/api/circles/" + id + "/"),
        api("/api/circles/" + id + "/events/"),
      ]);
      setCircle(c);
      setEvents(Array.isArray(evs) ? evs : evs.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_at) return;
    setBusy(true);
    setErr("");
    try {
      const ev = await api("/api/circles/" + id + "/events/", {
        method: "POST",
        body: { ...form, starts_at: new Date(form.starts_at).toISOString() },
      });
      setEvents((prev) => [...(prev || []), ev].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)));
      setForm({ title: "", description: "", starts_at: "", location: "" });
      setCreating(false);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const rsvp = async (eventId, status) => {
    setRsvpBusyId(eventId);
    try {
      const updated = await api("/api/circles/" + id + "/events/" + eventId + "/rsvp/", {
        method: "POST",
        body: { status },
      });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setRsvpBusyId(null);
    }
  };

  const removeEvent = async (eventId) => {
    if (!window.confirm("Delete this event for everyone?")) return;
    try {
      await api("/api/circles/" + id + "/events/" + eventId + "/", { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const upcoming = (events || []).filter((e) => !e.is_past);
  const past = (events || []).filter((e) => e.is_past);

  return (
    <div className="page">
      <Link className="nav-link" to={"/circles/" + id}>
        ← Back to circle
      </Link>
      <div style={{ height: 14 }} />

      <div className="split">
        <div>
          <div className="eyebrow">Events</div>
          <h1>{circle ? circle.name : "Circle"} — schedule</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/circles/" + id + "/qa")}>
            ❓ Q&amp;A
          </button>
          <button className="btn" onClick={() => navigate("/circles/" + id + "/chat")}>
            💬 Live chat
          </button>
          <button className="btn btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "📅 Schedule event"}
          </button>
        </div>
      </div>

      <ErrorBox message={err} />

      {creating && (
        <form onSubmit={submit} className="card" style={{ marginBottom: 20, marginTop: 12 }}>
          <label>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Weekly sync, Portfolio review call"
            autoFocus
          />
          <label>When</label>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          />
          <label>Where (optional)</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Zoom link, Discord channel, address — anything"
          />
          <label>Details (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Agenda, what to bring, anything else"
          />
          <button className="btn btn-primary" disabled={busy || !form.title.trim() || !form.starts_at}>
            {busy ? <Spinner /> : "Schedule"}
          </button>
        </form>
      )}

      <div style={{ height: 10 }} />

      {events === null && <div className="empty-state">Loading events…</div>}
      {events !== null && upcoming.length === 0 && past.length === 0 && (
        <div className="empty-state">No events yet. Schedule the first one.</div>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="rail-title" style={{ fontSize: 15, marginBottom: 10 }}>Upcoming</div>
          <div className="event-list">
            {upcoming.map((ev) => (
              <EventRow key={ev.id} ev={ev} onRsvp={rsvp} onDelete={removeEvent} busyId={rsvpBusyId} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="rail-title" style={{ fontSize: 15, margin: "22px 0 10px" }}>Past</div>
          <div className="event-list event-list-past">
            {past.map((ev) => (
              <EventRow key={ev.id} ev={ev} onRsvp={rsvp} onDelete={removeEvent} busyId={rsvpBusyId} past />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventRow({ ev, onRsvp, onDelete, busyId, past }) {
  return (
    <div className={"event-card" + (past ? " event-card-past" : "")}>
      <div className="event-card-date">
        <span className="event-card-day">{new Date(ev.starts_at).getDate()}</span>
        <span className="event-card-month">
          {new Date(ev.starts_at).toLocaleString(undefined, { month: "short" })}
        </span>
      </div>
      <div className="event-card-main">
        <div className="event-card-title">{ev.title}</div>
        <div className="event-card-meta">
          🕐 {fmtWhen(ev.starts_at)}
          {ev.location && <> · 📍 {ev.location}</>}
        </div>
        {ev.description && <div className="event-card-desc">{ev.description}</div>}
        <div className="event-card-footer">
          <span className="event-card-going">
            <Avatar name={ev.created_by?.username} src={ev.created_by?.avatar} size={18} /> {ev.going_count} going
          </span>
          {!past && (
            <div className="event-rsvp-group">
              {RSVP_OPTS.map((o) => (
                <button
                  key={o.value}
                  className={"pill-btn pill-btn-sm" + (ev.my_rsvp === o.value ? " active" : "")}
                  disabled={busyId === ev.id}
                  onClick={() => onRsvp(ev.id, o.value)}
                >
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="event-card-delete" title="Delete event" onClick={() => onDelete(ev.id)}>
        ✕
      </button>
    </div>
  );
}
