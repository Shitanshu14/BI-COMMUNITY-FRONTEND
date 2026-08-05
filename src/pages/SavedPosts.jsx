import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, timeAgo, VideoEmbed } from "../lib/helpers.jsx";
import { typeIcon, subtypeLabel, groupLabel } from "../lib/postTypes.js";
import { extractVideoEmbed } from "../lib/embed.js";

export default function SavedPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [saveBusy, setSaveBusy] = useState(null);

  const load = async () => {
    try {
      const res = await api("/api/posts/?saved=true");
      setPosts(Array.isArray(res) ? res : res.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unsave = async (postId) => {
    setSaveBusy(postId);
    try {
      await api("/api/posts/" + postId + "/save/", { method: "POST" });
      // A post leaving the saved list is the whole point of this page, so
      // drop it immediately instead of waiting for a refetch.
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaveBusy(null);
    }
  };

  return (
    <div className="page">
      <div className="eyebrow">Your library</div>
      <h1>Saved posts</h1>
      <div style={{ height: 16 }} />
      <ErrorBox message={err} />

      {posts === null && <div className="empty-state">Loading…</div>}
      {posts !== null && posts.length === 0 && (
        <div className="empty-state">
          Nothing saved yet. Tap 🔖 Save on any post to keep it here for later.
        </div>
      )}

      {posts &&
        posts.map((p) => (
          <div className="post-card" key={p.id}>
            <div className="post-head">
              <Avatar name={p.author?.username || "member"} size={38} />
              <div className="post-head-meta">
                <div
                  className="post-author"
                  onClick={() => p.author?.id && navigate("/profile/" + p.author.id)}
                  style={{ cursor: "pointer" }}
                >
                  {p.author?.username || "Member"}
                  {p.author?.is_verified && <span className="verified-tick">✓</span>}
                </div>
                <div className="post-sub">{timeAgo(p.created_at)}</div>
              </div>
              <span className="badge badge-type">{typeIcon(p.post_type)} {groupLabel(p.post_type)}</span>
              {subtypeLabel(p.post_type) && <span className="badge badge-tag">{subtypeLabel(p.post_type)}</span>}
            </div>

            <div className="post-title" onClick={() => navigate("/posts/" + p.id)}>
              {p.title}
            </div>
            <p className="post-body">{p.body}</p>
            {p.image && <img src={p.image} alt="" className="post-image" />}
            {(() => {
              const embed = extractVideoEmbed(p.body);
              return embed && <VideoEmbed src={embed.src} provider={embed.provider} />;
            })()}

            <div className="post-footer">
              <span className="post-footer-action" style={{ cursor: "default" }}>
                ♡ {p.like_count || 0}
              </span>
              <span className="post-footer-action" style={{ cursor: "default" }}>
                💬 {p.comment_count || 0}
              </span>
              <button className="post-footer-action saved" onClick={() => unsave(p.id)} disabled={saveBusy === p.id}>
                🔖 Remove
              </button>
              <span className="post-footer-link" onClick={() => navigate("/posts/" + p.id)}>
                View post →
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
