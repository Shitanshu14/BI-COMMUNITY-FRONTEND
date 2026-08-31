import { createContext, useContext, useState, useCallback } from "react";
import ShareSheet from "../components/ShareSheet.jsx";

// App-wide "share this" modal — a Post, a Circle question, or an invite to
// join a Community/Circle. Lives at the root (see App.jsx) so any page can
// pop it open with a single hook call instead of every feed/list owning
// its own copy of the picker UI, exactly like a native share sheet.
const ShareSheetContext = createContext(null);

export function ShareSheetProvider({ children }) {
  const [payload, setPayload] = useState(null); // { type, id, title, subtitle, image } | null

  const openShare = useCallback((item) => setPayload(item), []);
  const closeShare = useCallback(() => setPayload(null), []);

  return (
    <ShareSheetContext.Provider value={openShare}>
      {children}
      {payload && <ShareSheet item={payload} onClose={closeShare} />}
    </ShareSheetContext.Provider>
  );
}

// Returns `openShare(item)` — call with
// { type: "post"|"question"|"community"|"circle", id, title, subtitle?, image? }
export function useShareSheet() {
  const ctx = useContext(ShareSheetContext);
  if (!ctx) throw new Error("useShareSheet must be used inside <ShareSheetProvider>");
  return ctx;
}
