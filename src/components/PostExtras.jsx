import { subtypeOf, parseLinks, readTime, prettyDomain } from "../lib/postTypes.js";

// Renders the bit that makes a Knowledge / Project / Resource post look
// different from a plain text post — a read-time chip, or a row of link
// pills. Deliberately generic: a Project's links aren't assumed to be
// "repo"/"live" (an artist posting a project has neither), they're
// whatever the author labelled them.
export default function PostExtras({ post, compact = false }) {
  const subtype = subtypeOf(post);
  if (!subtype) return null;

  if (subtype.value === "Knowledge") {
    return (
      <div className="post-extras post-extras-knowledge">
        <span className="read-time-chip">📖 {readTime(post.body)} min read</span>
      </div>
    );
  }

  const links = parseLinks(post.links);
  if (links.length === 0) return null;

  if (subtype.value === "Resource") {
    const primary = links[0];
    return (
      <a
        className="resource-link-card"
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="resource-link-icon">🔗</span>
        <span className="resource-link-body">
          <span className="resource-link-label">{primary.label}</span>
          <span className="resource-link-domain">{prettyDomain(primary.url)}</span>
        </span>
        <span className="resource-link-go">Open ↗</span>
      </a>
    );
  }

  // Project — one pill per link, however many the author added.
  return (
    <div className={"post-extras post-extras-project" + (compact ? " compact" : "")}>
      {links.map((l, i) => (
        <a
          key={i}
          className="project-link-pill"
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          🔗 {l.label} ↗
        </a>
      ))}
    </div>
  );
}
