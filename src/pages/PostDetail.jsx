import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar } from "../lib/helpers.jsx";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [commentBody, setCommentBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [liking, setLiking] = useState(false);

  const load = async () => {
    try {
      const p = await api("/api/posts/" + id + "/");
      setPost(p);
      const c = await api("/api/posts/" + id + "/comments/");
      setComments(Array.isArray(c) ? c : c.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const like = async () => {
    setLiking(true);
    try {
      const res = await api("/api/posts/" + id + "/like/", { method: "POST" });
      setPost((prev) => ({ ...prev, is_liked: res.liked, like_count: res.like_count }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLiking(false);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api("/api/posts/" + id + "/comments/", { method: "POST", body: { body: commentBody } });
      setCommentBody("");
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      {post && (
        <Link className="nav-link" to={"/communities/" + post.community}>
          ← Back to community
        </Link>
      )}
      <div style={{ height: 14 }} />
      <ErrorBox message={err} />

      {!post && <div className="empty-state">Loading…</div>}

      {post && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer" }}
            onClick={() => post.author?.id && navigate("/profile/" + post.author.id)}
          >
            <Avatar name={post.author?.username || "member"} size={38} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
                {post.author?.username || "Member"}
                {post.author?.is_verified && <span style={{ color: "var(--verified)", fontSize: 12 }}>✓</span>}
              </div>
              <div className="subtle" style={{ fontSize: 12 }}>
                {post.author?.headline ? post.author.headline + " · " : ""}
                {timeAgo(post.created_at)}
              </div>
            </div>
          </div>
          <span className="badge badge-type">{post.post_type}</span>
          <h1 style={{ marginTop: 10 }}>{post.title}</h1>
          <p style={{ color: "var(--ink-soft)" }}>{post.body}</p>
          {post.image && <img src={post.image} alt="" className="post-image" />}
          <button className={"btn btn-sm" + (post.is_liked ? " btn-primary" : "")} onClick={like} disabled={liking} style={{ marginTop: 6 }}>
            {post.is_liked ? "♥" : "♡"} {post.like_count || 0} Like
          </button>
        </div>
      )}

      <div style={{ height: 30 }} />
      <h2>Comments</h2>
      <form onSubmit={addComment} style={{ marginBottom: 20 }}>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Write a comment…"
          style={{ marginBottom: 8 }}
        />
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? <Spinner /> : "Add comment"}
        </button>
      </form>

      {comments !== null && comments.length === 0 && (
        <div className="empty-state">No comments yet.</div>
      )}
      {comments &&
        comments.map((c) => (
          <div className="entry" key={c.id}>
            <div className="entry-head" style={{ marginBottom: 2 }}>
              <span
                style={{ fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                onClick={() => c.author?.id && navigate("/profile/" + c.author.id)}
              >
                {c.author?.username || "Member"}
                {c.author?.is_verified && <span className="verified-tick">✓</span>}
              </span>
            </div>
            <div className="entry-body">{c.body}</div>
            <div className="entry-meta">
              <span>{timeAgo(c.created_at)}</span>
            </div>
          </div>
        ))}
    </div>
  );
}
