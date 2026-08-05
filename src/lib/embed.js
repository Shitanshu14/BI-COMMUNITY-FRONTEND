// Looks for a YouTube or Vimeo link anywhere in a block of text and
// returns an embeddable iframe URL, or null if none found. Used to turn a
// plain pasted link in a post body into an inline video player.

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

export function extractVideoEmbed(text) {
  if (!text) return null;

  const yt = text.match(YOUTUBE_RE);
  if (yt) return { provider: "YouTube", src: `https://www.youtube.com/embed/${yt[1]}` };

  const vim = text.match(VIMEO_RE);
  if (vim) return { provider: "Vimeo", src: `https://player.vimeo.com/video/${vim[1]}` };

  return null;
}
