import { useRef, useState } from "react";

/**
 * Swipeable image gallery for a post. Renders `images` (Post.images from
 * the API, already ordered) when present; falls back to the single legacy
 * `image` field for posts created before the gallery existed. A single
 * image renders as a plain <img> — the slider chrome (dots/arrows) only
 * shows up once there's actually something to slide between.
 */
export default function PostImageSlider({ images, image, className = "", chip = null }) {
  const urls = images && images.length ? images.map((im) => im.image) : image ? [image] : [];
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  if (urls.length === 0) return null;

  const goTo = (i) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    setActive(i);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== active) setActive(i);
  };

  return (
    <div className={"post-slider " + className}>
      <div className="post-slider-track" ref={trackRef} onScroll={onScroll}>
        {urls.map((src, i) => (
          <div className="post-slider-slide" key={src + i}>
            <img src={src} alt="" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
      {chip}
      {urls.length > 1 && (
        <>
          <div className="post-slider-count">{active + 1}/{urls.length}</div>
          {active > 0 && (
            <button
              type="button"
              className="post-slider-arrow post-slider-arrow-left"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(active - 1); }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}
          {active < urls.length - 1 && (
            <button
              type="button"
              className="post-slider-arrow post-slider-arrow-right"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(active + 1); }}
              aria-label="Next image"
            >
              ›
            </button>
          )}
          <div className="post-slider-dots">
            {urls.map((_, i) => (
              <span
                key={i}
                className={"post-slider-dot" + (i === active ? " active" : "")}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
