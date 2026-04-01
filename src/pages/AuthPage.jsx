import { useState } from "react";
import { BookOpen, KeyRound, UserRound } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const defaultForm = {
  name: "",
  email: "",
  password: "",
};

export default function AuthPage() {
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const signUp = useAppStore((state) => state.signUp);
  const logIn = useAppStore((state) => state.logIn);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      if (!form.email.trim() || !form.password.trim()) {
        throw new Error("Email and password are required.");
      }

      if (mode === "signup") {
        if (!form.name.trim()) {
          throw new Error("Name is required to create an account.");
        }
        signUp(form);
      } else {
        logIn(form);
      }
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel rounded-[2.5rem] p-8 sm:p-10">
          <div className="inline-flex rounded-3xl bg-[var(--primary)] p-4 text-white">
            <BookOpen size={30} />
          </div>
          <p className="mt-6 text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
            Sullys Grand Flashcards
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
            A focused flashcard workspace built for fast, repeatable learning.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
            Create folders, organize sets, study with classic flashcards, and run
            adaptive learn sessions where missed cards resurface a few turns later.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-[var(--muted)]">
            Your account now syncs through the deployed app, so logging in on your
            phone or laptop should bring the same flashcards and progress with you.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              "Resume sessions exactly where you stopped",
              "Import and export CSV or JSON sets",
              "Reset progress without deleting your content",
            ].map((item) => (
              <div key={item} className="soft-panel rounded-[1.75rem] p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[2.5rem] p-8 sm:p-10">
          <div className="flex gap-2 rounded-full bg-slate-200/40 p-1 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-medium ${
                mode === "signup" ? "bg-[var(--primary)] text-white" : ""
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-medium ${
                mode === "login" ? "bg-[var(--primary)] text-white" : ""
              }`}
            >
              Log in
            </button>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <UserRound size={16} />
                  Name
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                  placeholder="Avery"
                />
              </label>
            ) : null}
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                placeholder="you@example.com"
              />
            </label>
            <label className="block space-y-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <KeyRound size={16} />
                Password
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                placeholder="At least something memorable"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--secondary)] px-5 py-4 text-base font-semibold text-white"
            >
              {mode === "signup" ? "Create local account" : "Log in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
