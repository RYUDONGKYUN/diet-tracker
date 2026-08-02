import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import TabBar from "./components/TabBar";
import TodayPage from "./pages/TodayPage";
import WeightPage from "./pages/WeightPage";
import CalendarPage from "./pages/CalendarPage";
import BodyPhotosPage from "./pages/BodyPhotosPage";
import ExercisePage from "./pages/ExercisePage";
import SettingsPage from "./pages/SettingsPage";

function Shell() {
  const { authenticated, loading, logout } = useAuth();

  if (loading) return null;
  if (!authenticated) return <LoginPage />;

  return (
    <div className="app-shell">
      <header className="navbar">
        <h1>체지방 감량 트래커</h1>
        <button onClick={() => logout()}>로그아웃</button>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/weight" element={<WeightPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/photos" element={<BodyPhotosPage />} />
          <Route path="/exercise" element={<ExercisePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
