import { useMemo } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, FolderOpen, LogOut, Plus, Target } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import ThemeToggle from "./ThemeToggle";

export default function AppLayout() {
  const navigate = useNavigate();
  const currentUserId = useAppStore((state) => state.currentUserId);
  const users = useAppStore((state) => state.users);
  const logOut = useAppStore((state) => state.logOut);
  const notices = useAppStore((state) => state.ui.notices);
  const dismissNotice = useAppStore((state) => state.dismissNotice);
  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [currentUserId, users],
  );

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-panel page-enter mb-5 rounded-[2rem] p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--primary)] p-3 text-white">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                    Sullys Grand Flashcards
                  </p>
                  <h1 className="text-2xl font-semibold">Study with confidence</h1>
                </div>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <NavLink
                to="/"
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium"
              >
                Dashboard
              </NavLink>
              <button
                type="button"
                onClick={() => navigate("/sets/new")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                New set
              </button>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => {
                  logOut();
                  navigate("/auth");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2">
                <Target size={16} />
                {currentUser?.name}&apos;s personal study space
              </span>
              <span className="inline-flex items-center gap-2">
                <FolderOpen size={16} />
                Sets, folders, progress, and resumes all save locally
              </span>
            </div>
            <span>Netlify-ready frontend with optional functions support</span>
          </div>
        </header>

        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="soft-panel flex items-start justify-between gap-4 rounded-2xl px-4 py-3"
            >
              <p className="text-sm">{notice.message}</p>
              <button
                type="button"
                onClick={() => dismissNotice(notice.id)}
                className="text-sm text-[var(--muted)]"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>

        <main className="page-enter mt-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
