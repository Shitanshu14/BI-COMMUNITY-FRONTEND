// Backend only ever stores post_type as one of 3 raw values — question /
// post / poll (see posts/models.py Post.PostType). What used to be
// separate Knowledge/Project/Resource *types* are now just `tags` on a
// post_type="post" post (e.g. tags=["Project"]). Every helper below takes
// the whole post-like object ({ post_type, tags }) rather than a bare
// string, so it can look at both.

export const TOP_TYPES = [
  { value: "question", label: "Question", icon: "❓", hint: "Ask for help — Q&A" },
  { value: "post", label: "Post", icon: "📝", hint: "Share knowledge, projects, resources" },
  { value: "poll", label: "Poll", icon: "📊", hint: "Get community opinions" },
];

// Sub-tags shown only when the top-level type is "Post". `value` here is
// also the exact tag string stored in Post.tags[0] — keep it in sync with
// backend Post.SUGGESTED_TAGS.
export const POST_SUBTYPES = [
  { value: "Knowledge", label: "Knowledge", icon: "📘", hint: "Write-ups, explainers, how-tos" },
  { value: "Project", label: "Project", icon: "🚀", hint: "Show off something you made — code, art, anything" },
  { value: "Resource", label: "Resource", icon: "🔖", hint: "Share a useful link, tool, or article" },
];

export const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "question", label: "Questions" },
  { value: "post", label: "Posts" },
  { value: "poll", label: "Polls" },
];

// Which top-level bucket a post belongs to.
export function groupOf(post) {
  const t = typeof post === "string" ? post : post?.post_type;
  if (t === "question") return "question";
  if (t === "poll") return "poll";
  return "post"; // "post", plus any legacy stray value
}

// The Knowledge/Project/Resource subtype, read from the first tag. Only
// meaningful for post_type="post" — returns null otherwise.
export function subtypeOf(post) {
  if (!post || typeof post === "string") return null;
  if (groupOf(post) !== "post") return null;
  const first = post.tags?.[0];
  if (!first) return null;
  return POST_SUBTYPES.find((s) => s.value.toLowerCase() === String(first).toLowerCase()) || null;
}

export function typeIcon(post) {
  const g = groupOf(post);
  if (g === "question") return "❓";
  if (g === "poll") return "📊";
  return subtypeOf(post)?.icon || "📝";
}

// Short label for the subtype (e.g. "Knowledge"), used as a secondary tag.
export function subtypeLabel(post) {
  return subtypeOf(post)?.label || null;
}

// Top-level label ("Question" / "Post" / "Poll").
export function groupLabel(post) {
  const g = groupOf(post);
  return (TOP_TYPES.find((t) => t.value === g) || {}).label || "Post";
}

// Post.links entries are flat "Label|||URL" strings (see backend
// PostSerializer) — parse them back into { label, url } for rendering.
export function parseLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((raw) => {
      const idx = String(raw).indexOf("|||");
      if (idx === -1) return null;
      const label = raw.slice(0, idx).trim();
      const url = raw.slice(idx + 3).trim();
      if (!url) return null;
      return { label: label || prettyDomain(url), url };
    })
    .filter(Boolean);
}

export function encodeLink(label, url) {
  return (label || "").trim() + "|||" + (url || "").trim();
}

export function prettyDomain(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Rough reading time for Knowledge posts — ~200 wpm, minimum 1 minute.
export function readTime(body) {
  const words = (body || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
