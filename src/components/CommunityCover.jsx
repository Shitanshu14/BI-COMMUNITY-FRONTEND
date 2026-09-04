// Cover photo (wide banner) with the circular profile picture overlapping
// its bottom-left corner — the same "cover + profile are separate images"
// look on every community card. When a community hasn't uploaded either
// yet, both fall back to a generated look (gradient banner + initial)
// instead of a broken image, cycled by index so a grid of un-branded
// communities still reads as individually colored rather than one flat
// repeated block.
import { useState, useEffect } from "react";

const GRADIENTS = [
  "linear-gradient(135deg, var(--grad-1))",
  "linear-gradient(135deg, var(--grad-2))",
  "linear-gradient(135deg, var(--grad-3))",
  "linear-gradient(135deg, var(--grad-4))",
  "linear-gradient(135deg, var(--grad-5))",
];

export function communityGradient(index) {
  // Grad tokens are already full gradients, not color stops, so reuse them
  // directly instead of nesting a second linear-gradient() around one.
  const vars = ["--grad-1", "--grad-2", "--grad-3", "--grad-4", "--grad-5"];
  return `var(${vars[index % vars.length]})`;
}

export default function CommunityCover({ community, index = 0, height = 110, badge }) {
  const initial = (community.name || "?").trim().charAt(0).toUpperCase();
  const gradient = communityGradient(index);

  // A broken cover/icon URL (deleted upload, bad media path, etc.) should
  // drop into the same gradient/initial look used for "no image yet" —
  // not the browser's default broken-image icon.
  const [coverFailed, setCoverFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [community.cover_image]);
  useEffect(() => setIconFailed(false), [community.icon]);

  return (
    <div className="comm-cover" style={{ height }}>
      {community.cover_image && !coverFailed ? (
        <img
          className="comm-cover-img"
          src={community.cover_image}
          alt=""
          loading="lazy"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <div className="comm-cover-img comm-cover-fallback" style={{ background: gradient }} />
      )}
      {badge}
      <div className="comm-cover-icon-wrap">
        {community.icon && !iconFailed ? (
          <img
            className="comm-cover-icon"
            src={community.icon}
            alt={community.name}
            onError={() => setIconFailed(true)}
          />
        ) : (
          <div className="comm-cover-icon comm-cover-icon-fallback" style={{ background: gradient }}>
            {initial}
          </div>
        )}
      </div>
    </div>
  );
}
