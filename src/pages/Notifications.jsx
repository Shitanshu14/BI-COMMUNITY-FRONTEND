import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, Skeleton, timeAgo } from "../lib/helpers.jsx";

// Where a notification's `target_id` points, by verb — mirrors exactly how
// each verb is created (see backend create_notification.delay call sites:
// posts/views.py, communities/views.py, circles/views.py, follows/views.py,
// verification/admin.py). Keeping this table here means adding a new verb
// on the backend is a two-line change: add the Verb choice, add a row here.
const TARGET_ROUTE = {
  post_liked: (n) => "/posts/" + n.target_id,
  comment_liked: (n) => "/posts/" + n.target_id,
  post_commented: (n) => "/posts/" + n.target_id,
  comment_replied: (n) => "/posts/" + n.target_id,
  community_joined: (n) => "/communities/" + n.target_id,
  circle_invited: (n) => "/circles/" + n.target_id,
  circle_invite_accepted: (n) => "/circles/" + n.target_id,
  // These three carry the *circle's* id in target_id, not the question's/
  // event's own id (Notification only has one generic target_id field, and
  // the real route is nested under the circle) — route to the relevant
  // list page rather than a specific item.
  circle_question_answered: (n) => "/circles/" + n.target_id + "/qa",
  circle_answer_accepted: (n) => "/circles/" + n.target_id + "/qa",
  circle_event_created: (n) => "/circles/" + n.target_id + "/events",
  // Follow-request accept/reject lives in its own inbox now — see
  // FollowRequests.jsx / MyFollowRequestsView — so this opens that instead
  // of the requester's profile (which had no accept/reject action on it).
  new_follower: (n) => "/profile/" + n.actor?.id,
  follow_requested: () => "/follow-requests",
  follow_accepted: (n) => "/profile/" + n.actor?.id,
  verification_approved: () => "/verify",
  verification_rejected: () => "/verify",
};

const VERB_ICON = {
  post_liked: "❤️",
  comment_liked: "❤️",
  post_commented: "💬",
  comment_replied: "💬",
  community_joined: "🧑‍🤝‍🧑",
  circle_invited: "🎯",
  circle_invite_accepted: "🎯",
  circle_question_answered: "💬",
  circle_answer_accepted: "✅",
  circle_event_created: "📅",
  new_follower: "➕",
  follow_requested: "➕",
  follow_accepted: "✅",
  verification_approved: "✓",
  verification_rejected: "✕",
};

export default function Notifications() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = () => {
    api("/api/notifications/")
      .then((res) => setList(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => setErr(ex.message));
  };

  useEffect(load, []);

  const openNotification = async (n) => {
    if (!n.is_read) {
      // Optimistic — don't make the click feel laggy waiting on the read
      // receipt round trip.
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      api("/api/notifications/" + n.id + "/read/", { method: "POST" }).catch(() => {});
    }
    // `actor` can be null — the person who triggered this was deleted
    // since (Notification.actor is on_delete=SET_NULL). Any route that
    // depends on actor.id has to skip navigating rather than sending
    // someone to /profile/undefined.
    const buildRoute = TARGET_ROUTE[n.verb];
    if (!buildRoute) return;
    const route = buildRoute(n);
    if (route.endsWith("/undefined")) return;
    navigate(route);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api("/api/notifications/mark-all-read/", { method: "POST" });
      setList((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = (list || []).some((n) => !n.is_read);

  return (
    <div className="page">
      <div className="split">
        <div>
          <div className="eyebrow">Notifications</div>
          <h1>What's new</h1>
        </div>
        {hasUnread && (
          <button className="btn btn-sm" onClick={markAllRead} disabled={markingAll}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ height: 16 }} />
      <ErrorBox message={err} />

      {list === null &&
        [...Array(5)].map((_, i) => (
          <div className="entry" key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton width={36} height={36} radius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="30%" height={12} />
            </div>
          </div>
        ))}

      {list !== null && list.length === 0 && (
        <div className="empty-state">No notifications yet — likes, comments, and invites will show up here.</div>
      )}

      {list !== null &&
        list.map((n) => (
          <div
            className="entry"
            key={n.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              cursor: "pointer",
              background: n.is_read ? "transparent" : "var(--accent-gradient-soft)",
              boxShadow: n.is_read ? "none" : "var(--glow-primary-soft)",
              borderRadius: n.is_read ? 0 : "var(--radius)",
              padding: n.is_read ? "14px 0" : "14px 10px",
              transition: "background 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => openNotification(n)}
          >
            <Avatar name={n.actor?.username || "?"} src={n.actor?.avatar} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{n.actor?.username || "Someone"}</strong> {n.verb_display}
              </div>
              <div className="entry-meta" style={{ marginTop: 2 }}>
                <span>{VERB_ICON[n.verb] || "🔔"}</span>
                <span>{timeAgo(n.created_at)}</span>
              </div>
            </div>
            {!n.is_read && <span className="unread-dot" />}
          </div>
        ))}
    </div>
  );
}
