import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import SetEditorPage from "./pages/SetEditorPage";
import StudyPage from "./pages/StudyPage";
import NotFoundPage from "./pages/NotFoundPage";
import AppLayout from "./components/AppLayout";
import { useAppStore } from "./store/useAppStore";

function ProtectedRoute({ children }) {
  const currentUserId = useAppStore((state) => state.currentUserId);
  return currentUserId ? children : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }) {
  const currentUserId = useAppStore((state) => state.currentUserId);
  return currentUserId ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sets/new" element={<SetEditorPage />} />
        <Route path="sets/:setId/edit" element={<SetEditorPage />} />
        <Route path="sets/:setId/study" element={<StudyPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
