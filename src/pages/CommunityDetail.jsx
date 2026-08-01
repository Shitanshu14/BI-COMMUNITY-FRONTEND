import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, timeAgo } from "../lib/helpers.jsx";

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ post_type: "question", title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        api("/api/communities/" + id + "/"),
        api("/api/posts/"),
      ]);
      setCommunity(c);
      const all = Array.isArray(p) ? p : p.results || [];
      setPosts(all.filter((post) => post.community === id));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/posts/", { method: "POST", body: { ...form, community: id } });
      setForm({ post_type: "question", title: "", body: "" });
      setShowForm(false);
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="margin-page">
      <Link className="nav-link" to="/communities">
        ← All communities
      </Link>
      <div style={{ height: 14 }} />

      {community && (
        <>
          <div className="eyebrow">{community.is_public ? "Open community" : "Private community"}</div>
          <h1>{community.name}</h1>
          <p className="subtle">{community.description}</p>
          {community.rules && (
            <p className="subtle">
              <strong>Rules: </strong>
              {community.rules}
            </p>
          )}
        </>
      )}

      <ErrorBox message={err} />

      <div className="split" style={{ marginTop: 24 }}>
        <button
          className="nav-link"
          style={{ fontSize: 13 }}
          onClick={() => navigate("/chat/" + id)}
        >
          → Open community chat
        </button>
        <button className="btn btn-accent" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New post"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card" style={{ marginBottom: 28 }}>
          <label>Type</label>
          <select value={form.post_type} onChange={set("post_type")}>
            <option value="question">Question</option>
            <option value="discussion">Discussion</option>
            <option value="resource">Resource</option>
            <option value="announcement">Announcement</option>
          </select>
          <label>Title</label>
          <input type="text" value={form.title} onChange={set("title")} required />
          <label>Body</label>
          <textarea value={form.body} onChange={set("body")} required />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner /> : "Post"}
          </button>
        </form>
      )}

      {posts === null && <div className="empty-state">Loading posts…</div>}
      {posts !== null && posts.length === 0 && (
        <div className="empty-state">No posts here yet. Start the discussion.</div>
      )}

      {posts &&
        posts.map((p, i) => (
          <div className="entry" key={p.id}>
            <div className="serial">{String(i + 1).padStart(2, "0")}</div>
            <div className="entry-head">
              <span className="badge badge-type">{p.post_type}</span>
              <span className="entry-title" onClick={() => navigate("/posts/" + p.id)}>
                {p.title}
              </span>
            </div>
            <div className="entry-body">{p.body}</div>
            <div className="entry-meta">
              <span>{timeAgo(p.created_at)}</span>
              <span>{(p.likes ? p.likes.length : 0)} likes</span>
            </div>
          </div>
        ))}
    </div>
  );
}
