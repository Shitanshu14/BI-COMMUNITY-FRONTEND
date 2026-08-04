import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/communities";
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
    headline: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(form);
      navigate(safeNext);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-wrap">
      <div className="eyebrow">Join BiCommunity</div>
      <h1>Create your account</h1>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />
        <label>Username</label>
        <input type="text" value={form.username} onChange={set("username")} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={set("email")} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={set("password")} required />
        <div className="field-row">
          <div>
            <label>You are a</label>
            <select value={form.role} onChange={set("role")}>
              <option value="student">Student</option>
              <option value="professional">Professional</option>
              <option value="educator">Educator</option>
              <option value="organisation">Organisation</option>
            </select>
          </div>
          <div>
            <label>Headline</label>
            <input
              type="text"
              placeholder="e.g. Class 12 Student"
              value={form.headline}
              onChange={set("headline")}
            />
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? <Spinner /> : "Create account"}
        </button>
      </form>
      <p className="subtle" style={{ marginTop: 16 }}>
        Already registered? <Link to={"/login" + (next ? "?next=" + encodeURIComponent(next) : "")} style={{ textDecoration: "underline" }}>Sign in</Link>
      </p>
    </div>
  );
}
