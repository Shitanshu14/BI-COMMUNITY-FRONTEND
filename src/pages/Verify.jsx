import { useState } from "react";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

export default function Verify() {
  const [form, setForm] = useState({ proof_type: "student_id", note: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await api("/api/verification/request/", { method: "POST", body: form });
      setMsg("Request filed. Check your profile for status.");
      setForm({ proof_type: "student_id", note: "" });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-wrap">
      <div className="eyebrow">Get verified</div>
      <h1>Get your badge</h1>
      <p className="subtle">Verified members carry a mark of trust across every community.</p>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />
        {msg && (
          <div className="chat-status live" style={{ marginBottom: 14 }}>
            {msg}
          </div>
        )}
        <label>Proof type</label>
        <select value={form.proof_type} onChange={set("proof_type")}>
          <option value="student_id">Student ID</option>
          <option value="employee_id">Employee ID</option>
          <option value="certificate">Certificate</option>
          <option value="other">Other</option>
        </select>
        <label>Note</label>
        <textarea
          value={form.note}
          onChange={set("note")}
          placeholder="Anything reviewers should know"
        />
        <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Submit request"}
        </button>
      </form>
    </div>
  );
}
