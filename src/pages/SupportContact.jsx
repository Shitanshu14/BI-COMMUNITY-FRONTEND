import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

export default function SupportContact() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/support/tickets/create/", {
        method: "POST",
        body: { username, email, message },
      });
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
        <div className="eyebrow">Support</div>
        <h1>Got it</h1>
        <p className="subtle">
          Thanks — your message has been sent to the support team. They'll reach out at{" "}
          {email ? <strong>{email}</strong> : "the details you gave"} as soon as they can.
        </p>
        <div style={{ height: 20 }} />
        <Link to={user ? "/communities" : "/login"} className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          {user ? "Back to BiCommunity" : "Back to sign in"}
        </Link>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <div className="eyebrow">Support</div>
      <h1>Contact support</h1>
      <p className="subtle">
        Account blocked, can't sign in, or something's not working? Tell us what's going on and the support team will follow up.
      </p>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />
        <label>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your BiCommunity username" />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="So we can reply to you" />
        <label>What's going on?</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the issue — e.g. 'My account got blocked and I'm not sure why' or 'I never received a password reset email'"
          required
          rows={5}
        />
        <button className="btn btn-primary" disabled={busy || !message.trim()} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Send to support"}
        </button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        <Link to="/login" style={{ textDecoration: "underline" }}>Back to sign in</Link>
      </p>
    </div>
  );
}
