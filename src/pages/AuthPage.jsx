import { useState } from "react";
import { BookOpen, KeyRound } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const defaultForm = {
  password: "",
};

export default function AuthPage() {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const unlockApp = useAppStore((state) => state.unlockApp);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!form.password.trim()) {
        throw new Error("Password is required.");
      }

      unlockApp(form);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
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
            This is now a single-owner app lock. Enter your password once on a device
            and it will stay remembered until you log out.
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
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--muted)]">
            Private access
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Unlock your flashcards</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use your owner password to open the app on this device.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
              disabled={isSubmitting}
              className="w-full rounded-full bg-[var(--secondary)] px-5 py-4 text-base font-semibold text-white"
            >
              {isSubmitting ? "Unlocking..." : "Unlock app"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
