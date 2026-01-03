// ================================
// IMPORTS — TOUJOURS EN PREMIER
// ================================
import { Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import ChangePassword from "./pages/ChangePassword";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtpRegister from "./pages/VerifyOtpRegister";
import VerifyOtpReset from "./pages/VerifyOtpReset";
import NewPassword from "./pages/NewPassword";

import AdminDashboard from "./pages/AdminDashboard";

import FacebookLayout from "./pages/FacebookLayout";
import ProfilPage from "./pages/ProfilPage";
import PublicProfile from "./pages/PublicProfile";
import FriendViewer from "./pages/FriendViewer";
import NotifsPage from "./pages/NotifsPage";
import SettingsPage from "./pages/SettingsPage";
import PostPage from "./pages/PostPage";
import ChatPage from "./pages/ChatPage";
import CompleteProfile from "./pages/CompleteProfile";

import Messages from "./pages/Messages.jsx";
import PageCreate from "./pages/PageCreate";
import MyPages from "./pages/MyPages";
import PageProfile from "./pages/PageProfile";
import LikesPage from "./pages/LikesPage";


import FacebookFeed from "./components/FacebookFeed";

import PhotoViewerPage from "./pages/PhotoViewerPage";
import RelationsPage from "./pages/RelationsPage";
import ReelsPage from "./pages/ReelsPage";
import PagesFeed from "./pages/PagesFeed";
import AdsDashboard from "./pages/AdsDashboard";
import AdsDetails from "./pages/AdsDetails";
import AdsCreate from "./pages/AdsCreate";
import AdsPayment from "./pages/AdsPayment";
import AdsLayout from "./pages/AdsLayout";

import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SocketProvider } from "./context/SocketContext";
import { ActiveConversationProvider } from "./context/ActiveConversationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLoadingOverlay from "./components/AppLoadingOverlay";

// ================================
// CODE RUNTIME (APRÈS IMPORTS)
// ================================
window.addEventListener("error", (e) => {
  console.log("🔥 GLOBAL ERROR:", e.message, e.filename, e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.log("🔥 PROMISE ERROR:", e.reason);
});

// ================================
// APP
// ================================
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("🔥 APP ERROR BOUNDARY", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error" style={{ padding: 24 }}>
          <h2>Une erreur est survenue</h2>
          <p>{this.state.error?.message || "Merci de rafraîchir la page."}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <>
      <AppLoadingOverlay />
      <AppErrorBoundary>
        <AuthProvider>
          <SocketProvider>
            <ActiveConversationProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <Routes>
                {/* Landing */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute redirectIfAuth to="/fb">
                      <LandingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Public */}
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-register" element={<VerifyOtpRegister />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot" element={<ForgotPassword />} />
                <Route path="/verify-reset" element={<VerifyOtpReset />} />
                <Route path="/new-password" element={<NewPassword />} />

                {/* Profil Public */}
                <Route path="/profil/:id" element={<PublicProfile />} />
                <Route path="/profil/:id/amis" element={<FriendViewer />} />

                {/* Centre publicitaire indépendant */}
                <Route path="/fb/ads/*" element={<Navigate to="/ads" replace />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AdsLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/ads" element={<Outlet />}>
                    <Route index element={<AdsDashboard />} />
                    <Route path="create" element={<AdsCreate />} />
                    <Route path="pay/:campaignId" element={<AdsPayment />} />
                    <Route path="archives" element={<AdsDashboard view="archives" />} />
                    <Route path=":id" element={<AdsDetails />} />
                  </Route>
                </Route>

                {/* ================= FACEBOOK LAYOUT — GLOBAL WRAPPER ================= */}
                <Route
                  element={
                    <ProtectedRoute>
                      <FacebookLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Groupe /fb avec colonnes latérales sur desktop */}
                  <Route path="/fb" element={<Outlet />}>
                    <Route index element={<FacebookFeed />} />
                    <Route path="post/:id" element={<PostPage />} />
                    <Route path="pages-feed" element={<PagesFeed />} />

                <Route path="dashboard" element={<Navigate to="/fb" replace />} />

                  <Route path="relations" element={<RelationsPage />} />
                  <Route path="notifications" element={<NotifsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Pages compactes mais avec le header présent */}
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/profil" element={<ProfilPage />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<ChatPage />} />
                <Route
                  path="/settings"
                  element={<Navigate to="/fb/settings" replace />}
                />
                <Route path="/pages/create" element={<PageCreate />} />
                <Route path="/pages/me" element={<MyPages />} />
                <Route path="/pages/:slug" element={<PageProfile />} />
                <Route path="/post/:id" element={<PostPage />} />
                <Route path="/likes/:postId" element={<LikesPage />} />
                <Route path="/reels" element={<ReelsPage />} />

                <Route path="/photo/:postId/:index" element={<PhotoViewerPage />} />
                <Route path="/photo/:postId" element={<PhotoViewerPage />} />
              </Route>
            </Routes>
                </BrowserRouter>
              </NotificationProvider>
            </ActiveConversationProvider>
          </SocketProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </>
  );
}
