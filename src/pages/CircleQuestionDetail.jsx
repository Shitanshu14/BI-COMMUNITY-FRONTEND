import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Avatar, ErrorBox, Spinner, timeAgo } from "../lib/helpers.jsx";

export default function CircleQuestionDetail() {
  const { id, qid } = useParams();
  const { user: me } = useAuth();
  const [circle, setCircle] = useState(null);
  const [question, setQuestion] = useState(null);
  const [err, setErr] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(null);

  const load = async () => {
    try {
      const [c, q] = await Promise.all([
        api("/api/circles/" + id + "/"),
        api("/api/circles/" + id + "/questions/" + qid + "/"),
      ]);
      setCircle(c);
      setQuestion(q);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, qid]);

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const a = await api("/api/circles/" + id + "/questions/" + qid + "/answers/", {
        method: "POST",
        body: { body: answerText },
      });
      setQuestion((q) => ({ ...q, answers: [...(q.answers || []), a], answer_count: (q.answer_count || 0) + 1 }));
      setAnswerText("");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const acceptAnswer = async (answerId) => {
    setAcceptBusy(answerId);
    setErr("");
    try {
      await api("/api/circles/" + id + "/questions/" + qid + "/answers/" + answerId + "/accept/", { method: "POST" });
      setQuestion((q) => ({
        ...q,
        is_solved: true,
        answers: q.answers.map((a) => ({ ...a, is_accepted: a.id === answerId })),
      }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setAcceptBusy(null);
    }
  };

  const canAccept = question && me && (question.author?.id === me.id || circle?.is_owner);

  if (!question) {
    return (
      <div className="page">
        <ErrorBox message={err} />
        {!err && <div className="empty-state">Loading…</div>}
      </div>
    );
  }

  return (
    <div className="page">
      <Link className="nav-link" to={"/circles/" + id + "/qa"}>
        ← Back to Q&amp;A
      </Link>
      <div style={{ height: 14 }} />
      <ErrorBox message={err} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="qa-row-title" style={{ fontSize: 20, marginBottom: 10 }}>
          {question.is_solved && <span className="qa-solved-tick" title="Solved">✓</span>}
          {question.title}
        </div>
        {question.body && <p className="post-body">{question.body}</p>}
        <div className="qa-row-meta">
          <Avatar name={question.author?.username} src={question.author?.avatar} size={22} />
          <span>{question.author?.username}</span>
          <span>·</span>
          <span>{timeAgo(question.created_at)}</span>
        </div>
      </div>

      <h3>{question.answers?.length || 0} {question.answers?.length === 1 ? "Answer" : "Answers"}</h3>

      {question.answers?.length === 0 && (
        <div className="empty-state">No answers yet. Be the first to help out.</div>
      )}

      {question.answers?.map((a) => (
        <div className={"card qa-answer" + (a.is_accepted ? " qa-answer-accepted" : "")} key={a.id} style={{ marginBottom: 12 }}>
          {a.is_accepted && <div className="qa-accepted-badge">✓ Accepted answer</div>}
          <p className="post-body" style={{ marginTop: a.is_accepted ? 6 : 0 }}>{a.body}</p>
          <div className="qa-row-meta" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Avatar name={a.author?.username} src={a.author?.avatar} size={20} />
              {a.author?.username}
              <span>·</span>
              {timeAgo(a.created_at)}
            </span>
            {canAccept && !a.is_accepted && (
              <button className="btn btn-sm" disabled={acceptBusy === a.id} onClick={() => acceptAnswer(a.id)}>
                {acceptBusy === a.id ? <Spinner /> : "Mark as accepted"}
              </button>
            )}
          </div>
        </div>
      ))}

      <form onSubmit={submitAnswer} className="card" style={{ marginTop: 16 }}>
        <label>Your answer</label>
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Share what you know…"
        />
        <button className="btn btn-primary" disabled={busy || !answerText.trim()}>
          {busy ? <Spinner /> : "Post answer"}
        </button>
      </form>
    </div>
  );
}
