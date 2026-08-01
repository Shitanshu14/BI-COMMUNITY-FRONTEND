import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="hero-wrap">
      <div className="eyebrow">Bharat Intelligent Community</div>
      <h1>A home for every student, educator and builder.</h1>
      <p className="subtle" style={{ fontSize: 15.5, margin: "14px 0 26px" }}>
        SETU is where communities ask questions, share knowledge, ship projects and earn verified
        badges that actually mean something.
      </p>
      <button
        className="btn btn-primary"
        style={{ padding: "12px 26px", fontSize: 14.5 }}
        onClick={() => navigate(user ? "/communities" : "/register")}
      >
        {user ? "Go to communities" : "Get started"}
      </button>
    </div>
  );
}
