import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { Skeleton } from "../lib/helpers.jsx";
import { typeIcon, groupLabel } from "../lib/postTypes.js";

// Cross-community "what's hot right now" strip for the dashboard — same
// engagement-ranked `sort=trending` the per-community feed tab already
// uses (posts/views.py PostViewSet.get_queryset), just called without a
// `community` filter so it spans every community the person can see.
const AUTOSCROLL_MS = 3500;

export default function TrendingCarousel() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    api("/api/posts/?sort=trending")
      .then((res) => {
        const items = Array.isArray(res) ? res : res.results || [];
        setPosts(items.slice(0, 8));
      })
      .catch(() => setPosts([]));
  }, []);

  // Auto-advance one card at a time; pauses on hover/touch so it doesn't
  // fight someone actually trying to read or click a card.
  useEffect(() => {
    if (!posts || posts.length < 2 || paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % posts.length);
    }, AUTOSCROLL_MS);
    return () => clearInterval(timer);
  }, [posts, paused]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index];
    if (card) card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [index]);

  if (posts !== null && posts.length === 0) return null;

  return (
    <div style={{ marginBottom: 26 }}>
      <div className="rail-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        🔥 Trending now
      </div>
      <div
        className="trending-track"
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        {posts === null &&
          [...Array(4)].map((_, i) => (
            <div className="trending-card" key={i}>
              <Skeleton width="60%" height={12} style={{ marginBottom: 10 }} />
              <Skeleton width="90%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={14} />
            </div>
          ))}

        {posts !== null &&
          posts.map((p) => (
            <div className="trending-card" key={p.id} onClick={() => navigate("/posts/" + p.id)}>
              <div className="trending-card-community">{p.community_name}</div>
              <div className="trending-card-title">
                {typeIcon(p.post_type)} {p.title}
              </div>
              <div className="entry-meta">
                <span className="badge badge-tag">{groupLabel(p.post_type)}</span>
                <span>♥ {p.like_count || 0}</span>
                <span>💬 {p.comment_count || 0}</span>
              </div>
            </div>
          ))}
      </div>
      {posts !== null && posts.length > 1 && (
        <div className="trending-dots">
          {posts.map((p, i) => (
            <span
              key={p.id}
              className={"trending-dot" + (i === index ? " active" : "")}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
