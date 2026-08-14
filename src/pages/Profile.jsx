import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { RoleBadge, timeAgo, Avatar, ErrorBox, Spinner, VideoEmbed } from "../lib/helpers.jsx";
import { typeIcon, groupLabel, subtypeLabel } from "../lib/postTypes.js";
import { extractVideoEmbed } from "../lib/embed.js";
import PostExtras from "../components/PostExtras.jsx";

/** "Saved" used to be its own sidebar page — now it's a tab on your own
 * profile, right next to Posts, so everything about you lives in one place. */
function SavedTab() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api("/api/posts/?saved=true")
      .then((res) => !cancelled && setPosts(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => !cancelled && setErr(ex.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const unsave = async (postId) => {
    setBusy(postId);
    try {
      await api("/api/posts/" + postId + "/save/", { method: "POST" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ErrorBox message={err} />
      {posts === null && <div className="empty-state">Loading…</div>}
      {posts !== null && posts.length === 0 && (
        <div className="empty-state">Nothing saved yet. Tap 🔖 Save on any post to keep it here.</div>
      )}
      {posts &&
        posts.map((p) => (
          <div className="post-card post-card-compact" key={p.id}>
            <div className="post-head">
              <Avatar name={p.author?.username || "member"} src={p.author?.avatar} size={32} />
              <div className="post-head-meta">
                <div className="post-author" onClick={() => p.author?.id && navigate("/profile/" + p.author.id)} style={{ cursor: "pointer" }}>
                  {p.author?.username || "Member"}
                  {p.author?.is_verified && <span className="verified-tick">✓</span>}
                </div>
                <div className="post-sub">{timeAgo(p.created_at)}</div>
              </div>
              <span className="badge badge-type">{typeIcon(p)} {groupLabel(p)}</span>
            </div>
            <div className="post-title" onClick={() => navigate("/posts/" + p.id)}>{p.title}</div>
            <p className="post-body">{p.body}</p>
            <PostExtras post={p} compact />
            {p.image && <img src={p.image} alt="" className="post-image" loading="lazy" decoding="async" />}
            {(() => {
              const embed = extractVideoEmbed(p.body);
              return embed && <VideoEmbed src={embed.src} provider={embed.provider} />;
            })()}
            <div className="post-footer">
              <button className="post-footer-action saved" onClick={() => unsave(p.id)} disabled={busy === p.id}>
                🔖 Remove
              </button>
              <span className="post-footer-spacer" />
              <span className="post-footer-link" onClick={() => navigate("/posts/" + p.id)}>View post →</span>
            </div>
          </div>
        ))}
    </>
  );
}

/** "Get verified" used to be its own sidebar page — now a tab on your own
 * profile: request form + status history, side by side. */
function VerifyTab({ verif, onFiled }) {
  const [form, setForm] = useState({ proof_type: "student_id", note: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await api("/api/verification/request/", { method: "POST", body: form });
      setMsg("Request filed. We'll review it soon.");
      setForm({ proof_type: "student_id", note: "" });
      onFiled?.();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="verify-tab-grid">
      <form onSubmit={submit} className="card">
        <div className="eyebrow" style={{ marginBottom: 4 }}>Get your badge</div>
        <p className="subtle" style={{ marginTop: 0 }}>Verified members carry a mark of trust across every community.</p>
        <ErrorBox message={err} />
        {msg && <div className="chat-status live" style={{ marginBottom: 14 }}>{msg}</div>}
        <label>Proof type</label>
        <select value={form.proof_type} onChange={set("proof_type")}>
          <option value="student_id">Student ID</option>
          <option value="employee_id">Employee ID</option>
          <option value="certificate">Certificate</option>
          <option value="other">Other</option>
        </select>
        <label>Note</label>
        <textarea value={form.note} onChange={set("note")} placeholder="Anything reviewers should know" />
        <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Submit request"}
        </button>
      </form>

      <div>
        <h3 style={{ marginTop: 0 }}>History</h3>
        {verif === null && <div className="empty-state">Loading…</div>}
        {verif && verif.length === 0 && <div className="empty-state">No verification requests filed yet.</div>}
        {verif &&
          verif.map((v) => (
            <div className="entry" key={v.id}>
              <div className="entry-head">
                <span className="entry-title">{v.proof_type}</span>
              </div>
              <div className="entry-meta">
                <span className={"badge " + (v.status === "approved" ? "badge-solved" : v.status === "rejected" ? "badge-unsolved" : "badge-role")}>{v.status}</span>
                <span>{timeAgo(v.created_at)}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function FollowListModal({ userId, kind, onClose }) {
  // kind: "followers" | "following"
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api("/api/users/" + userId + "/" + kind + "/")
      .then((res) => !cancelled && setList(Array.isArray(res) ? res : res.results || []))
      .catch((ex) => !cancelled && setErr(ex.message));
    return () => {
      cancelled = true;
    };
  }, [userId, kind]);

  const goTo = (u) => {
    onClose();
    navigate("/profile/" + u.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{kind === "followers" ? "Followers" : "Following"}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {err && <ErrorBox message={err} />}
          {list === null && !err && <div className="empty-state">Loading…</div>}
          {list && list.length === 0 && (
            <div className="empty-state">{kind === "followers" ? "No followers yet." : "Not following anyone yet."}</div>
          )}
          {list &&
            list.map((u) => (
              <div className="user-row" key={u.id} onClick={() => goTo(u)}>
                <Avatar name={u.username} src={u.avatar} size={38} />
                <div className="user-row-meta">
                  <div className="user-row-name">
                    {u.username}
                    {u.is_verified && <span className="verified-tick">✓</span>}
                  </div>
                  <div className="user-row-sub">{u.headline || u.role}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams(); // undefined -> "my own profile"
  const { user: me, setUser: setMe } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState(null);
  const [verif, setVerif] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("posts"); // posts | communities
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ headline: "", bio: "" });
  const [saveBusy, setSaveBusy] = useState(false);
  const [listModal, setListModal] = useState(null); // "followers" | "following" | null
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const HEADLINE_MAX = 100;
  const BIO_MAX = 280;

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
      let body = editForm;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("headline", editForm.headline);
        fd.append("bio", editForm.bio);
        fd.append("avatar", avatarFile);
        body = fd;
      }
      const updated = await api("/api/users/me/", { method: "PATCH", body });
      setProfile((p) => ({ ...p, ...updated }));
      setMe((u) => ({ ...u, ...updated }));
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaveBusy(false);
    }
  };

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr("Image must be under 5MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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

  const toggleBlock = async () => {
    if (!profile) return;
    const action = profile.is_blocked ? "unblock" : "block";
    if (action === "block" && !window.confirm(`Block ${profile.username}? You'll stop seeing each other's posts, comments, and follows.`)) {
      return;
    }
    setBlockBusy(true);
    setErr("");
    try {
      await api("/api/users/" + profile.id + "/" + action + "/", { method: "POST" });
      setProfile((p) => ({
        ...p,
        is_blocked: action === "block",
        // Blocking also drops any existing follow relationship server-side.
        is_following: action === "block" ? false : p.is_following,
        follow_status: action === "block" ? null : p.follow_status,
      }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBlockBusy(false);
    }
  };

  if (!profile) return <div className="empty-state">{err ? <ErrorBox message={err} /> : "Loading…"}</div>;

  const followLabel = profile.follow_status === "accepted" ? "Following" : profile.follow_status === "pending" ? "Requested" : "Follow";

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        <div className="profile-avatar-wrap">
          <Avatar name={profile.username} src={avatarPreview || profile.avatar} size={72} />
          {isOwnProfile && editing && (
            <label className="profile-avatar-edit" title="Change profile picture">
              📷
              <input type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
            </label>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>{isOwnProfile ? "Your profile" : "Profile"}</div>
          <h1 style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {profile.username}
            {profile.is_verified && <span className="verified-tick" style={{ fontSize: 18 }}>✓</span>}
          </h1>
          <RoleBadge role={profile.role} isVerified={profile.is_verified} />
        </div>
        {!isOwnProfile && !profile.has_blocked_me && (
          <div style={{ display: "flex", gap: 8 }}>
            {!profile.is_blocked && (
              <button
                className={"btn" + (profile.follow_status ? "" : " btn-primary")}
                onClick={toggleFollow}
                disabled={followBusy}
              >
                {followBusy ? <Spinner /> : followLabel}
              </button>
            )}
            {!profile.is_blocked && (
              <button className="btn btn-sm" onClick={() => navigate("/messages/" + profile.id)}>
                ✉️ Message
              </button>
            )}
            <button
              className="btn btn-sm"
              onClick={toggleBlock}
              disabled={blockBusy}
              style={profile.is_blocked ? {} : { color: "var(--danger)" }}
            >
              {blockBusy ? <Spinner /> : profile.is_blocked ? "Unblock" : "Block"}
            </button>
          </div>
        )}
        {!isOwnProfile && profile.has_blocked_me && (
          <span className="badge badge-role">Unavailable</span>
        )}
        {isOwnProfile && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit profile"}
            </button>
            {!profile.is_verified && (
              <button className="btn" onClick={() => setTab("verify")}>
                ✓ Get verified
              </button>
            )}
          </div>
        )}
      </div>

      <ErrorBox message={err} />

      <div className="profile-stats">
        <div>
          <strong>{profile.post_count ?? 0}</strong> <span>Posts</span>
        </div>
        <div className="profile-stat-clickable" onClick={() => setListModal("followers")}>
          <strong>{profile.follower_count ?? 0}</strong> <span>Followers</span>
        </div>
        <div className="profile-stat-clickable" onClick={() => setListModal("following")}>
          <strong>{profile.following_count ?? 0}</strong> <span>Following</span>
        </div>
        <div>
          <strong>{profile.communities?.length ?? 0}</strong> <span>Communities</span>
        </div>
      </div>

      {listModal && <FollowListModal userId={profile.id} kind={listModal} onClose={() => setListModal(null)} />}

      <div className="card" style={{ marginBottom: 26, marginTop: 18 }}>
        {isOwnProfile && editing ? (
          <form onSubmit={saveProfile}>
            <label>Headline <span className="char-count">{editForm.headline.length}/{HEADLINE_MAX}</span></label>
            <input
              type="text"
              value={editForm.headline}
              maxLength={HEADLINE_MAX}
              onChange={(e) => setEditForm({ ...editForm, headline: e.target.value.slice(0, HEADLINE_MAX) })}
              placeholder="e.g. Class 12 student, AI enthusiast"
            />
            <label>Bio <span className="char-count">{editForm.bio.length}/{BIO_MAX}</span></label>
            <textarea
              value={editForm.bio}
              maxLength={BIO_MAX}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value.slice(0, BIO_MAX) })}
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
        {isOwnProfile && (
          <button className={"pill-btn" + (tab === "saved" ? " active" : "")} onClick={() => setTab("saved")}>
            🔖 Saved
          </button>
        )}
        {isOwnProfile && (
          <button className={"pill-btn" + (tab === "verify" ? " active" : "")} onClick={() => setTab("verify")}>
            ✓ Verification
          </button>
        )}
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
                    <img src={p.image} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <div className="profile-post-tile-fallback">
                      <span>{typeIcon(p)}</span>
                      <div className="profile-post-tile-title">{p.title}</div>
                    </div>
                  )}
                  <div className="profile-post-tile-overlay">
                    <span>♥ {p.like_count || 0}</span>
                    <span>💬 {p.comment_count || 0}</span>
                    {p.post_type === "question" && p.is_solved && <span>✓ Solved</span>}
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

      {isOwnProfile && tab === "saved" && <SavedTab />}

      {isOwnProfile && tab === "verify" && (
        <VerifyTab
          verif={verif}
          onFiled={() => {
            api("/api/verification/me/")
              .then((v) => setVerif(Array.isArray(v) ? v : v.results || []))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
