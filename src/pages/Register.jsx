import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner, ErrorBox } from "../lib/helpers.jsx";

// Keep these in lockstep with users/models.py (NAME_MAX_LENGTH,
// USERNAME_MAX_LENGTH) and the regexes in users/serializers.py — this is
// just the client-side mirror so people get instant feedback instead of
// waiting on a round trip to hit the same rule on the backend.
const NAME_MAX = 16;
const USERNAME_MAX = 16;
const NAME_RE = /^[A-Za-z ]{1,16}$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,16}$/;
const MIN_JOIN_AGE = 18;

function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/communities";
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    headline: "",
    dateOfBirth: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    if (!NAME_RE.test(form.firstName)) {
      return "First name: up to 16 letters only, no numbers or symbols.";
    }
    if (!NAME_RE.test(form.lastName)) {
      return "Last name: up to 16 letters only, no numbers or symbols.";
    }
    if (!USERNAME_RE.test(form.username)) {
      return 'Username: 3-16 characters — letters, numbers, "." "_" "-" only.';
    }
    if (!form.dateOfBirth) {
      return "Date of birth is required.";
    }
    const age = calcAge(form.dateOfBirth);
    if (age === null || age < 0) {
      return "Please enter a valid date of birth.";
    }
    if (age < MIN_JOIN_AGE) {
      return `You must be ${MIN_JOIN_AGE}+ to create an account on BiCommunity.`;
    }
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const clientErr = validate();
    if (clientErr) {
      setErr(clientErr);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await register({
        first_name: form.firstName,
        last_name: form.lastName,
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        headline: form.headline,
        date_of_birth: form.dateOfBirth,
      });
      navigate(safeNext);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  // 18 years ago, used as the max selectable date so the native date
  // picker itself nudges people away from an under-18 DOB before they
  // even hit submit.
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - MIN_JOIN_AGE);
  const maxDobStr = maxDob.toISOString().slice(0, 10);

  return (
    <div className="form-wrap">
      <div className="eyebrow">Join BiCommunity</div>
      <h1>Create your account</h1>
      <div style={{ height: 20 }} />
      <form onSubmit={submit} className="card">
        <ErrorBox message={err} />

        <div className="field-row">
          <div>
            <label>First name <span className="char-count">{form.firstName.length}/{NAME_MAX}</span></label>
            <input
              type="text"
              value={form.firstName}
              maxLength={NAME_MAX}
              onChange={(e) => setForm({ ...form, firstName: e.target.value.slice(0, NAME_MAX) })}
              required
            />
          </div>
          <div>
            <label>Last name <span className="char-count">{form.lastName.length}/{NAME_MAX}</span></label>
            <input
              type="text"
              value={form.lastName}
              maxLength={NAME_MAX}
              onChange={(e) => setForm({ ...form, lastName: e.target.value.slice(0, NAME_MAX) })}
              required
            />
          </div>
        </div>

        <label>Username <span className="char-count">{form.username.length}/{USERNAME_MAX}</span></label>
        <input
          type="text"
          placeholder="letters, numbers, . _ -"
          value={form.username}
          maxLength={USERNAME_MAX}
          onChange={(e) => setForm({ ...form, username: e.target.value.slice(0, USERNAME_MAX) })}
          required
          minLength={3}
        />

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

        <label>Date of birth</label>
        <input
          type="date"
          value={form.dateOfBirth}
          max={maxDobStr}
          onChange={set("dateOfBirth")}
          required
        />
        <p className="subtle" style={{ marginTop: -8, marginBottom: 14 }}>
          You must be {MIN_JOIN_AGE}+ to join BiCommunity and its communities.
        </p>

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
