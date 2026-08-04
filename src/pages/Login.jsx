import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Set by RequireAuth when someone hits a share link (e.g. /posts/<id>)
  // while signed out — send them straight back there after login instead
  // of dumping them on the generic communities page.
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/communities";

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(safeNext);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-wrap">
      <div className="eyebrow">Welcome back</div>
      <h1>Sign in</h1>
      <p className="subtle">
        {next ? "Sign in to view that post." : "Sign in to continue to your communities."}
      </p>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Sign in"}
        </button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        New here? <Link to={"/register" + (next ? "?next=" + encodeURIComponent(next) : "")} style={{ textDecoration: "underline" }}>Create an account</Link>
      </p>
    </div>
  );
}
