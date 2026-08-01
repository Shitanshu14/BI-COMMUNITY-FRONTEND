import { Routes, Route } from "react-router-dom";
import Topbar from "./components/Topbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Communities from "./pages/Communities.jsx";
import CommunityDetail from "./pages/CommunityDetail.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import Verify from "./pages/Verify.jsx";

function Routing() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/communities"
        element={
          <RequireAuth>
            <Communities />
          </RequireAuth>
        }
      />
      <Route
        path="/communities/:id"
        element={
          <RequireAuth>
            <CommunityDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/posts/:id"
        element={
          <RequireAuth>
            <PostDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <RequireAuth>
            <Chat />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/verify"
        element={
          <RequireAuth>
            <Verify />
          </RequireAuth>
        }
      />
      <Route path="*" element={<div className="empty-state">Page not found.</div>} />
    </Routes>
  );
}

export default function App() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="app-shell app-layout">
        <Sidebar />
        <div className="content-area">
          <Routing />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell guest-shell">
      <Topbar />
      <div className="guest-main">
        <Routing />
      </div>
      <div className="page-foot">SETU — Bharat Intelligent Community · built on Django + React</div>
    </div>
  );
}
