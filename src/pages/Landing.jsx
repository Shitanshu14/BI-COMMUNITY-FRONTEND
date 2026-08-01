import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="margin-page">
      <div className="eyebrow">Register no. 001 · Bharat Intelligent Community</div>
      <h1 style={{ fontSize: 44, maxWidth: 560 }}>
        A ruled page for every student, educator and builder.
      </h1>
      <p className="subtle" style={{ maxWidth: 480, fontSize: 15.5 }}>
        SETU is where communities keep their roll call — questions answered, resources shared, and
        verified badges that mean something.
      </p>
      <div style={{ height: 22 }} />
      <button
        className="btn btn-accent"
        onClick={() => navigate(user ? "/communities" : "/register")}
      >
        {user ? "Go to communities" : "Get started"}
      </button>
    </div>
  );
}
