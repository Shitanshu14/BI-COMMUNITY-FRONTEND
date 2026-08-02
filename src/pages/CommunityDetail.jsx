import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const POST_TYPES = [
  { value: "question", label: "Question", icon: "❓" },
  { value: "knowledge", label: "Knowledge", icon: "📘" },
  { value: "project", label: "Project", icon: "🚀" },
  { value: "resource", label: "Resource", icon: "🔖" },
  { value: "poll", label: "Poll", icon: "📊" },
];

const typeIcon = (t) => (POST_TYPES.find((p) => p.value === t) || POST_TYPES[0]).icon;

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ post_type: "question", title: "", body: "" });
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(null);

  const [joinBusy, setJoinBusy] = useState(false);

  const toggleJoin = async () => {
    if (!community) return;
    setJoinBusy(true);
    setErr("");
    try {
      const action = community.is_member ? "leave" : "join";
      const res = await api("/api/communities/" + id + "/" + action + "/", { method: "POST" });
      setCommunity((prev) => ({ ...prev, is_member: action === "join", member_count: res.member_count }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setJoinBusy(false);
    }
  };

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        api("/api/communities/" + id + "/"),
        api("/api/posts/?community=" + id),
      ]);
      setCommunity(c);
      setPosts(Array.isArray(p) ? p : p.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickType = (t) => {
    setForm({ ...form, post_type: t });
    setShowForm(true);
  };

  const onImage = (e) => {
    const file = e.target.files[0];
    setImage(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("post_type", form.post_type);
      fd.append("title", form.title);
      fd.append("body", form.body);
      fd.append("community", id);
      if (image) fd.append("image", image);
      if (form.post_type === "poll") {
        pollOptions.filter((o) => o.trim()).forEach((o) => fd.append("options", o.trim()));
      }
      await api("/api/posts/", { method: "POST", body: fd });
      setForm({ post_type: "question", title: "", body: "" });
      setPollOptions(["", ""]);
      setImage(null);
      setImagePreview(null);
      setShowForm(false);
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const setPollOption = (i) => (e) => {
    const next = [...pollOptions];
    next[i] = e.target.value;
    setPollOptions(next);
  };
  const addPollOption = () => pollOptions.length < 6 && setPollOptions([...pollOptions, ""]);
  const removePollOption = (i) => pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, idx) => idx !== i));

  const vote = async (postId, optionId) => {
    try {
      const res = await api("/api/posts/" + postId + "/vote/", { method: "POST", body: { option_id: optionId } });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, voted_option_id: res.voted_option_id, poll_options: res.options.map((o) => ({ ...o, vote_count: o.vote_count })) } : p
        )
      );
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const toggleLike = async (postId) => {
    setLikeBusy(postId);
    try {
      const res = await api("/api/posts/" + postId + "/like/", { method: "POST" });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_liked: res.liked, like_count: res.like_count } : p))
      );
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLikeBusy(null);
    }
  };

  return (
    <div>
      <Link className="nav-link" to="/communities">
        ← All communities
      </Link>
      <div style={{ height: 10 }} />

      {community && (
        <div className="split" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar name={community.name} size={48} />
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                {community.is_public ? "Open community" : "Private community"}
              </div>
              <h1 style={{ marginBottom: 0 }}>{community.name}</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {community.is_member ? (
              <>
                <span className="badge badge-verified">✓ Joined</span>
                <button className="btn btn-sm" onClick={toggleJoin} disabled={joinBusy}>
                  {joinBusy ? <Spinner /> : "Leave"}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={toggleJoin} disabled={joinBusy}>
                {joinBusy ? <Spinner /> : "Join community"}
              </button>
            )}
            <button className="btn" onClick={() => navigate("/chat/" + id)}>
              Open chat
            </button>
          </div>
        </div>
      )}

      <ErrorBox message={err} />

      <div className="feed-layout" style={{ marginTop: 20 }}>
        <div className="feed-main">
          {community && !community.is_member ? (
            <div className="card composer" style={{ textAlign: "center" }}>
              <p className="subtle" style={{ margin: "6px 0 12px" }}>
                Join this community to post, comment, and chat.
              </p>
              <button className="btn btn-primary" onClick={toggleJoin} disabled={joinBusy}>
                {joinBusy ? <Spinner /> : "Join community"}
              </button>
            </div>
          ) : (
            <div className="card composer">
              <div className="composer-placeholder" onClick={() => setShowForm(true)}>
                <Avatar name={user?.username} size={34} />
                <span>What do you want to share?</span>
              </div>
              <div className="composer-types">
                {POST_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    className={"pill-btn" + (form.post_type === t.value && showForm ? " active" : "")}
                    onClick={() => pickType(t.value)}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showForm && community?.is_member && (
            <form onSubmit={create} className="card" style={{ marginBottom: 18 }}>
              <label>Type</label>
              <select value={form.post_type} onChange={set("post_type")}>
                {POST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label>Title</label>
              <input type="text" value={form.title} onChange={set("title")} required />
              <label>Body</label>
              <textarea value={form.body} onChange={set("body")} required />
              {form.post_type === "poll" && (
                <div style={{ marginBottom: 14 }}>
                  <label>Poll options (2–6)</label>
                  {pollOptions.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        value={opt}
                        placeholder={"Option " + (i + 1)}
                        onChange={setPollOption(i)}
                        required
                      />
                      {pollOptions.length > 2 && (
                        <button type="button" className="btn btn-sm" onClick={() => removePollOption(i)}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button type="button" className="btn btn-sm" onClick={addPollOption}>
                      + Add option
                    </button>
                  )}
                </div>
              )}
              <label>Image (optional)</label>
              <input type="file" accept="image/*" onChange={onImage} style={{ marginBottom: 14 }} />
              {imagePreview && (
                <img src={imagePreview} alt="" style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 14 }} />
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? <Spinner /> : "Post"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowForm(false);
                    setImage(null);
                    setImagePreview(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {posts === null && <div className="empty-state">Loading posts…</div>}
          {posts !== null && posts.length === 0 && (
            <div className="empty-state">No posts here yet. Start the discussion.</div>
          )}

          {posts &&
            posts.map((p) => (
              <div className="post-card" key={p.id}>
                <div className="post-head">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => p.author?.id && navigate("/profile/" + p.author.id)}
                  >
                    <Avatar name={p.author?.username || "member"} size={40} />
                    <div className="post-head-meta">
                      <div className="post-author">
                        {p.author?.username || "Member"}
                        {p.author?.is_verified && <span className="verified-tick">✓</span>}
                      </div>
                      <div className="post-sub">
                        {p.author?.headline ? p.author.headline + " · " : ""}
                        {timeAgo(p.created_at)}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-type">{p.post_type}</span>
                </div>
                <div className="post-body-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="post-title" onClick={() => navigate("/posts/" + p.id)}>
                      {p.title}
                    </div>
                    <div className="post-body">{p.body}</div>
                    {p.post_type === "poll" && p.poll_options?.length > 0 && (
                      <div className="poll-options">
                        {(() => {
                          const total = p.poll_options.reduce((s, o) => s + (o.vote_count || 0), 0);
                          return p.poll_options.map((o) => {
                            const pct = total > 0 ? Math.round(((o.vote_count || 0) / total) * 100) : 0;
                            const picked = p.voted_option_id === o.id;
                            return (
                              <button
                                type="button"
                                key={o.id}
                                className={"poll-option" + (picked ? " picked" : "")}
                                onClick={() => vote(p.id, o.id)}
                              >
                                <div className="poll-option-fill" style={{ width: pct + "%" }} />
                                <span className="poll-option-label">{picked ? "✓ " : ""}{o.text}</span>
                                <span className="poll-option-pct">{pct}%</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                  {!p.image && p.post_type !== "poll" && (
                    <div className="post-visual">
                      <span>{typeIcon(p.post_type)}</span>
                    </div>
                  )}
                </div>
                {p.image && <img src={p.image} alt="" className="post-image" />}
                <div className="post-footer">
                  <button
                    className={"post-footer-action" + (p.is_liked ? " liked" : "")}
                    onClick={() => toggleLike(p.id)}
                    disabled={likeBusy === p.id}
                  >
                    {p.is_liked ? "♥" : "♡"} {p.like_count || 0}
                  </button>
                  <span className="post-footer-action" style={{ cursor: "default" }}>
                    💬 {p.comment_count || 0}
                  </span>
                  <span className="post-footer-link" onClick={() => navigate("/posts/" + p.id)}>
                    View post →
                  </span>
                </div>
              </div>
            ))}
        </div>

        {community && (
          <div className="feed-rail">
            <div className="card">
              <div className="rail-title">About community</div>
              <p className="subtle" style={{ margin: 0 }}>{community.description || "No description yet."}</p>
              {community.rules && (
                <>
                  <div style={{ height: 12 }} />
                  <div className="rail-title" style={{ fontSize: 12.5 }}>Rules</div>
                  <p className="subtle" style={{ margin: 0 }}>{community.rules}</p>
                </>
              )}
            </div>
            <div className="card">
              <div className="rail-stat-row">
                <span>Members</span>
                <span className="rail-stat-num">{community.member_count || 0}</span>
              </div>
              <div className="rail-stat-row">
                <span>Posts</span>
                <span className="rail-stat-num">{posts ? posts.length : 0}</span>
              </div>
              <div className="rail-stat-row">
                <span>Visibility</span>
                <span className="rail-stat-num">{community.is_public ? "Open" : "Private"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
