import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api.js";
import { ErrorBox, Spinner } from "../lib/helpers.jsx";

const CATEGORIES = [
  { value: "technology", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "social", label: "Social" },
  { value: "gaming", label: "Gaming" },
  { value: "business", label: "Business" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

// Cover photo (wide banner) and profile picture (circular badge) are kept
// as two separate uploads — same idea as the profile page's avatar picker,
// just doubled up. Both accept regular images *and* animated .gif files;
// nothing extra is needed for the GIF to actually animate once it's
// uploaded, the browser does that automatically wherever the image is shown.
export default function CreateCommunityModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [isPublic, setIsPublic] = useState(true);
  const [joinMode, setJoinMode] = useState("open");
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [icon, setIcon] = useState(null);
  const [iconPreview, setIconPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFile = (file, setFile, setPreview) => {
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Give your community a name first.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("category", category);
      form.append("is_public", isPublic ? "true" : "false");
      form.append("join_mode", joinMode);
      if (cover) form.append("cover_image", cover);
      if (icon) form.append("icon", icon);
      const created = await api("/api/communities/", { method: "POST", body: form });
      onCreated(created);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <h3>Create a community</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <ErrorBox message={err} />

            <div className="create-community-covers">
              <label className="create-community-cover-pick" style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : undefined}>
                {!coverPreview && <span>+ Cover photo (GIF ok)</span>}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => pickFile(e.target.files?.[0], setCover, setCoverPreview)}
                  style={{ display: "none" }}
                />
              </label>
              <label className="create-community-icon-pick" style={iconPreview ? { backgroundImage: `url(${iconPreview})` } : undefined}>
                {!iconPreview && <span>+ Profile</span>}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => pickFile(e.target.files?.[0], setIcon, setIconPreview)}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <div className="field-hint" style={{ marginBottom: 16 }}>
              Cover photo and profile picture are separate — change one without touching the other.
              Upload an animated .gif to either for a live, moving look.
            </div>

            <label className="field-label">Community name</label>
            <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Web Development" maxLength={100} />

            <div style={{ height: 12 }} />
            <label className="field-label">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this community about?" rows={3} />

            <div style={{ height: 12 }} />
            <label className="field-label">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div style={{ height: 12 }} />
            <label className="field-label">Who can join</label>
            <select value={joinMode} onChange={(e) => setJoinMode(e.target.value)}>
              <option value="open">Open — anyone can join instantly</option>
              <option value="approval">Registration required — an admin must approve</option>
            </select>

            <div style={{ height: 10 }} />
            <label className="create-community-checkbox">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Public — visible to everyone, not just members
            </label>
          </div>
          <div className="modal-head" style={{ borderBottom: "none", borderTop: "1px solid var(--border-soft)" }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Spinner /> : "Create Community"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
