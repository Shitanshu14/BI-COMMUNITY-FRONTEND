import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Avatar, ErrorBox, Spinner, timeAgo } from "../lib/helpers.jsx";

/** Circle Q&A board — list of questions asked inside a circle. Lives
 * alongside the circle's live chat: chat is for quick back-and-forth,
 * this is for "ask once, get a durable answer" (see CircleQuestion model
 * docstring on the backend for the reasoning). */
export default function CircleQA() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [circle, setCircle] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [err, setErr] = useState("");
  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [c, qs] = await Promise.all([
        api("/api/circles/" + id + "/"),
        api("/api/circles/" + id + "/questions/"),
      ]);
      setCircle(c);
      setQuestions(Array.isArray(qs) ? qs : qs.results || []);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const q = await api("/api/circles/" + id + "/questions/", { method: "POST", body: form });
      setQuestions((prev) => [q, ...(prev || [])]);
      setForm({ title: "", body: "" });
      setAsking(false);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Link className="nav-link" to={"/circles/" + id}>
        ← Back to circle
      </Link>
      <div style={{ height: 14 }} />

      <div className="split">
        <div>
          <div className="eyebrow">Q&amp;A</div>
          <h1>{circle ? circle.name : "Circle"} — questions</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/circles/" + id + "/chat")}>
            💬 Live chat
          </button>
          <button className="btn btn-primary" onClick={() => setAsking((v) => !v)}>
            {asking ? "Cancel" : "❓ Ask a question"}
          </button>
        </div>
      </div>

      <ErrorBox message={err} />

      {asking && (
        <form onSubmit={submit} className="card" style={{ marginBottom: 20, marginTop: 12 }}>
          <label>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. How do I center a div?"
            autoFocus
          />
          <label>Details (optional)</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Add any context that'll help someone answer"
          />
          <button className="btn btn-primary" disabled={busy || !form.title.trim()}>
            {busy ? <Spinner /> : "Post question"}
          </button>
        </form>
      )}

      <div style={{ height: 10 }} />

      {questions === null && <div className="empty-state">Loading questions…</div>}
      {questions !== null && questions.length === 0 && (
        <div className="empty-state">No questions yet. Be the first to ask something.</div>
      )}

      <div className="qa-list">
        {questions &&
          questions.map((q) => (
            <div
              className="qa-row"
              key={q.id}
              onClick={() => navigate("/circles/" + id + "/qa/" + q.id)}
            >
              <div className="qa-row-stat">
                <strong>{q.answer_count || 0}</strong>
                <span>{q.answer_count === 1 ? "answer" : "answers"}</span>
              </div>
              <div className="qa-row-main">
                <div className="qa-row-title">
                  {q.is_solved && <span className="qa-solved-tick" title="Solved">✓</span>}
                  {q.title}
                </div>
                {q.body && <div className="qa-row-body">{q.body}</div>}
                <div className="qa-row-meta">
                  <Avatar name={q.author?.username} size={20} />
                  <span>{q.author?.username}</span>
                  <span>·</span>
                  <span>{timeAgo(q.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
