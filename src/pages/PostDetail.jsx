import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [commentBody, setCommentBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [liking, setLiking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "" });
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  useEffect(() => {
    if (post) setEditForm({ title: post.title, body: post.body });
  }, [post]);

  const isAuthor = post && user && post.author?.id === user.id;

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaveBusy(true);
    setErr("");
    try {
      const updated = await api("/api/posts/" + id + "/", { method: "PATCH", body: editForm });
      setPost((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaveBusy(false);
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleteBusy(true);
    setErr("");
    try {
      await api("/api/posts/" + id + "/", { method: "DELETE" });
      navigate("/communities/" + post.community);
    } catch (ex) {
      setErr(ex.message);
      setDeleteBusy(false);
    }
  };

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="badge badge-type">{post.post_type}</span>
            {isAuthor && !editing && (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button className="btn btn-sm" onClick={deletePost} disabled={deleteBusy}>
                  {deleteBusy ? <Spinner /> : "Delete"}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={saveEdit} style={{ marginTop: 10 }}>
              <label>Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
              <label>Body</label>
              <textarea
                value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                required
              />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn btn-primary btn-sm" disabled={saveBusy}>
                  {saveBusy ? <Spinner /> : "Save"}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 style={{ marginTop: 10 }}>{post.title}</h1>
              <p style={{ color: "var(--ink-soft)" }}>{post.body}</p>
            </>
          )}
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
