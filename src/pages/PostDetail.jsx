import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar, VideoEmbed } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { typeIcon, subtypeLabel, groupLabel } from "../lib/postTypes.js";
import { extractVideoEmbed } from "../lib/embed.js";

function CommentThread({ comment, postId, onReplyAdded, depth = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showReplies, setShowReplies] = useState(depth === 0);
  const [isLiked, setIsLiked] = useState(comment.is_liked || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [likeBusy, setLikeBusy] = useState(false);

  const toggleCommentLike = async () => {
    if (!user || likeBusy) return;
    setLikeBusy(true);
    // Optimistic update — a comment like is low-stakes, so we flip the UI
    // immediately and only roll back on an actual error instead of waiting
    // on the round trip like the higher-stakes actions elsewhere do.
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((n) => n + (wasLiked ? -1 : 1));
    try {
      const res = await api("/api/posts/" + postId + "/comments/" + comment.id + "/like/", { method: "POST" });
      setIsLiked(res.liked);
      setLikeCount(res.like_count);
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((n) => n + (wasLiked ? 1 : -1));
    } finally {
      setLikeBusy(false);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await api("/api/posts/" + postId + "/comments/", {
        method: "POST",
        body: { body: replyBody, parent: comment.id },
      });
      setReplyBody("");
      setReplying(false);
      setShowReplies(true);
      onReplyAdded();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const replies = comment.replies || [];

  return (
    <div className="comment-thread" style={{ marginLeft: depth > 0 ? 26 : 0 }}>
      <div className="entry" style={{ paddingLeft: 0 }}>
        <div className="entry-head" style={{ marginBottom: 2 }}>
          <span
            style={{ fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            onClick={() => comment.author?.id && navigate("/profile/" + comment.author.id)}
          >
            {comment.author?.username || "Member"}
            {comment.author?.is_verified && <span className="verified-tick">✓</span>}
          </span>
        </div>
        <div className="entry-body">{comment.body}</div>
        <div className="entry-meta">
          <span>{timeAgo(comment.created_at)}</span>
          {user && (
            <span
              className={"post-footer-link" + (isLiked ? " liked" : "")}
              style={{ fontSize: 12.5, marginLeft: 0 }}
              onClick={toggleCommentLike}
            >
              {isLiked ? "♥" : "♡"} {likeCount > 0 ? likeCount : ""} Like
            </span>
          )}
          {user && (
            <span
              className="post-footer-link"
              style={{ fontSize: 12.5, marginLeft: 0 }}
              onClick={() => setReplying((v) => !v)}
            >
              {replying ? "Cancel" : "Reply"}
            </span>
          )}
          {replies.length > 0 && (
            <span
              className="post-footer-link"
              style={{ fontSize: 12.5, marginLeft: 0 }}
              onClick={() => setShowReplies((v) => !v)}
            >
              {showReplies ? "Hide" : "Show"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>

        {replying && (
          <form onSubmit={submitReply} style={{ marginTop: 8 }}>
            <ErrorBox message={err} />
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={"Reply to " + (comment.author?.username || "this comment") + "…"}
              style={{ marginBottom: 8, minHeight: 60 }}
            />
            <button className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? <Spinner /> : "Post reply"}
            </button>
          </form>
        )}
      </div>

      {showReplies &&
        replies.map((r) => (
          <CommentThread key={r.id} comment={r} postId={postId} onReplyAdded={onReplyAdded} depth={depth + 1} />
        ))}
    </div>
  );
}

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
  const [pinBusy, setPinBusy] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voting, setVoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [solveBusy, setSolveBusy] = useState(false);

  const loadComments = async () => {
    const c = await api("/api/posts/" + id + "/comments/");
    setComments(Array.isArray(c) ? c : c.results || []);
  };

  const load = async () => {
    try {
      const p = await api("/api/posts/" + id + "/");
      setPost(p);
      await loadComments();
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

  // Only community admins/moderators can pin — check this post's community
  // membership list for the signed-in user's role.
  useEffect(() => {
    if (!post || !user) return;
    api("/api/communities/" + post.community + "/members/")
      .then((members) => {
        const mine = (members || []).find((m) => m.id === user.id);
        setCanModerate(!!mine && (mine.role === "admin" || mine.role === "moderator"));
      })
      .catch(() => setCanModerate(false));
  }, [post, user]);

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

  const togglePin = async () => {
    setPinBusy(true);
    setErr("");
    try {
      const res = await api("/api/posts/" + id + "/pin/", { method: "POST" });
      setPost((prev) => ({ ...prev, is_pinned: res.is_pinned }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setPinBusy(false);
    }
  };

  const markSolved = async () => {
    if (solveBusy || post.is_solved) return; // already solved — no un-solve
    setSolveBusy(true);
    setErr("");
    try {
      const res = await api("/api/posts/" + id + "/mark_solved/", { method: "POST" });
      setPost((prev) => ({ ...prev, is_solved: res.is_solved, solved_at: res.solved_at }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSolveBusy(false);
    }
  };

  const vote = async (optionId) => {
    setVoting(true);
    setErr("");
    try {
      const res = await api("/api/posts/" + id + "/vote/", { method: "POST", body: { option_id: optionId } });
      setPost((prev) => ({ ...prev, voted_option_id: res.voted_option_id, poll_options: res.options }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setVoting(false);
    }
  };

  const toggleSave = async () => {
    setSaving(true);
    setErr("");
    try {
      const res = await api("/api/posts/" + id + "/save/", { method: "POST" });
      setPost((prev) => ({ ...prev, is_saved: res.saved }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  const sharePost = async () => {
    const url = window.location.origin + "/posts/" + id;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled the native share sheet, or clipboard was blocked — ignore
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
      loadComments();
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
            {post.is_pinned && <span className="badge badge-verified">📌 Pinned</span>}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="badge badge-type">{typeIcon(post.post_type)} {groupLabel(post.post_type)}</span>
              {subtypeLabel(post.post_type) && <span className="badge badge-tag">{subtypeLabel(post.post_type)}</span>}
              {post.post_type === "question" && post.is_solved && (
                <span className="badge badge-solved">✓ Solved</span>
              )}
              {post.post_type === "question" && !post.is_solved && (
                <span className="badge badge-unsolved">Open</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {post.post_type === "question" && isAuthor && !post.is_solved && (
                <button className="btn btn-sm btn-primary" onClick={markSolved} disabled={solveBusy}>
                  {solveBusy ? <Spinner /> : "✓ Mark solved"}
                </button>
              )}
              <button className="btn btn-sm" onClick={sharePost}>
                {copied ? "Copied!" : "Share"}
              </button>
              {canModerate && (
                <button className="btn btn-sm" onClick={togglePin} disabled={pinBusy}>
                  {pinBusy ? <Spinner /> : post.is_pinned ? "Unpin" : "Pin"}
                </button>
              )}
              {isAuthor && !editing && (
                <>
                  <button className="btn btn-sm" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                  <button className="btn btn-sm" onClick={deletePost} disabled={deleteBusy}>
                    {deleteBusy ? <Spinner /> : "Delete"}
                  </button>
                </>
              )}
            </div>
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
          {(() => {
            const embed = extractVideoEmbed(post.body);
            return embed && <VideoEmbed src={embed.src} provider={embed.provider} />;
          })()}

          {post.post_type === "poll" && post.poll_options?.length > 0 && (
            <div className="poll-options" style={{ marginTop: 6 }}>
              {(() => {
                const total = post.poll_options.reduce((s, o) => s + (o.vote_count || 0), 0);
                return post.poll_options.map((o, idx) => {
                  const pct = total > 0 ? Math.round(((o.vote_count || 0) / total) * 100) : 0;
                  const picked = post.voted_option_id === o.id;
                  return (
                    <button
                      type="button"
                      key={o.id}
                      className={"poll-option c" + (idx % 5) + (picked ? " picked" : "")}
                      onClick={() => vote(o.id)}
                      disabled={voting}
                    >
                      <div className="poll-option-fill" style={{ width: pct + "%" }} />
                      <span className="poll-option-label">{picked ? "✓ " : ""}{o.text}</span>
                      <span className="poll-option-pct">{pct}%</span>
                    </button>
                  );
                });
              })()}
              <div className="poll-meta">
                <span>{post.poll_options.reduce((s, o) => s + (o.vote_count || 0), 0)} votes</span>
                {post.voted_option_id && <span>You voted ✓</span>}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className={"btn btn-sm" + (post.is_liked ? " btn-primary" : "")} onClick={like} disabled={liking}>
              {post.is_liked ? "♥" : "♡"} {post.like_count || 0} Like
            </button>
            <button className={"btn btn-sm" + (post.is_saved ? " btn-primary" : "")} onClick={toggleSave} disabled={saving}>
              {post.is_saved ? "🔖 Saved" : "🔖 Save"}
            </button>
          </div>
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
          <CommentThread key={c.id} comment={c} postId={id} onReplyAdded={loadComments} />
        ))}
    </div>
  );
}
