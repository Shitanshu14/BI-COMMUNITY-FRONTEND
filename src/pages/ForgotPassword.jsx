import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/users/password/reset/", { method: "POST", body: { email } });
      setSent(true);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="form-wrap">
        <div className="eyebrow">Check your email</div>
        <h1>Reset link sent</h1>
        <p className="subtle">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
          It'll expire after a while, so use it soon.
        </p>
        <div style={{ height: 20 }} />
        <Link to="/login" className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <div className="eyebrow">Forgot password</div>
      <h1>Reset your password</h1>
      <p className="subtle">Enter the email on your account and we'll send you a reset link.</p>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Send reset link"}
        </button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        <Link to="/login" style={{ textDecoration: "underline" }}>Back to sign in</Link>
        {" · "}
        <Link to="/support-contact" style={{ textDecoration: "underline" }}>Contact support</Link>
      </p>
    </div>
  );
}
