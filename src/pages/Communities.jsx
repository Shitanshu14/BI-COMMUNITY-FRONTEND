import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Skeleton, Spinner } from "../lib/helpers.jsx";
import { CATEGORIES, categoryMeta } from "../lib/communityCategories.js";
import CommunityCover from "../components/CommunityCover.jsx";

const VISIBLE_PILLS = CATEGORIES.slice(0, 5); // Technology, Education, Social, Gaming, Business
const MORE_PILLS = CATEGORIES.slice(5); // Entertainment, Other

function fmtCount(n) {
  n = n || 0;
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K";
  return String(n);
}

// Own bit of state so a broken icon URL falls back to the initial-letter
// tile instead of the browser's default broken-image icon.
function TrendingIcon({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img className="trending-icon" src={src} alt="" onError={() => setFailed(true)} />;
  }
  return <div className="trending-icon trending-icon-fallback">{(name || "?").charAt(0).toUpperCase()}</div>;
}

export default function Communities() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const [joinBusy, setJoinBusy] = useState(null);
  const moreRef = useRef(null);

  const load = async (search = "") => {
    try {
      const path = "/api/communities/" + (search ? "?search=" + encodeURIComponent(search) : "");
      const res = await api(path);
      setList(Array.isArray(res) ? res : res.results || res);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const items = list || [];
  const filtered = activeCategory === "all" ? items : items.filter((c) => c.category === activeCategory);

  const myCommunities = filtered.filter((c) => c.is_member);
  const discover = [...filtered]
    .filter((c) => !c.is_member)
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
  const trending = [...filtered].sort((a, b) => (b.member_count || 0) - (a.member_count || 0)).slice(0, 5);

  const categoryCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.value] = items.filter((x) => x.category === c.value).length;
    return acc;
  }, {});

  const quickJoin = async (e, c) => {
    e.stopPropagation();
    setJoinBusy(c.id);
    try {
      const res = await api("/api/communities/" + c.id + "/join/", { method: "POST" });
      setList((prev) =>
        (prev || []).map((x) =>
          x.id === c.id
            ? { ...x, is_member: res.status === "joined", is_pending: res.status === "pending", member_count: res.member_count }
            : x
        )
      );
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setJoinBusy(null);
    }
  };

  return (
    <div className="communities-page">
      <div className="split">
        <div>
          <h1>Communities</h1>
          <p className="page-sub">Discover and join communities that match your interests.</p>
        </div>
        <div className="comm-status-chip">
          <div className="comm-status-item">
            <span className="comm-status-icon">🔥</span>
            <div>
              <div className="comm-status-label">Trending now</div>
              <div className="comm-status-value">{trending[0] ? trending[0].name : "—"}</div>
            </div>
          </div>
          <div className="comm-status-divider" />
          <div className="comm-status-item">
            <span className="comm-status-icon">👥</span>
            <div>
              <div className="comm-status-label">Communities</div>
              <div className="comm-status-value">{fmtCount(items.length)} active</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      <div className="communities-toolbar">
        <input
          type="text"
          placeholder="Search communities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="communities-search"
        />
        <div className="category-pills">
          <button
            type="button"
            className={"category-pill" + (activeCategory === "all" ? " active" : "")}
            onClick={() => setActiveCategory("all")}
          >
            All
          </button>
          {VISIBLE_PILLS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={"category-pill" + (activeCategory === c.value ? " active" : "")}
              onClick={() => setActiveCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
          <div className="category-pill-more" ref={moreRef}>
            <button
              type="button"
              className={"category-pill" + (MORE_PILLS.some((c) => c.value === activeCategory) ? " active" : "")}
              onClick={() => setMoreOpen((o) => !o)}
            >
              More ⌄
            </button>
            {moreOpen && (
              <div className="category-pill-menu">
                {MORE_PILLS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={activeCategory === c.value ? "active" : ""}
                    onClick={() => {
                      setActiveCategory(c.value);
                      setMoreOpen(false);
                    }}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ErrorBox message={err} />

      {list === null && (
        <div className="community-grid" style={{ marginTop: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div className="community-card" key={i} style={{ cursor: "default" }}>
              <Skeleton height={110} radius="var(--radius)" style={{ marginBottom: 12 }} />
              <Skeleton width="70%" height={17} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={13} />
            </div>
          ))}
        </div>
      )}

      {list !== null && myCommunities.length > 0 && (
        <section className="comm-section">
          <div className="comm-section-head">
            <div>
              <h2>My Communities</h2>
              <p>Communities you have joined</p>
            </div>
          </div>
          <div className="comm-row">
            {myCommunities.map((c, i) => (
              <div className="comm-card comm-card-joined" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
                <CommunityCover community={c} index={i} badge={<span className="comm-badge comm-badge-joined">Joined</span>} />
                <div className="comm-card-body">
                  <div className="comm-card-title">
                    {c.name}
                    {c.is_verified && <span className="verified-tick" title="Verified">✓</span>}
                  </div>
                  <div className="comm-card-desc">{c.description || "No description yet."}</div>
                  <div className="comm-card-meta">👥 {fmtCount(c.member_count)} Members</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {list !== null && discover.length > 0 && (
        <section className="comm-section">
          <div className="comm-section-head">
            <div>
              <h2>Discover Communities</h2>
              <p>Suggested for you</p>
            </div>
          </div>
          <div className="comm-row comm-row-wrap">
            {discover.map((c, i) => (
              <div className="comm-card" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
                <CommunityCover community={c} index={i} />
                <div className="comm-card-body">
                  <div className="comm-card-title">
                    {c.name}
                    {c.is_verified && <span className="verified-tick" title="Verified">✓</span>}
                  </div>
                  <div className="comm-card-desc">{c.description || "No description yet."}</div>
                  <div className="comm-card-foot">
                    <span className="comm-card-meta">👥 {fmtCount(c.member_count)} Members</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => quickJoin(e, c)}
                      disabled={joinBusy === c.id || c.is_pending}
                    >
                      {joinBusy === c.id ? <Spinner /> : c.is_pending ? "Requested" : "+ Join"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {list !== null && items.length === 0 && (
        <div className="empty-state">
          {query ? `No communities match "${query}".` : "No communities yet. Be the first to create one."}
        </div>
      )}

      {list !== null && items.length > 0 && (
        <div className="comm-bottom-grid">
          <section className="trending-panel">
            <div className="comm-section-head">
              <div>
                <h2>Trending Communities</h2>
                <p>Most active communities right now</p>
              </div>
            </div>
            <div className="trending-list">
              {trending.map((c, i) => {
                const meta = categoryMeta(c.category);
                return (
                  <div className="trending-row" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
                    <span className="trending-rank">🔥{i + 1}</span>
                    <div className="trending-icon-wrap">
                      <TrendingIcon src={c.icon} name={c.name} />
                    </div>
                    <div className="trending-info">
                      <div className="trending-name">
                        <span className="truncate">{c.name}</span>
                        {c.is_verified && <span className="verified-tick" title="Verified">✓</span>}
                        <span className="badge badge-tag trending-cat">{meta.label}</span>
                      </div>
                      <div className="trending-desc">{c.description || "No description yet."}</div>
                    </div>
                    <div className="trending-members">{fmtCount(c.member_count)} Members</div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => quickJoin(e, c)}
                      disabled={joinBusy === c.id || c.is_member || c.is_pending}
                    >
                      {joinBusy === c.id ? <Spinner /> : c.is_member ? "Joined" : c.is_pending ? "Requested" : "Join"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="popular-categories-panel">
            <h2>Popular Categories</h2>
            <p>Explore by your interests</p>
            <div className="popular-categories-list">
              {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
                <button
                  type="button"
                  key={c.value}
                  className="popular-category-row"
                  onClick={() => setActiveCategory(c.value)}
                >
                  <span className="popular-category-icon">{c.icon}</span>
                  <span className="popular-category-label">{c.label}</span>
                  <span className="popular-category-count">{categoryCounts[c.value] || 0} Communities</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
