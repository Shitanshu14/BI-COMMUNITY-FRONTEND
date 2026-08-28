import { useState, useEffect, useRef } from "react";

const AUTOPLAY_MS = 2600;

/**
 * Compact auto-cycling image banner for a grid card (Community card, Circle
 * card, Trending card) — the "app-store-listing" screenshots idea: a
 * community/circle can attach several gallery images (see the create/edit
 * forms), and instead of a single static picture, the card slides through
 * all of them on its own, pausing on hover so it doesn't fight someone who
 * actually stopped to look. Renders nothing if there are 0-1 images (a
 * single image needs no chrome — it just sits there).
 *
 * `images` accepts either a list of gallery objects (`{ id, image }`, as
 * returned by the API) or a plain list of URL strings.
 */
export default function CardImageGallery({ images, height = 132, className = "" }) {
  const urls = (images || []).map((im) => (typeof im === "string" ? im : im.image)).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (urls.length < 2 || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.length, paused]);

  if (urls.length === 0) return null;

  return (
    <div
      className={"card-gallery " + className}
      style={{ height }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {urls.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={"card-gallery-slide" + (i === index ? " active" : "")}
        />
      ))}
      {urls.length > 1 && (
        <div className="card-gallery-dots">
          {urls.map((_, i) => (
            <span
              key={i}
              className={"card-gallery-dot" + (i === index ? " active" : "")}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
