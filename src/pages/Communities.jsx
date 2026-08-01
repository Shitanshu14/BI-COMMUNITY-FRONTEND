import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox, Avatar } from "../lib/helpers.jsx";

export default function Communities() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", is_public: true, rules: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setList(await api("/api/communities/"));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/communities/", { method: "POST", body: form });
      setForm({ name: "", slug: "", description: "", is_public: true, rules: "" });
      setShowForm(false);
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const items = Array.isArray(list) ? list : (list && list.results) || [];

  return (
    <div>
      <div className="split">
        <div>
          <div className="eyebrow">Communities</div>
          <h1>Browse communities</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New community"}
        </button>
      </div>

      <ErrorBox message={err} />

      {showForm && (
        <form onSubmit={create} className="card" style={{ marginBottom: 28 }}>
          <label>Name</label>
          <input type="text" value={form.name} onChange={set("name")} required />
          <label>Slug (unique, no spaces)</label>
          <input type="text" value={form.slug} onChange={set("slug")} required />
          <label>Description</label>
          <textarea value={form.description} onChange={set("description")} />
          <label>Rules</label>
          <textarea value={form.rules} onChange={set("rules")} />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner /> : "Create community"}
          </button>
        </form>
      )}

      {list === null && <div className="empty-state">Loading communities…</div>}
      {list !== null && items.length === 0 && (
        <div className="empty-state">No communities yet. Be the first to create one.</div>
      )}

      <div className="community-grid">
        {items.map((c) => (
          <div className="community-card" key={c.id} onClick={() => navigate("/communities/" + c.id)}>
            <div className="community-card-head">
              <Avatar name={c.name} size={40} />
              {!c.is_public && <span className="badge badge-role">private</span>}
              {c.is_member && <span className="badge badge-verified">joined</span>}
            </div>
            <div className="entry-title">{c.name}</div>
            <div className="community-card-desc">{c.description || "No description yet."}</div>
            <div className="community-card-meta">
              <span>{c.member_count || 0} members</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
