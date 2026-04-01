import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import SetEditorPage from "./pages/SetEditorPage";
import StudyPage from "./pages/StudyPage";
import NotFoundPage from "./pages/NotFoundPage";
import AppLayout from "./components/AppLayout";
import StudyErrorBoundary from "./components/StudyErrorBoundary";
import { useAppStore } from "./store/useAppStore";

function AppBootstrap() {
  const currentUserId = useAppStore((state) => state.currentUserId);
  const restoreOwnerState = useAppStore((state) => state.restoreOwnerState);

  useEffect(() => {
    if (currentUserId) {
      restoreOwnerState();
    }
  }, [currentUserId, restoreOwnerState]);

  return null;
}

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
    <>
      <AppBootstrap />
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
          <Route
            path="sets/:setId/study"
            element={
              <StudyErrorBoundary>
                <StudyPage />
              </StudyErrorBoundary>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
