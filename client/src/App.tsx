import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Shell } from "./components/Shell";
import { useAuth } from "./context/AuthContext";
import { Alerts } from "./pages/Alerts";
import { Compose } from "./pages/Compose";
import { Discover } from "./pages/Discover";
import { EditProfile } from "./pages/EditProfile";
import { Inbox } from "./pages/Inbox";
import { Join } from "./pages/Join";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { People } from "./pages/People";
import { PostPage } from "./pages/PostPage";
import { Profile } from "./pages/Profile";
import { Saved } from "./pages/Saved";
import { Search } from "./pages/Search";
import { Friends } from "./pages/Friends";
import { Privacy } from "./pages/Privacy";
import { Settings } from "./pages/Settings";
import { Forgot } from "./pages/Forgot";
import { Reset } from "./pages/Reset";
import { Terms } from "./pages/Terms";
import { VerifyEmail } from "./pages/VerifyEmail";
import { safeNext } from "./lib/next";

function Guard() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="status-line">loading…</div>;
  if (!user) {
    if (loc.pathname === "/") return <Landing />;
    const next = `${loc.pathname}${loc.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(safeNext(next))}`} replace />;
  }
  return <Shell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route element={<Guard />}>
        <Route path="/" element={<Discover />} />
        <Route path="/search" element={<Search />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/inbox/:id" element={<Inbox />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/new" element={<Compose />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/profile" element={<EditProfile />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/:username/followers" element={<People kind="followers" />} />
        <Route path="/:username/following" element={<People kind="following" />} />
        <Route path="/:username" element={<Profile />} />
      </Route>
    </Routes>
  );
}
