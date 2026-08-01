import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ post_type: "question", title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        api("/api/communities/" + id + "/"),
        api("/api/posts/"),
      ]);
      setCommunity(c);
      const all = Array.isArray(p) ? p : p.results || [];
      setPosts(all.filter((post) => post.community === id));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/posts/", { method: "POST", body: { ...form, community: id } });
      setForm({ post_type: "question", title: "", body: "" });
      setShowForm(false);
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
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
          <button className="btn" onClick={() => navigate("/chat/" + id)}>
            💬 Open chat
          </button>
        </div>
      )}

      <ErrorBox message={err} />

      <div className="feed-layout" style={{ marginTop: 20 }}>
        <div className="feed-main">
          <div className="card post-composer" onClick={() => setShowForm(true)}>
            <Avatar name={user?.username} size={34} />
            <input type="text" placeholder="What do you want to share?" readOnly />
          </div>

          {showForm && (
            <form onSubmit={create} className="card" style={{ marginBottom: 18 }}>
              <label>Type</label>
              <select value={form.post_type} onChange={set("post_type")}>
                <option value="question">Question</option>
                <option value="discussion">Discussion</option>
                <option value="resource">Resource</option>
                <option value="announcement">Announcement</option>
              </select>
              <label>Title</label>
              <input type="text" value={form.title} onChange={set("title")} required />
              <label>Body</label>
              <textarea value={form.body} onChange={set("body")} required />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? <Spinner /> : "Post"}
                </button>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>
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
                  <Avatar name={p.author_username || p.author?.username || "user"} size={40} />
                  <div className="post-head-meta">
                    <div className="post-author">{p.author_username || p.author?.username || "Member"}</div>
                    <div className="post-sub">{timeAgo(p.created_at)}</div>
                  </div>
                  <span className="badge badge-type">{p.post_type}</span>
                </div>
                <div className="post-title" onClick={() => navigate("/posts/" + p.id)}>
                  {p.title}
                </div>
                <div className="post-body">{p.body}</div>
                <div className="post-footer">
                  <span className="post-footer-action">♥ {p.likes ? p.likes.length : 0}</span>
                  <span className="post-footer-action">💬 {p.comment_count || 0}</span>
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
