import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo, Avatar, VideoEmbed } from "../lib/helpers.jsx";
import CommunityCover from "../components/CommunityCover.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useShareSheet } from "../context/ShareSheetContext.jsx";
import { TOP_TYPES, POST_SUBTYPES, FILTER_TABS, groupOf, typeIcon, subtypeLabel, groupLabel, typeColorKey, encodeLink } from "../lib/postTypes.js";
import { extractVideoEmbed } from "../lib/embed.js";
import PostExtras from "../components/PostExtras.jsx";
import PostImageSlider from "../components/PostImageSlider.jsx";
import CardImageGallery from "../components/CardImageGallery.jsx";

const EMPTY_FORM = { post_type: "question", title: "", body: "", tags: [] };

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const openShare = useShareSheet();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState(null);
  const [postsNext, setPostsNext] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkRows, setLinkRows] = useState([{ label: "", url: "" }]);
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const [galleryFiles, setGalleryFiles] = useState([]); // [{file, url}] — up to 6, sent as repeated `images` fields
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(null);
  const [saveBusy, setSaveBusy] = useState(null);

  const [joinBusy, setJoinBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(null);
  const [canModerate, setCanModerate] = useState(false);
  const [filter, setFilter] = useState("all");
  // "recent" (default, newest first) or "trending" (engagement-ranked,
  // last 7 days — see posts/views.py PostViewSet.get_queryset).
  const [sortBy, setSortBy] = useState("recent");
  // In-community search: client-side match against title/body/tags of the
  // posts already loaded for this community. Kept client-side (no extra
  // request) since a single community's feed is a small, already-fetched
  // list — this just narrows what's shown, same idea as the type tabs.
  const [search, setSearch] = useState("");

  const toggleJoin = async () => {
    if (!community) return;
    setJoinBusy(true);
    setErr("");
    try {
      const action = community.is_member || community.is_pending ? "leave" : "join";
      const res = await api("/api/communities/" + id + "/" + action + "/", { method: "POST" });
      setCommunity((prev) => ({
        ...prev,
        is_member: res.status === "joined",
        is_pending: res.status === "pending",
        member_count: res.member_count,
      }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setJoinBusy(false);
    }
  };

  const [joinRequests, setJoinRequests] = useState(null);
  const [approveBusy, setApproveBusy] = useState(null);

  const loadJoinRequests = async () => {
    try {
      const res = await api("/api/communities/" + id + "/join_requests/");
      setJoinRequests(res);
    } catch (ex) {
      setJoinRequests([]);
    }
  };

  const respondJoinRequest = async (userId, approve) => {
    setApproveBusy(userId);
    setErr("");
    try {
      const res = await api(
        "/api/communities/" + id + "/join_requests/" + userId + "/" + (approve ? "approve" : "reject") + "/",
        { method: "POST" }
      );
      setJoinRequests((prev) => (prev || []).filter((r) => r.id !== userId));
      if (approve && res.member_count != null) {
        setCommunity((prev) => (prev ? { ...prev, member_count: res.member_count } : prev));
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setApproveBusy(null);
    }
  };

  const load = async (sort = sortBy) => {
    try {
      const postsUrl =
        "/api/posts/?community=" + id + (sort === "trending" ? "&sort=trending" : "");
      const [c, p] = await Promise.all([
        api("/api/communities/" + id + "/"),
        api(postsUrl),
      ]);
      setCommunity(c);
      setPosts(Array.isArray(p) ? p : p.results || []);
      setPostsNext(Array.isArray(p) ? null : p.next || null);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const loadMorePosts = async () => {
    if (!postsNext || loadingMore) return;
    setLoadingMore(true);
    try {
      // postsNext is DRF's absolute URL (http://host/api/posts/?...); the
      // api() helper only accepts same-origin paths, so strip the host —
      // same fix as SupportDashboard's pagination.
      const path = postsNext.replace(/^https?:\/\/[^/]+/, "");
      const p = await api(path);
      setPosts((prev) => [...prev, ...(p.results || [])]);
      setPostsNext(p.next || null);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sortBy]);

  useEffect(() => {
    if (!user) return;
    api("/api/communities/" + id + "/members/")
      .then((members) => {
        const mine = (members || []).find((m) => m.id === user.id);
        setCanModerate(!!mine && (mine.role === "admin" || mine.role === "moderator"));
      })
      .catch(() => setCanModerate(false));
  }, [id, user]);

  // Admins of a registration-based ("requires approval") community get a
  // small "Join requests" panel to approve/decline people waiting to get
  // in — pulled only once we know they can moderate, so a regular member
  // never even fires this request.
  useEffect(() => {
    if (canModerate && community?.join_mode === "approval") {
      loadJoinRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canModerate, community?.join_mode, id]);

  const togglePin = async (postId) => {
    setPinBusy(postId);
    setErr("");
    try {
      const res = await api("/api/posts/" + postId + "/pin/", { method: "POST" });
      setPosts((prev) => {
        const next = prev.map((p) => (p.id === postId ? { ...p, is_pinned: res.is_pinned } : p));
        // Keep pinned posts on top client-side too, so the toggle reflects
        // instantly without waiting on a full reload.
        return [...next].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
      });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setPinBusy(null);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Top-level pick: Question / Post / Poll. Picking "Post" doesn't force a
  // subtype by itself — it defaults to "Knowledge" unless a subtype was
  // already chosen, then the subtype pills (below) let the user refine it.
  const pickType = (topValue) => {
    setForm((f) => {
      if (topValue === "post") {
        return { ...f, post_type: "post", tags: groupOf(f) === "post" && f.tags?.length ? f.tags : ["Knowledge"] };
      }
      return { ...f, post_type: topValue, tags: [] };
    });
    setShowForm(true);
  };

  const onImage = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setGalleryFiles((prev) => {
      const room = Math.max(0, 6 - prev.length);
      const added = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...added];
    });
    e.target.value = ""; // allow picking the same file again after removing it
  };
  const removeGalleryImage = (i) => {
    setGalleryFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
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
      galleryFiles.forEach(({ file }) => fd.append("images", file));
      (form.tags || []).forEach((t) => fd.append("tags", t));
      if (form.post_type === "poll") {
        pollOptions.filter((o) => o.trim()).forEach((o) => fd.append("options", o.trim()));
      }
      // Links are only meaningful for Project/Resource posts, but sending
      // them harmlessly no-ops for other types since the field just isn't
      // read/rendered there.
      linkRows
        .filter((r) => r.url.trim())
        .forEach((r) => fd.append("links", encodeLink(r.label, r.url)));
      await api("/api/posts/", { method: "POST", body: fd });
      setForm(EMPTY_FORM);
      setLinkRows([{ label: "", url: "" }]);
      setPollOptions(["", ""]);
      galleryFiles.forEach((g) => URL.revokeObjectURL(g.url));
      setGalleryFiles([]);
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
  const setLinkRow = (i, key) => (e) => {
    const next = [...linkRows];
    next[i] = { ...next[i], [key]: e.target.value };
    setLinkRows(next);
  };
  const addLinkRow = () => linkRows.length < 5 && setLinkRows([...linkRows, { label: "", url: "" }]);
  const removeLinkRow = (i) => setLinkRows(linkRows.filter((_, idx) => idx !== i));
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
    if (!community?.is_member) {
      setErr("Join this community to like, comment, or share here.");
      return;
    }
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

  const toggleSave = async (postId) => {
    if (!community?.is_member) {
      setErr("Join this community to save posts.");
      return;
    }
    setSaveBusy(postId);
    try {
      const res = await api("/api/posts/" + postId + "/save/", { method: "POST" });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: res.saved } : p)));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaveBusy(null);
    }
  };

  return (
    <div>
      <Link className="nav-link" to="/communities">
        ← All communities
      </Link>
      <div style={{ height: 10 }} />

      {community && (
        <>
          {/* Cover photo (banner) and profile picture (circular badge) are
              separate images — same idea as the dashboard cards, just at
              hero size. Either can be an animated .gif and will just play. */}
          <CommunityCover community={community} height={180} />
          <div style={{ height: 30 }} />
          {community.images && community.images.length > 0 && (
            <CardImageGallery images={community.images} height={220} className="circle-detail-gallery" />
          )}
          <div className="split" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              {community.is_public ? "Open community" : "Private community"}
            </div>
            <h1 style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 6 }}>
              {community.name}
              {community.is_verified && <span className="verified-tick" title="Verified">✓</span>}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {community.is_member ? (
              <>
                <span className="badge badge-verified">✓ Joined</span>
                <button className="btn btn-sm" onClick={toggleJoin} disabled={joinBusy}>
                  {joinBusy ? <Spinner /> : "Leave"}
                </button>
              </>
            ) : community.is_pending ? (
              <>
                <span className="badge badge-role">⏳ Requested</span>
                <button className="btn btn-sm" onClick={toggleJoin} disabled={joinBusy}>
                  {joinBusy ? <Spinner /> : "Cancel request"}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={toggleJoin} disabled={joinBusy}>
                {joinBusy ? <Spinner /> : community.join_mode === "approval" ? "Request to join" : "Join community"}
              </button>
            )}
            <button className="btn" onClick={() => navigate("/chat/" + id)}>
              Open chat
            </button>
            <button
              className="btn"
              title="Share this community"
              onClick={() =>
                openShare({
                  type: "community",
                  id: community.id,
                  title: community.name,
                  subtitle: (community.member_count || 0) + " members",
                  image: community.icon,
                })
              }
            >
              ↗️ Share
            </button>
          </div>
        </div>
        </>
      )}

      <ErrorBox message={err} />

      {community?.is_on_hold && (
        <div className="hold-banner">
          ⏸️ This community is on hold — no new posts, comments, or likes right now.
          You're welcome to stay; it'll reopen once support lifts the hold.
        </div>
      )}

      <div className="feed-layout" style={{ marginTop: 20 }}>
        <div className="feed-main">
          {community && !community.is_member ? (
            <div className="card composer" style={{ textAlign: "center" }}>
              <p className="subtle" style={{ margin: "6px 0 12px" }}>
                {community.is_pending
                  ? "Your request to join is waiting on a community admin to approve it."
                  : "Join this community to post, comment, and chat."}
              </p>
              {!community.is_pending && (
                <button className="btn btn-primary" onClick={toggleJoin} disabled={joinBusy}>
                  {joinBusy ? <Spinner /> : community.join_mode === "approval" ? "Request to join" : "Join community"}
                </button>
              )}
            </div>
          ) : community?.is_on_hold ? (
            <div className="card composer" style={{ textAlign: "center" }}>
              <p className="subtle" style={{ margin: "6px 0" }}>
                ⏸️ Posting is paused while this community is on hold.
              </p>
            </div>
          ) : (
            <div className="card composer">
              <div className="composer-placeholder" onClick={() => setShowForm(true)}>
                <Avatar name={user?.username} src={user?.avatar} size={34} />
                <span>What do you want to share?</span>
              </div>
              <div className="composer-types">
                {TOP_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    title={t.hint}
                    data-ptype={t.value}
                    className={"pill-btn" + (groupOf(form.post_type) === t.value && showForm ? " active" : "")}
                    onClick={() => pickType(t.value)}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showForm && community?.is_member && !community?.is_on_hold && (
            <form onSubmit={create} className="card" data-ptype={typeColorKey(form)} style={{ marginBottom: 18 }}>
              <label>Type</label>
              {form.post_type === "post" ? (
                <div className="composer-subtypes">
                  {POST_SUBTYPES.map((s) => (
                    <button
                      type="button"
                      key={s.value}
                      title={s.hint}
                      data-ptype={s.value.toLowerCase()}
                      className={"pill-btn pill-btn-sm" + (form.tags?.[0] === s.value ? " active" : "")}
                      onClick={() => setForm({ ...form, tags: [s.value] })}
                    >
                      <span>{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="composer-fixed-type" data-ptype={typeColorKey(form)}>
                  <span>{typeIcon(form)}</span> {groupLabel(form)}
                </div>
              )}
              <label>Title</label>
              <input type="text" value={form.title} onChange={set("title")} required />
              <label>Body</label>
              <textarea value={form.body} onChange={set("body")} required />
              {(form.tags?.[0] === "Project" || form.tags?.[0] === "Resource") && (
                <div style={{ marginBottom: 14 }}>
                  <label>
                    {form.tags[0] === "Project" ? "Links (live site, repo, portfolio — anything, optional)" : "Link (optional but recommended)"}
                  </label>
                  {linkRows.map((row, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        name={"link-label-" + i}
                        value={row.label}
                        placeholder="Label (e.g. Live demo, Portfolio, Instagram)"
                        onChange={setLinkRow(i, "label")}
                        autoComplete="off"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="url"
                        name={"link-url-" + i}
                        value={row.url}
                        placeholder="https://…"
                        onChange={setLinkRow(i, "url")}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        style={{ flex: 1 }}
                      />
                      {linkRows.length > 1 && (
                        <button type="button" className="btn btn-sm" onClick={() => removeLinkRow(i)}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {form.tags[0] === "Project" && linkRows.length < 5 && (
                    <button type="button" className="btn btn-sm" onClick={addLinkRow}>
                      + Add another link
                    </button>
                  )}
                </div>
              )}
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
              <label>Images (optional — up to 6, shown as a swipeable slide)</label>
              <div className="gallery-picker">
                {galleryFiles.map((g, i) => (
                  <div className="gallery-picker-thumb" key={g.url}>
                    <img src={g.url} alt="" />
                    <button type="button" className="gallery-picker-remove" onClick={() => removeGalleryImage(i)}>
                      ✕
                    </button>
                  </div>
                ))}
                {galleryFiles.length < 6 && (
                  <label className="gallery-picker-add">
                    <input type="file" accept="image/*" multiple onChange={onImage} style={{ display: "none" }} />
                    <span className="image-dropzone-icon">📷</span>
                    <span>{galleryFiles.length ? "Add more" : "Click to add images"}</span>
                  </label>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? <Spinner /> : "Post"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowForm(false);
                    galleryFiles.forEach((g) => URL.revokeObjectURL(g.url));
                    setGalleryFiles([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {posts !== null && posts.length > 0 && (
            <input
              type="text"
              placeholder="🔍 Search posts in this community — title, body, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
          )}

          {posts !== null && posts.length > 0 && (
            <div className="filter-tabs" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {FILTER_TABS.map((t) => {
                  const count = t.value === "all" ? posts.length : posts.filter((p) => groupOf(p) === t.value).length;
                  return (
                    <button
                      type="button"
                      key={t.value}
                      className={"filter-tab" + (filter === t.value ? " active" : "")}
                      onClick={() => setFilter(t.value)}
                    >
                      {t.label} <span className="filter-tab-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              {/* Trending: re-fetches from the server ranked by recent
                  engagement instead of newest-first (see load()/sortBy).
                  Kept separate from the type tabs above since it's a sort
                  order, not a filter — the two combine (e.g. Trending +
                  Questions shows the hottest questions). */}
              <button
                type="button"
                className={"filter-tab" + (sortBy === "trending" ? " active" : "")}
                onClick={() => setSortBy(sortBy === "trending" ? "recent" : "trending")}
                title="Rank posts by likes + comments from the last 7 days"
              >
                🔥 Trending
              </button>
            </div>
          )}

          {posts === null && <div className="empty-state">Loading posts…</div>}
          {posts !== null && posts.length === 0 && (
            <div className="empty-state">No posts here yet. Start the discussion.</div>
          )}

          {(() => {
            const q = search.trim().toLowerCase();
            const matchesSearch = (p) =>
              !q ||
              p.title?.toLowerCase().includes(q) ||
              p.body?.toLowerCase().includes(q) ||
              (p.tags || []).some((t) => String(t).toLowerCase().includes(q));
            const visible = posts ? posts.filter((p) => (filter === "all" || groupOf(p) === filter) && matchesSearch(p)) : [];
            if (posts && posts.length > 0 && visible.length === 0) {
              return (
                <div className="empty-state">
                  {q
                    ? `No posts match "${search}".`
                    : `No ${filter === "all" ? "" : filter} posts here yet.`}
                </div>
              );
            }
            return visible.map((p) => (
              <div className="post-card" data-ptype={typeColorKey(p)} key={p.id}>
                <div className="post-head">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => p.author?.id && navigate("/profile/" + p.author.id)}
                  >
                    <Avatar name={p.author?.username || "member"} src={p.author?.avatar} size={40} />
                    <div className="post-head-meta">
                      <div className="post-author">
                        <span className="truncate">{p.author?.username || "Member"}</span>
                        {p.author?.is_verified && <span className="verified-tick">✓</span>}
                      </div>
                      <div className="post-sub">
                        {p.author?.headline ? p.author.headline + " · " : ""}
                        {timeAgo(p.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.is_pinned && <span className="badge badge-verified">📌 Pinned</span>}
                    <span className="badge badge-type" data-ptype={typeColorKey(p)}>{typeIcon(p)} {groupLabel(p)}</span>
                    {subtypeLabel(p) && (
                      <span
                        className="badge badge-tag"
                        style={{ cursor: "pointer" }}
                        title={`Show all "${subtypeLabel(p)}" posts`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilter("all");
                          setSearch(subtypeLabel(p));
                        }}
                      >
                        {subtypeLabel(p)}
                      </span>
                    )}
                    {p.post_type === "question" && (
                      <span className={"badge " + (p.is_solved ? "badge-solved" : "badge-unsolved")}>
                        {p.is_solved ? "✓ Solved" : "Open"}
                      </span>
                    )}
                    {canModerate && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => togglePin(p.id)}
                        disabled={pinBusy === p.id}
                      >
                        {pinBusy === p.id ? <Spinner /> : p.is_pinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-body-row">
                  {groupOf(p) === "question" && (
                    <div className="qa-stats">
                      <div className="qa-stat">
                        <span className="qa-stat-num">{p.like_count || 0}</span>
                        <span className="qa-stat-label">likes</span>
                      </div>
                      <div className="qa-stat qa-stat-answers">
                        <span className="qa-stat-num">{p.comment_count || 0}</span>
                        <span className="qa-stat-label">answers</span>
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {groupOf(p) === "question" && <div className="qa-eyebrow">❓ Question</div>}
                    <div className="post-title" onClick={() => navigate("/posts/" + p.id)}>
                      {p.title}
                    </div>
                    <div className="post-body">{p.body}</div>
                    <PostExtras post={p} compact />
                    {groupOf(p) === "poll" && p.poll_options?.length > 0 && (
                      <div className="poll-panel">
                        <div className="poll-panel-head">
                          <span>📊 Poll</span>
                          <span className="poll-panel-votes">
                            {p.poll_options.reduce((s, o) => s + (o.vote_count || 0), 0)} votes
                          </span>
                        </div>
                        <div className="poll-options">
                          {(() => {
                            const total = p.poll_options.reduce((s, o) => s + (o.vote_count || 0), 0);
                            return p.poll_options.map((o, idx) => {
                              const pct = total > 0 ? Math.round(((o.vote_count || 0) / total) * 100) : 0;
                              const picked = p.voted_option_id === o.id;
                              return (
                                <button
                                  type="button"
                                  key={o.id}
                                  className={"poll-option c" + (idx % 5) + (picked ? " picked" : "")}
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
                        {p.voted_option_id && <div className="poll-panel-voted">You voted ✓</div>}
                      </div>
                    )}
                  </div>
                  {groupOf(p) !== "question" && groupOf(p) !== "poll" && !p.image && !(p.images && p.images.length) && (
                    <div className="post-visual">
                      <span>{typeIcon(p)}</span>
                    </div>
                  )}
                </div>
                {(p.image || (p.images && p.images.length > 0)) && groupOf(p) === "post" && (
                  <PostImageSlider
                    images={p.images}
                    image={p.image}
                    className="post-cover"
                    chip={<span className="post-cover-chip">{typeIcon(p)} {subtypeLabel(p) || groupLabel(p)}</span>}
                  />
                )}
                {(p.image || (p.images && p.images.length > 0)) && groupOf(p) !== "post" && (
                  <PostImageSlider images={p.images} image={p.image} className="post-image-slider" />
                )}
                {(() => {
                  const embed = extractVideoEmbed(p.body);
                  return embed && <VideoEmbed src={embed.src} provider={embed.provider} />;
                })()}
                <div className="post-footer">
                  <button
                    className={"post-footer-action" + (p.is_liked ? " liked" : "")}
                    onClick={() => toggleLike(p.id)}
                    disabled={likeBusy === p.id}
                  >
                    {p.is_liked ? "♥" : "♡"} {p.like_count || 0}
                  </button>
                  <span className="post-footer-action" style={{ cursor: "default" }}>
                    💬 {p.comment_count || 0} {groupOf(p) === "question" ? "answers" : "comments"}
                  </span>
                  <button
                    className={"post-footer-action" + (p.is_saved ? " saved" : "")}
                    onClick={() => toggleSave(p.id)}
                    disabled={saveBusy === p.id}
                  >
                    {p.is_saved ? "🔖 Saved" : "🔖 Save"}
                  </button>
                  <button
                    className="post-footer-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      openShare({
                        type: "post",
                        id: p.id,
                        title: p.title,
                        subtitle: community?.name,
                        image: p.image || p.images?.[0]?.image,
                      });
                    }}
                  >
                    ↗️ Share
                  </button>
                  <span className="post-footer-spacer" />
                  <span className="post-footer-link" onClick={() => navigate("/posts/" + p.id)}>
                    View post →
                  </span>
                </div>
              </div>
            ));
          })()}

          {postsNext && !search.trim() && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: 4 }}
              onClick={loadMorePosts}
              disabled={loadingMore}
            >
              {loadingMore ? <Spinner /> : "Load more posts"}
            </button>
          )}
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
              <div className="rail-title">Community info</div>
              <div className="rail-stat-row">
                <span>Members</span>
                <span className="rail-stat-num">{community.member_count || 0}</span>
              </div>
              <div className="rail-stat-row">
                <span>Posts</span>
                <span className="rail-stat-num">{posts ? posts.length : 0}</span>
              </div>
              <div className="rail-stat-row">
                <span>Pinned</span>
                <span className="rail-stat-num">{posts ? posts.filter((p) => p.is_pinned).length : 0}</span>
              </div>
              <div className="rail-stat-row">
                <span>Visibility</span>
                <span className="rail-stat-num">{community.is_public ? "Open" : "Private"}</span>
              </div>
              <div className="rail-stat-row">
                <span>Joining</span>
                <span className="rail-stat-num">{community.join_mode === "approval" ? "Registration" : "Instant"}</span>
              </div>
            </div>

            {canModerate && community.join_mode === "approval" && (
              <div className="card">
                <div className="rail-title">📝 Join requests</div>
                {joinRequests === null && <p className="subtle" style={{ margin: 0 }}>Loading…</p>}
                {joinRequests !== null && joinRequests.length === 0 && (
                  <p className="subtle" style={{ margin: 0 }}>No pending requests right now.</p>
                )}
                {(joinRequests || []).map((r) => (
                  <div
                    key={r.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Avatar name={r.username} size={28} />
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.username}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={approveBusy === r.id}
                        onClick={() => respondJoinRequest(r.id, true)}
                      >
                        {approveBusy === r.id ? <Spinner /> : "Approve"}
                      </button>
                      <button
                        className="btn btn-sm"
                        disabled={approveBusy === r.id}
                        onClick={() => respondJoinRequest(r.id, false)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {posts && posts.some((p) => p.is_pinned) && (
              <div className="card">
                <div className="rail-title">📌 Pinned</div>
                {posts
                  .filter((p) => p.is_pinned)
                  .map((p) => (
                    <div key={p.id} className="rail-pinned-item" onClick={() => navigate("/posts/" + p.id)}>
                      <span>{typeIcon(p)}</span>
                      <span className="rail-pinned-title">{p.title}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
