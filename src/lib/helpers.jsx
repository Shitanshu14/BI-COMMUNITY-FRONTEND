export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

export function Spinner() {
  return <span className="spinner" />;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="error-box">{message}</div>;
}

export function RoleBadge({ role, isVerified }) {
  return (
    <>
      <span className="badge badge-role">{role}</span>
      {isVerified && <span className="badge badge-verified">✓ verified</span>}
    </>
  );
}

// Vibrant palette that harmonizes with the app's purple → pink → orange
// accent gradient, instead of the old muted/desaturated set — so a plain
// initials-avatar still feels part of the same "advanced" color language
// as the gradient buttons/badges elsewhere.
const AVATAR_COLORS = ["#7c5cff", "#ff4fa3", "#ff9d4d", "#3ddc97", "#4fc3f7", "#c46bff"];

function colorFor(seed) {
  let hash = 0;
  for (let i = 0; i < (seed || "").length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, src, size = 40 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className="avatar avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: colorFor(name || "") }}
    >
      {initial}
    </span>
  );
}

export function Skeleton({ width = "100%", height = 16, radius, style }) {
  return (
    <span
      className="skeleton"
      style={{ display: "block", width, height, borderRadius: radius, ...style }}
    />
  );
}

export function VideoEmbed({ src, provider }) {
  return (
    <div className="video-embed">
      <iframe
        src={src}
        title={provider + " video"}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
