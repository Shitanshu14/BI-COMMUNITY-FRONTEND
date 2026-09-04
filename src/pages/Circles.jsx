import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBox, Avatar, Spinner, timeAgo } from "../lib/helpers.jsx";
import CardImageGallery from "../components/CardImageGallery.jsx";

export default function Circles() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState(null);
  const [circlesNext, setCirclesNext] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [invites, setInvites] = useState(null);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]); // [{file, url}] — up to 6, sent as repeated `images` fields
  const [busy, setBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(null);

  const load = async () => {
    try {
      const [c, i] = await Promise.all([
        api("/api/circles/"),
        api("/api/circles/invites/"),
      ]);
      setCircles(Array.isArray(c) ? c : c.results || []);
      setCirclesNext(Array.isArray(c) ? null : c.next || null);
      setInvites(Array.isArray(i) ? i : i.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const loadMoreCircles = async () => {
    if (!circlesNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api(circlesNext.replace(/^https?:\/\/[^/]+/, ""));
      setCircles((prev) => [...prev, ...(res.results || [])]);
      setCirclesNext(res.next || null);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onGalleryPick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setGalleryFiles((prev) => {
      const room = Math.max(0, 6 - prev.length);
      const added = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...added];
    });
    e.target.value = ""; // allow picking the same file again after removing it
  };
  const removeGalleryImage = (i) => {
    setGalleryFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const createCircle = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description);
      galleryFiles.forEach(({ file }) => fd.append("images", file));
      const circle = await api("/api/circles/", {
        method: "POST",
        body: fd,
      });
      setName("");
      setDescription("");
      galleryFiles.forEach((g) => URL.revokeObjectURL(g.url));
      setGalleryFiles([]);
      setShowCreate(false);
      navigate("/circles/" + circle.id);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const respondInvite = async (invite, accept) => {
    setInviteBusy(invite.id);
    setErr("");
    try {
      const res = await api(`/api/circles/invites/${invite.id}/${accept ? "accept" : "decline"}/`, {
        method: "POST",
      });
      setInvites((prev) => prev.filter((x) => x.id !== invite.id));
      if (accept && res.circle_id) navigate("/circles/" + res.circle_id);
      else load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setInviteBusy(null);
    }
  };

  const trendingCircle = circles && circles.length
    ? [...circles].sort((a, b) => (b.member_count || 0) - (a.member_count || 0))[0]
    : null;

  return (
    <div className="circles-page">
      <div className="split">
        <div>
          <div className="eyebrow">Circles</div>
          <h1>Your circles</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Cancel" : "+ New circle"}
        </button>
      </div>

      {circles !== null && circles.length > 0 && (
        <div className="comm-status-chip" style={{ marginBottom: 18 }}>
          <div
            className={"comm-status-item" + (trendingCircle ? " comm-status-item-link" : "")}
            onClick={trendingCircle ? () => navigate("/circles/" + trendingCircle.id) : undefined}
            title={trendingCircle ? "Open " + trendingCircle.name : undefined}
          >
            <span className="comm-status-icon comm-status-icon-live">🔥</span>
            <div>
              <div className="comm-status-label">Most active</div>
              <div className="comm-status-value">{trendingCircle ? trendingCircle.name : "—"}</div>
            </div>
          </div>
          <div className="comm-status-divider" />
          <div className="comm-status-item">
            <span className="comm-status-icon">🔒</span>
            <div>
              <div className="comm-status-label">Circles</div>
              <div className="comm-status-value">{circles.length} joined</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 8 }} />
      <p style={{ color: "var(--muted, #888)", maxWidth: 560 }}>
        Circles are small, private, invite-only groups — for a project team,
        classmates, or close collaborators. Unlike Communities, Circles never
        show up in search or discovery; the only way in is an invite.
      </p>

      <ErrorBox message={err} />

      {showCreate && (
        <form onSubmit={createCircle} className="card" style={{ maxWidth: 420, padding: 16, marginBottom: 20 }}>
          <label>Name</label>
          <input
            type="text"
            placeholder="e.g. Final Year Project Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div style={{ height: 10 }} />
          <label>Description (optional)</label>
          <textarea
            placeholder="What's this circle for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div style={{ height: 10 }} />
          <label>Gallery images (optional — up to 6, shown as a slideshow on the circle's card)</label>
          <div className="gallery-picker">
            {galleryFiles.map((g, i) => (
              <div className="gallery-picker-thumb" key={g.url}>
                <img src={g.url} alt="" />
                <button type="button" className="gallery-picker-remove" onClick={() => removeGalleryImage(i)}>
                  ✕
                </button>
              </div>
            ))}
            {galleryFiles.length < 6 && (
              <label className="gallery-picker-add">
                <input type="file" accept="image/*" multiple onChange={onGalleryPick} style={{ display: "none" }} />
                <span className="image-dropzone-icon">📷</span>
                <span>{galleryFiles.length ? "Add more" : "Click to add images"}</span>
              </label>
            )}
          </div>
          <div style={{ height: 12 }} />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create circle"}
          </button>
        </form>
      )}

      {invites !== null && invites.length > 0 && (
        <>
          <div className="rail-title" style={{ fontSize: 16, marginBottom: 10 }}>📩 Pending invites</div>
          <div className="suggested-row">
            {invites.filter((inv) => inv.circle).map((inv) => (
              <div className="suggested-card" key={inv.id}>
                <Avatar name={inv.circle?.name || "?"} src={inv.circle?.icon} size={36} />
                <div className="suggested-card-name">{inv.circle?.name || "Unknown circle"}</div>
                <div className="suggested-card-meta">
                  invited by {inv.invited_by?.username || "someone"} · {timeAgo(inv.created_at)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={inviteBusy === inv.id}
                    onClick={() => respondInvite(inv, true)}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={inviteBusy === inv.id}
                    onClick={() => respondInvite(inv, false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 24 }} />
        </>
      )}

      {circles === null && <div className="empty-state">Loading circles…</div>}
      {circles !== null && circles.length === 0 && (
        <div className="empty-state">
          You're not in any circle yet. Create one, or wait for an invite.
        </div>
      )}

      <div className="community-grid">
        {(circles || []).map((c) => (
          <div className="community-card circle-card" key={c.id} onClick={() => navigate("/circles/" + c.id)}>
            <CardImageGallery images={c.images} />
            <div className="community-card-head">
              <Avatar name={c.name} src={c.icon} size={40} />
              <span className="badge badge-circle">🔒 circle</span>
              {c.is_owner && <span className="badge badge-verified">owner</span>}
            </div>
            <div className="entry-title">{c.name}</div>
            <div className="community-card-desc">{c.description || "No description yet."}</div>
            <div className="community-card-meta">
              <span>{c.member_count || 0}{c.max_members ? ` / ${c.max_members}` : ""} members</span>
            </div>
          </div>
        ))}
      </div>

      {circlesNext && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: 16 }}
          onClick={loadMoreCircles}
          disabled={loadingMore}
        >
          {loadingMore ? <Spinner /> : "Load more circles"}
        </button>
      )}
    </div>
  );
}
