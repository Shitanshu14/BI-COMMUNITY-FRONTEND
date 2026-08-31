import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar } from "../lib/helpers.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useShareSheet } from "../context/ShareSheetContext.jsx";
import CardImageGallery from "../components/CardImageGallery.jsx";

export default function CircleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const openShare = useShareSheet();
  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [inviteBusyId, setInviteBusyId] = useState(null);
  const [invited, setInvited] = useState({}); // user_id -> true, to disable button after sending

  // Owner-only "edit circle" panel — name/description/icon. Lets a circle
  // grow into a real identity (own picture, clearer purpose) instead of
  // being stuck with whatever was typed in the one-shot creation form.
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [newGalleryFiles, setNewGalleryFiles] = useState([]); // [{file, url}] — appended to circle.images on save

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        api("/api/circles/" + id + "/"),
        api("/api/circles/" + id + "/members/"),
      ]);
      setCircle(c);
      setMembers(m);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api("/api/search/?type=users&q=" + encodeURIComponent(query))
        .then((res) => setResults((res.users || []).filter((u) => !members?.some((m) => m.id === u.id))))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, members]);

  const inviteUser = async (u) => {
    setInviteBusyId(u.id);
    setErr("");
    try {
      await api("/api/circles/" + id + "/invite/", { method: "POST", body: { user_id: u.id } });
      setInvited((prev) => ({ ...prev, [u.id]: true }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setInviteBusyId(null);
    }
  };

  const leaveCircle = async () => {
    setBusy(true);
    setErr("");
    try {
      await api("/api/circles/" + id + "/leave/", { method: "POST" });
      navigate("/circles");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    setEditName(circle.name);
    setEditDescription(circle.description || "");
    setEditIconFile(null);
    setEditIconPreview(null);
    setNewGalleryFiles([]);
    setShowEdit(true);
  };

  const onEditIcon = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditIconFile(file);
    setEditIconPreview(URL.createObjectURL(file));
  };

  const onAddGalleryFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setNewGalleryFiles((prev) => {
      const currentTotal = (circle.images?.length || 0) + prev.length;
      const room = Math.max(0, 6 - currentTotal);
      const added = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...added];
    });
    e.target.value = "";
  };
  const removeNewGalleryFile = (i) => {
    setNewGalleryFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  };
  const removeExistingImage = async (imageId) => {
    try {
      await api(`/api/circles/${id}/images/${imageId}/delete/`, { method: "POST" });
      setCircle((prev) => ({ ...prev, images: prev.images.filter((im) => im.id !== imageId) }));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("name", editName.trim());
      fd.append("description", editDescription);
      if (editIconFile) fd.append("icon", editIconFile);
      newGalleryFiles.forEach(({ file }) => fd.append("images", file));
      const updated = await api("/api/circles/" + id + "/", { method: "PATCH", body: fd });
      setCircle((prev) => ({ ...prev, ...updated }));
      setShowEdit(false);
      if (editIconPreview) URL.revokeObjectURL(editIconPreview);
      setEditIconFile(null);
      setEditIconPreview(null);
      newGalleryFiles.forEach((g) => URL.revokeObjectURL(g.url));
      setNewGalleryFiles([]);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setEditBusy(false);
    }
  };

  const deleteCircle = async () => {
    if (!window.confirm(`Delete "${circle.name}" for everyone? This can't be undone.`)) return;
    setBusy(true);
    setErr("");
    try {
      await api("/api/circles/" + id + "/", { method: "DELETE" });
      navigate("/circles");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (!circle) {
    return (
      <div>
        <ErrorBox message={err} />
        {!err && <div className="empty-state">Loading circle…</div>}
      </div>
    );
  }

  return (
    <div>
      {circle.images && circle.images.length > 0 && (
        <CardImageGallery
          images={circle.images}
          height={220}
          className="circle-detail-gallery"
        />
      )}
      <div className="split" style={{ alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar name={circle.name} src={circle.icon} size={48} />
          <div>
            <div className="eyebrow">Circle</div>
            <h1 style={{ marginBottom: circle.description ? 4 : 0 }}>{circle.name}</h1>
            {circle.description && <p style={{ color: "var(--muted, #888)", margin: 0 }}>{circle.description}</p>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => navigate("/circles/" + id + "/qa")}>
            ❓ Q&amp;A
          </button>
          <button className="btn" onClick={() => navigate("/circles/" + id + "/events")}>
            📅 Events
          </button>
          <button className="btn" onClick={() => navigate("/circles/" + id + "/chat")}>
            💬 Live chat
          </button>
          <button
            className="btn"
            title="Share this circle"
            onClick={() =>
              openShare({
                type: "circle",
                id: circle.id,
                title: circle.name,
                subtitle: (circle.member_count || 0) + " members",
                image: circle.icon,
              })
            }
          >
            ↗️ Share
          </button>
          {circle.is_owner && (
            <button className="btn" onClick={() => (showEdit ? setShowEdit(false) : openEdit())}>
              {showEdit ? "Cancel" : "✏️ Edit circle"}
            </button>
          )}
          {circle.is_owner ? (
            <button className="btn" onClick={deleteCircle} disabled={busy}>
              Delete circle
            </button>
          ) : (
            <button className="btn" onClick={leaveCircle} disabled={busy}>
              Leave circle
            </button>
          )}
        </div>
      </div>

      <ErrorBox message={err} />

      {showEdit && circle.is_owner && (
        <form onSubmit={saveEdit} className="card" style={{ maxWidth: 460, padding: 16, marginTop: 16, marginBottom: 8 }}>
          <div className="rail-title" style={{ fontSize: 15, marginBottom: 10 }}>Edit circle</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
            <Avatar name={editName || circle.name} src={editIconPreview || circle.icon} size={52} />
            <label className="btn btn-sm" style={{ cursor: "pointer" }}>
              Change picture
              <input type="file" accept="image/*" onChange={onEditIcon} style={{ display: "none" }} />
            </label>
          </div>
          <label>Name</label>
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
          <div style={{ height: 10 }} />
          <label>Description</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            placeholder="What's this circle for?"
          />
          <div style={{ height: 12 }} />
          <label>Gallery images (up to 6 total — shown as a slideshow on the circle's card)</label>
          <div className="gallery-picker">
            {(circle.images || []).map((im) => (
              <div className="gallery-picker-thumb" key={im.id}>
                <img src={im.image} alt="" />
                <button type="button" className="gallery-picker-remove" onClick={() => removeExistingImage(im.id)}>
                  ✕
                </button>
              </div>
            ))}
            {newGalleryFiles.map((g, i) => (
              <div className="gallery-picker-thumb" key={g.url}>
                <img src={g.url} alt="" />
                <button type="button" className="gallery-picker-remove" onClick={() => removeNewGalleryFile(i)}>
                  ✕
                </button>
              </div>
            ))}
            {(circle.images?.length || 0) + newGalleryFiles.length < 6 && (
              <label className="gallery-picker-add">
                <input type="file" accept="image/*" multiple onChange={onAddGalleryFiles} style={{ display: "none" }} />
                <span className="image-dropzone-icon">📷</span>
                <span>Add images</span>
              </label>
            )}
          </div>
          <div style={{ height: 12 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={editBusy}>
              {editBusy ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn" onClick={() => setShowEdit(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="community-card-meta" style={{ marginBottom: 16 }}>
        {circle.member_count} / {circle.max_members} members
      </div>

      {circle.is_owner && (
        <div className="card" style={{ padding: 16, maxWidth: 460, marginBottom: 24 }}>
          <div className="rail-title" style={{ fontSize: 15, marginBottom: 10 }}>Invite someone</div>
          <input
            type="text"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((u) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={u.username} src={u.avatar} size={28} />
                  <span style={{ flex: 1 }}>{u.username}</span>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={inviteBusyId === u.id || invited[u.id]}
                    onClick={() => inviteUser(u)}
                  >
                    {invited[u.id] ? "Invited" : inviteBusyId === u.id ? "…" : "Invite"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rail-title" style={{ fontSize: 16, marginBottom: 10 }}>Members</div>
      {members === null && <div className="empty-state">Loading members…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(members || []).map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
              onClick={() => navigate("/profile/" + m.id)}
            >
              <Avatar name={m.username} src={m.avatar} size={32} />
              <span>{m.username}</span>
              {m.is_verified && <span className="verified-tick" title="Verified">✓</span>}
              {m.role === "owner" && <span className="badge badge-role">owner</span>}
            </div>
            {me && m.id !== me.id && (
              <button className="btn btn-sm" onClick={() => navigate("/messages/" + m.id)}>
                ✉️ Message
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
