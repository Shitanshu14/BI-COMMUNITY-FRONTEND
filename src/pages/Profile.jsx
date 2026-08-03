import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { RoleBadge, timeAgo, Avatar, ErrorBox, Spinner } from "../lib/helpers.jsx";

const typeIcon = (t) =>
  ({ question: "❓", knowledge: "📖", project: "🚀", resource: "📦", poll: "📊" }[t] || "📝");

export default function Profile() {
  const { id } = useParams(); // undefined -> "my own profile"
  const { user: me, setUser: setMe } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState(null);
  const [verif, setVerif] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("posts"); // posts | communities
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ headline: "", bio: "" });
  const [saveBusy, setSaveBusy] = useState(false);

  const isOwnProfile = !id || id === me?.id;
  const profileId = id || me?.id;

  const load = async () => {
    if (!profileId) return;
    try {
      const p = await api("/api/users/" + profileId + "/");
      setProfile(p);
      const postsRes = await api("/api/posts/?author=" + profileId);
      setPosts(Array.isArray(postsRes) ? postsRes : postsRes.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    setProfile(null);
    setPosts(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    if (!isOwnProfile) return;
    api("/api/verification/me/")
      .then((v) => setVerif(Array.isArray(v) ? v : v.results || []))
      .catch(() => setVerif([]));
  }, [isOwnProfile]);

  useEffect(() => {
    if (profile) setEditForm({ headline: profile.headline || "", bio: profile.bio || "" });
  }, [profile]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaveBusy(true);
    setErr("");
    try {
      const updated = await api("/api/users/me/", { method: "PATCH", body: editForm });
      setProfile((p) => ({ ...p, ...updated }));
      setMe((u) => ({ ...u, ...updated }));
      setEditing(false);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaveBusy(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;
    setFollowBusy(true);
    setErr("");
    try {
      if (profile.follow_status) {
        await api("/api/users/" + profile.id + "/unfollow/", { method: "POST" });
        setProfile((p) => ({ ...p, is_following: false, follow_status: null, follower_count: Math.max(0, p.follower_count - 1) }));
      } else {
        const res = await api("/api/users/" + profile.id + "/follow/", { method: "POST" });
        setProfile((p) => ({
          ...p,
          follow_status: res.status,
          is_following: res.status === "accepted",
          follower_count: res.status === "accepted" ? p.follower_count + 1 : p.follower_count,
        }));
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setFollowBusy(false);
    }
  };

  if (!profile) return <div className="empty-state">{err ? <ErrorBox message={err} /> : "Loading…"}</div>;

  const followLabel = profile.follow_status === "accepted" ? "Following" : profile.follow_status === "pending" ? "Requested" : "Follow";

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        <Avatar name={profile.username} size={72} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>{isOwnProfile ? "Your profile" : "Profile"}</div>
          <h1 style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {profile.username}
            {profile.is_verified && <span className="verified-tick" style={{ fontSize: 18 }}>✓</span>}
          </h1>
          <RoleBadge role={profile.role} isVerified={profile.is_verified} />
        </div>
        {!isOwnProfile && (
          <button
            className={"btn" + (profile.follow_status ? "" : " btn-primary")}
            onClick={toggleFollow}
            disabled={followBusy}
          >
            {followBusy ? <Spinner /> : followLabel}
          </button>
        )}
        {isOwnProfile && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit profile"}
            </button>
            <button className="btn" onClick={() => navigate("/verify")}>
              Get verified
            </button>
          </div>
        )}
      </div>

      <ErrorBox message={err} />

      <div className="profile-stats">
        <div>
          <strong>{profile.post_count ?? 0}</strong> <span>Posts</span>
        </div>
        <div>
          <strong>{profile.follower_count ?? 0}</strong> <span>Followers</span>
        </div>
        <div>
          <strong>{profile.following_count ?? 0}</strong> <span>Following</span>
        </div>
        <div>
          <strong>{profile.communities?.length ?? 0}</strong> <span>Communities</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 26, marginTop: 18 }}>
        {isOwnProfile && editing ? (
          <form onSubmit={saveProfile}>
            <label>Headline</label>
            <input
              type="text"
              value={editForm.headline}
              onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
              placeholder="e.g. Class 12 student, AI enthusiast"
            />
            <label>Bio</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="A few lines about you"
            />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-primary" disabled={saveBusy}>
                {saveBusy ? <Spinner /> : "Save"}
              </button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <label>Headline</label>
            <p>{profile.headline || "—"}</p>
            <label>Bio</label>
            <p>{profile.bio || "—"}</p>
            {isOwnProfile && (
              <>
                <label>Email</label>
                <p>{profile.email}</p>
              </>
            )}
            <label>Reputation points</label>
            <p>{profile.reputation_points || 0}</p>
          </>
        )}
      </div>

      <div className="composer-types" style={{ marginBottom: 16 }}>
        <button className={"pill-btn" + (tab === "posts" ? " active" : "")} onClick={() => setTab("posts")}>
          📝 Posts
        </button>
        <button className={"pill-btn" + (tab === "communities" ? " active" : "")} onClick={() => setTab("communities")}>
          👥 Communities
        </button>
      </div>

      {tab === "posts" && (
        <>
          {posts === null && <div className="empty-state">Loading posts…</div>}
          {posts && posts.length === 0 && (
            <div className="empty-state">{isOwnProfile ? "You haven't" : "This person hasn't"} posted anything yet.</div>
          )}
          <div className="profile-post-grid">
            {posts &&
              posts.map((p) => (
                <div className="profile-post-tile" key={p.id} onClick={() => navigate("/posts/" + p.id)}>
                  {p.image ? (
                    <img src={p.image} alt="" />
                  ) : (
                    <div className="profile-post-tile-fallback">
                      <span>{typeIcon(p.post_type)}</span>
                      <div className="profile-post-tile-title">{p.title}</div>
                    </div>
                  )}
                  <div className="profile-post-tile-overlay">
                    <span>♥ {p.like_count || 0}</span>
                    <span>💬 {p.comment_count || 0}</span>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {tab === "communities" && (
        <>
          {(!profile.communities || profile.communities.length === 0) && (
            <div className="empty-state">{isOwnProfile ? "You haven't" : "This person hasn't"} joined any communities yet.</div>
          )}
          {profile.communities?.map((c) => (
            <div className="entry" key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate("/communities/" + c.id)}>
              <div className="entry-head">
                <span className="entry-title">{c.name}</span>
              </div>
              <div className="entry-meta">
                <span>{c.member_count} members</span>
              </div>
            </div>
          ))}
        </>
      )}

      {isOwnProfile && (
        <>
          <div style={{ height: 30 }} />
          <h2>Verification history</h2>
          {verif === null && <div className="empty-state">Loading…</div>}
          {verif && verif.length === 0 && <div className="empty-state">No verification requests filed yet.</div>}
          {verif &&
            verif.map((v) => (
              <div className="entry" key={v.id}>
                <div className="entry-head">
                  <span className="entry-title">{v.proof_type}</span>
                </div>
                <div className="entry-meta">
                  <span className="badge badge-role">{v.status}</span>
                  <span>{timeAgo(v.created_at)}</span>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
