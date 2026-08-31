import { Routes, Route, useLocation } from "react-router-dom";
import Topbar from "./components/Topbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { ShareSheetProvider } from "./context/ShareSheetContext.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Communities from "./pages/Communities.jsx";
import CommunityDetail from "./pages/CommunityDetail.jsx";
import Circles from "./pages/Circles.jsx";
import CircleDetail from "./pages/CircleDetail.jsx";
import CircleQA from "./pages/CircleQA.jsx";
import CircleEvents from "./pages/CircleEvents.jsx";
import SupportDashboard from "./pages/SupportDashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import SupportContact from "./pages/SupportContact.jsx";
import CircleQuestionDetail from "./pages/CircleQuestionDetail.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import Verify from "./pages/Verify.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import Settings from "./pages/Settings.jsx";
import SavedPosts from "./pages/SavedPosts.jsx";
import Notifications from "./pages/Notifications.jsx";
import FollowRequests from "./pages/FollowRequests.jsx";
import Messages from "./pages/Messages.jsx";
import MessageThread from "./pages/MessageThread.jsx";

function Routing() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/support-contact" element={<SupportContact />} />
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
        path="/circles"
        element={
          <RequireAuth>
            <Circles />
          </RequireAuth>
        }
      />
      <Route
        path="/circles/:id"
        element={
          <RequireAuth>
            <CircleDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/circles/:id/chat"
        element={
          <RequireAuth>
            <Chat kind="circle" />
          </RequireAuth>
        }
      />
      <Route
        path="/circles/:id/qa"
        element={
          <RequireAuth>
            <CircleQA />
          </RequireAuth>
        }
      />
      <Route
        path="/circles/:id/qa/:qid"
        element={
          <RequireAuth>
            <CircleQuestionDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/circles/:id/events"
        element={
          <RequireAuth>
            <CircleEvents />
          </RequireAuth>
        }
      />
      <Route
        path="/support"
        element={
          <RequireAuth>
            <SupportDashboard />
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
        path="/profile/:id"
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
      <Route
        path="/search"
        element={
          <RequireAuth>
            <SearchResults />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />
      <Route
        path="/saved"
        element={
          <RequireAuth>
            <SavedPosts />
          </RequireAuth>
        }
      />
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        }
      />
      <Route
        path="/follow-requests"
        element={
          <RequireAuth>
            <FollowRequests />
          </RequireAuth>
        }
      />
      <Route
        path="/messages"
        element={
          <RequireAuth>
            <Messages />
          </RequireAuth>
        }
      />
      <Route
        path="/messages/:userId"
        element={
          <RequireAuth>
            <MessageThread />
          </RequireAuth>
        }
      />
      <Route path="*" element={<div className="empty-state">Page not found.</div>} />
    </Routes>
  );
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    return (
      <ShareSheetProvider>
        <div className="app-shell app-layout">
          <Sidebar />
          <div className="content-area page-transition" key={location.pathname}>
            <ErrorBoundary resetKey={location.pathname}>
              <Routing />
            </ErrorBoundary>
          </div>
          <MobileNav />
        </div>
      </ShareSheetProvider>
    );
  }

  return (
    <div className="app-shell guest-shell">
      <Topbar />
      <div className="guest-main">
        <ErrorBoundary resetKey={location.pathname}>
          <Routing />
        </ErrorBoundary>
      </div>
      <div className="page-foot">BiCommunity — a product by Bharat Intelligent · built on Django + React</div>
    </div>
  );
}
