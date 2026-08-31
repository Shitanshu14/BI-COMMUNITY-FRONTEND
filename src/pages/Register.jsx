import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner, ErrorBox, Avatar } from "../lib/helpers.jsx";

const NAME_MAX = 16;
const USERNAME_MAX = 16;
const NAME_RE = /^[A-Za-z ]{1,16}$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,16}$/;

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

const Stepper = ({ currentStep }) => {
  const steps = ["Account", "Profile", "Security"];
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px", marginBottom: 8 }}>
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", flex: idx < 2 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: isCompleted ? "var(--verified)" : (isActive ? "var(--primary)" : "var(--border-soft)"),
                  color: isCompleted || isActive ? "#fff" : "var(--ink-faint)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontWeight: 600,
                  fontSize: 13,
                  border: isActive ? "2px solid var(--primary-ink)" : "2px solid transparent",
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? "0 0 10px rgba(91, 127, 255, 0.4)" : "none"
                }}>
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span style={{
                  position: "absolute",
                  top: 34,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--primary-ink)" : "var(--ink-faint)",
                  whiteSpace: "nowrap"
                }}>
                  {label}
                </span>
              </div>
              {idx < 2 && (
                <div style={{
                  height: 2,
                  flex: 1,
                  backgroundColor: isCompleted ? "var(--verified)" : "var(--border-soft)",
                  margin: "0 12px",
                  marginTop: -16,
                  transition: "all 0.3s ease"
                }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/communities";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    headline: "",
    dateOfBirth: "",
    bio: "",
    description: "",
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!NAME_RE.test(form.firstName)) {
      return "First name: up to 16 letters only, no numbers or symbols.";
    }
    if (!form.lastName.trim()) return "Last name is required.";
    if (!NAME_RE.test(form.lastName)) {
      return "Last name: up to 16 letters only, no numbers or symbols.";
    }
    if (!form.username.trim()) return "Username is required.";
    if (!USERNAME_RE.test(form.username)) {
      return 'Username: 3-16 characters — letters, numbers, "." "_" "-" only.';
    }
    if (!form.email.trim()) return "Email is required.";
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const validateStep2 = () => {
    if (!form.dateOfBirth) {
      return "Date of birth is required.";
    }
    const age = calcAge(form.dateOfBirth);
    if (age === null || age < 0) {
      return "Please enter a valid date of birth.";
    }
    if (form.role === "student") {
      if (age >= 18) {
        return "Student role age must be strictly under 18.";
      }
    } else {
      if (age < 18) {
        return "Non-students (Professionals, Educators, Organisations) must be 18 years or older.";
      }
    }
    return "";
  };

  const validateStep3 = () => {
    if (!form.password) {
      return "Password is required.";
    }
    if (form.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[^a-zA-Z0-9]/.test(form.password)) {
      return "Password must contain at least one symbol (e.g. !, @, #, etc.).";
    }
    const uniqueChars = new Set(form.password);
    if (uniqueChars.size < 5) {
      return "Password must contain at least 5 unique characters.";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      const stepErr = validateStep1();
      if (stepErr) {
        setErr(stepErr);
        return;
      }
      setErr("");
      setStep(2);
    } else if (step === 2) {
      const stepErr = validateStep2();
      if (stepErr) {
        setErr(stepErr);
        return;
      }
      setErr("");
      setStep(3);
    }
  };

  const prevStep = () => {
    setErr("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const submit = async (e) => {
    e.preventDefault();
    const stepErr = validateStep3();
    if (stepErr) {
      setErr(stepErr);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("first_name", form.firstName);
      fd.append("last_name", form.lastName);
      fd.append("username", form.username);
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("role", form.role);
      fd.append("headline", form.headline);
      fd.append("date_of_birth", form.dateOfBirth);
      fd.append("bio", form.bio);
      fd.append("description", form.description);
      if (avatarFile) {
        fd.append("avatar", avatarFile);
      }

      await register(fd);
      navigate(safeNext);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const hasLength = form.password.length >= 8;
  const hasSymbol = /[^a-zA-Z0-9]/.test(form.password);
  const hasUnique = new Set(form.password).size >= 5;
  const matches = form.password && form.password === form.confirmPassword;

  return (
    <div className="form-wrap">
      <div className="eyebrow">Join BiCommunity</div>
      <h1>Create your account</h1>
      <div style={{ height: 20 }} />
      <div className="card">
        <Stepper currentStep={step} />
        <ErrorBox message={err} />

        {step === 1 && (
          <form onSubmit={nextStep}>
            <div className="field-row">
              <div>
                <label>First name <span className="char-count">{form.firstName.length}/{NAME_MAX}</span></label>
                <input
                  type="text"
                  value={form.firstName}
                  maxLength={NAME_MAX}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value.replace(/[^A-Za-z ]/g, "").slice(0, NAME_MAX) })}
                  required
                />
              </div>
              <div>
                <label>Last name <span className="char-count">{form.lastName.length}/{NAME_MAX}</span></label>
                <input
                  type="text"
                  value={form.lastName}
                  maxLength={NAME_MAX}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value.replace(/[^A-Za-z ]/g, "").slice(0, NAME_MAX) })}
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

            <label>You are a</label>
            <select value={form.role} onChange={set("role")} style={{ marginBottom: 20 }}>
              <option value="student">Student</option>
              <option value="professional">Professional</option>
              <option value="educator">Educator</option>
              <option value="organisation">Organisation</option>
            </select>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Next Step
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={nextStep}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--ink-soft)" }}>Profile Picture</label>
              <div style={{ position: "relative", cursor: "pointer" }}>
                <label htmlFor="avatar-upload" style={{ cursor: "pointer" }}>
                  <Avatar
                    name={form.firstName || form.username || "Avatar"}
                    src={avatarPreview}
                    size={96}
                  />
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: "var(--primary)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    border: "2px solid var(--surface)",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </div>
              {avatarFile && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ marginTop: 8, padding: "2px 8px", fontSize: 11, background: "var(--danger-soft)", color: "var(--danger)" }}
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>

            <label>Date of birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={set("dateOfBirth")}
              required
              style={{ marginBottom: 4 }}
            />
            <p className="subtle" style={{ marginTop: 0, marginBottom: 16, fontSize: 12, color: form.role === "student" ? "var(--primary-ink)" : "var(--ink-soft)" }}>
              {form.role === "student"
                ? "✓ Age Restriction: Student role age must be strictly under 18."
                : "✓ Age Restriction: Non-student roles must be 18 years or older."
              }
            </p>

            <label>Headline</label>
            <input
              type="text"
              placeholder="e.g. Class 12 Student or Senior Engineer"
              value={form.headline}
              onChange={set("headline")}
              style={{ marginBottom: 12 }}
            />

            <label>Bio (Short description)</label>
            <textarea
              placeholder="Tell others about yourself..."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 280) })}
              style={{ width: "100%", height: 60, minHeight: 60, resize: "vertical", marginBottom: 12, padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}
            />

            <label>Detailed Description</label>
            <textarea
              placeholder="Add more details about your achievements or background..."
              value={form.description}
              onChange={set("description")}
              style={{ width: "100%", height: 100, minHeight: 80, resize: "vertical", marginBottom: 20, padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={prevStep} className="btn" style={{ flex: 1, backgroundColor: "transparent", border: "1px solid var(--border)", color: "var(--ink-soft)" }}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Next Step
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={submit}>
            <label>Password</label>
            <input type="password" value={form.password} onChange={set("password")} required style={{ marginBottom: 12 }} />

            <label>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required style={{ marginBottom: 16 }} />

            <div style={{ marginBottom: 20, padding: 14, backgroundColor: "var(--surface-soft)", border: "1px solid var(--border-soft)", borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--ink-soft)" }}>Password Requirements:</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: hasLength ? "var(--verified)" : "var(--ink-faint)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{hasLength ? "✓" : "○"}</span> At least 8 characters
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: hasSymbol ? "var(--verified)" : "var(--ink-faint)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{hasSymbol ? "✓" : "○"}</span> Contains at least one symbol (!, @, #, etc.)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: hasUnique ? "var(--verified)" : "var(--ink-faint)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{hasUnique ? "✓" : "○"}</span> Contains at least 5 unique characters
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: matches ? "var(--verified)" : "var(--ink-faint)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{matches ? "✓" : "○"}</span> Passwords match
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={prevStep} className="btn" style={{ flex: 1, backgroundColor: "transparent", border: "1px solid var(--border)", color: "var(--ink-soft)" }} disabled={busy}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
                {busy ? <Spinner /> : "Create account"}
              </button>
            </div>
          </form>
        )}
      </div>
      <p className="subtle" style={{ marginTop: 16 }}>
        Already registered? <Link to={"/login" + (next ? "?next=" + encodeURIComponent(next) : "")} style={{ textDecoration: "underline" }}>Sign in</Link>
      </p>
    </div>
  );
}
