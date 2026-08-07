import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="hero-wrap">
      <div className="eyebrow">BiCommunity · a product by Bharat Intelligent</div>
      <h1>A home for every student, educator and builder.</h1>
      <p className="subtle" style={{ fontSize: 15.5, margin: "14px 0 26px" }}>
        BiCommunity is where communities ask questions, share knowledge, ship projects and earn
        verified badges that actually mean something.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          style={{ padding: "12px 26px", fontSize: 14.5 }}
          onClick={() => navigate(user ? "/communities" : "/register")}
        >
          {user ? "Go to communities" : "Get started"}
        </button>
        <button
          className="btn btn-ghost"
          style={{
            padding: "12px 26px",
            fontSize: 14.5,
            border: "1px solid var(--primary)",
            color: "var(--primary)",
          }}
          onClick={() => navigate("/download")}
        >
          Download for Android
        </button>
      </div>
    </div>
  );
}
