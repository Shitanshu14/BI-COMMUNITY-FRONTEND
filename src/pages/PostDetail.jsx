import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar, VideoEmbed } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useShareSheet } from "../context/ShareSheetContext.jsx";
import { typeIcon, subtypeLabel, groupLabel, typeColorKey } from "../lib/postTypes.js";
import { extractVideoEmbed } from "../lib/embed.js";
import PostExtras from "../components/PostExtras.jsx";
import PostImageSlider from "../components/PostImageSlider.jsx";

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
  const [copied, setCopied] = useState(false);

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

  const shareComment = async () => {
    // Same share pattern as the post itself (PostDetail.sharePost below) —
    // comments are addressable one level deeper via a #comment- anchor, so
    // sharing a comment carries it forward the same way sharing a post does.
    const url = window.location.origin + "/posts/" + postId + "#comment-" + comment.id;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // cancelled share sheet / blocked clipboard — ignore
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
    <div className="comment-thread" id={"comment-" + comment.id} style={{ marginLeft: depth > 0 ? 26 : 0 }}>
      <div className="entry comment-entry">
        <div className="entry-head-row">
          <Avatar name={comment.author?.username || "member"} src={comment.author?.avatar} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="entry-head" style={{ marginBottom: 2 }}>
              <span
                style={{ fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                onClick={() => comment.author?.id && navigate("/profile/" + comment.author.id)}
              >
                {comment.author?.username || "Member"}
                {comment.author?.is_verified && <span className="verified-tick">✓</span>}
              </span>
              <span className="subtle" style={{ fontSize: 12 }}>{timeAgo(comment.created_at)}</span>
            </div>
            <div className="entry-body">{comment.body}</div>
            <div className="entry-meta">
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
              <span className="post-footer-link" style={{ fontSize: 12.5, marginLeft: 0 }} onClick={shareComment}>
                {copied ? "Copied!" : "↗ Share"}
              </span>
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
        </div>
      </div>

      {showReplies &&
        replies.map((r) => (
          <CommentThread key={r.id} comment={r} postId={postId} onReplyAdded={onReplyAdded} depth={depth + 1} />
        ))}
    </div>
  );
}

function AnswerRow({ comment, postId, canAccept, onAccepted, onError }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(comment.is_liked || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);

  const acceptAnswer = async () => {
    setAcceptBusy(true);
    try {
      await api("/api/posts/" + postId + "/comments/" + comment.id + "/accept/", { method: "POST" });
      onAccepted(comment.id);
    } catch (ex) {
      onError(ex.message);
    } finally {
      setAcceptBusy(false);
    }
  };

  const toggleLike = async () => {
    if (!user || likeBusy) return;
    setLikeBusy(true);
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

  const shareAnswer = async () => {
    const url = window.location.origin + "/posts/" + postId + "#comment-" + comment.id;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // cancelled share sheet / blocked clipboard — ignore
    }
  };

  return (
    <div className="entry comment-entry" id={"comment-" + comment.id}>
      <div className="entry-head-row">
        <Avatar name={comment.author?.username || "member"} src={comment.author?.avatar} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="entry-head" style={{ marginBottom: 2 }}>
            <span
              style={{ fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              onClick={() => comment.author?.id && navigate("/profile/" + comment.author.id)}
            >
              {comment.author?.username || "Member"}
              {comment.author?.is_verified && <span className="verified-tick">✓</span>}
            </span>
            <span className="subtle" style={{ fontSize: 12 }}>{timeAgo(comment.created_at)}</span>
          </div>
          <div className="entry-body">{comment.body}</div>
          <div className="entry-meta">
            {user && (
              <span className={"post-footer-link" + (isLiked ? " liked" : "")} style={{ fontSize: 12.5, marginLeft: 0 }} onClick={toggleLike}>
                {isLiked ? "♥" : "♡"} {likeCount > 0 ? likeCount : ""} Like
              </span>
            )}
            <span className="post-footer-link" style={{ fontSize: 12.5, marginLeft: 0 }} onClick={shareAnswer}>
              {copied ? "Copied!" : "↗ Share"}
            </span>
            {canAccept && !comment.is_accepted && (
              <span
                className="post-footer-link"
                style={{ fontSize: 12.5, marginLeft: 0, opacity: acceptBusy ? 0.6 : 1 }}
                onClick={acceptBusy ? undefined : acceptAnswer}
              >
                {acceptBusy ? "Accepting…" : "✓ Mark as accepted"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const openShare = useShareSheet();
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
    if (!window.confirm(isAuthor ? "Delete this post? This can't be undone." : "Remove this post as a support action? This can't be undone.")) return;
    setDeleteBusy(true);
    setErr("");
    try {
      // Support/staff removing someone else's post goes through the
      // dedicated moderation endpoint — the normal DELETE only allows the
      // post's own author (see posts/views.py IsAuthorOrReadOnly).
      const path = isAuthor ? "/api/posts/" + id + "/" : "/api/support/posts/" + id + "/";
      await api(path, { method: "DELETE" });
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

  const acceptAnswer = (commentId) => {
    // The accept POST already did the work server-side (unset any previous
    // accepted comment, set this one, and flip the post to solved) — this
    // just mirrors that same result into local state, same pattern as
    // CircleQuestionDetail.acceptAnswer, so there's no full reload needed.
    setPost((prev) => ({ ...prev, is_solved: true }));
    setComments((prev) => prev.map((c) => ({ ...c, is_accepted: c.id === commentId })));
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
        <div className="card" data-ptype={typeColorKey(post)} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer" }}
              onClick={() => post.author?.id && navigate("/profile/" + post.author.id)}
            >
              <Avatar name={post.author?.username || "member"} src={post.author?.avatar} size={38} />
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
              <span className="badge badge-type" data-ptype={typeColorKey(post)}>{typeIcon(post)} {groupLabel(post)}</span>
              {subtypeLabel(post) && <span className="badge badge-tag">{subtypeLabel(post)}</span>}
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
                <button className="btn btn-sm" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              {(isAuthor || user?.is_support || user?.is_staff) && !editing && (
                <button className="btn btn-sm" onClick={deletePost} disabled={deleteBusy}>
                  {deleteBusy ? <Spinner /> : isAuthor ? "Delete" : "Remove (support)"}
                </button>
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
              {post.post_type === "question" && <div className="qa-eyebrow">❓ Question</div>}
              <h1 style={{ marginTop: 10 }}>{post.title}</h1>
              <p style={{ color: "var(--ink-soft)" }}>{post.body}</p>
              <PostExtras post={post} />
            </>
          )}
          {(post.image || (post.images && post.images.length > 0)) && (
            <PostImageSlider images={post.images} image={post.image} className="post-image-slider" />
          )}
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
            <button
              className="btn btn-sm"
              onClick={() =>
                openShare({
                  type: "post",
                  id: post.id,
                  title: post.title,
                  subtitle: post.community?.name,
                  image: post.image || post.images?.[0]?.image,
                })
              }
            >
              ↗️ Share
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 30 }} />
      <h2>{post?.post_type === "question" ? "Answers" : "Comments"}</h2>
      <form onSubmit={addComment} style={{ marginBottom: 20 }}>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder={post?.post_type === "question" ? "Share what you know…" : "Write a comment…"}
          style={{ marginBottom: 8 }}
        />
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? <Spinner /> : post?.post_type === "question" ? "Post answer" : "Add comment"}
        </button>
      </form>

      {comments !== null && comments.length === 0 && (
        <div className="empty-state">{post?.post_type === "question" ? "No answers yet. Be the first to help out." : "No comments yet."}</div>
      )}
      {comments && post?.post_type === "question" &&
        comments.map((c) => (
          <div className={"card comment-card answer-card" + (c.is_accepted ? " qa-answer-accepted" : "")} key={c.id}>
            {c.is_accepted && <span className="qa-accepted-ribbon">✓ Accepted</span>}
            <div className="qa-answer-eyebrow">💬 Answer</div>
            <AnswerRow
              comment={c}
              postId={id}
              canAccept={isAuthor}
              onAccepted={acceptAnswer}
              onError={setErr}
            />
          </div>
        ))}
      {comments && post?.post_type !== "question" &&
        comments.map((c) => (
          <div className="card comment-card" key={c.id}>
            <CommentThread comment={c} postId={id} onReplyAdded={loadComments} />
          </div>
        ))}
    </div>
  );
}
