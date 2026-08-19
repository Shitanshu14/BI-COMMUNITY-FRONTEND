import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api("/api/users/password/reset/confirm/", {
        method: "POST",
        body: { uid, token, new_password: newPassword },
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="form-wrap">
        <div className="eyebrow">Reset password</div>
        <h1>Link looks broken</h1>
        <p className="subtle">
          This page needs a reset link from your email — open that link again, or request a new one.
        </p>
        <div style={{ height: 20 }} />
        <Link to="/forgot-password" className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="form-wrap">
        <div className="eyebrow">All set</div>
        <h1>Password updated</h1>
        <p className="subtle">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <div className="eyebrow">Reset password</div>
      <h1>Choose a new password</h1>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />
        <label>New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          autoFocus
        />
        <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Update password"}
        </button>
      </form>
    </div>
  );
}
