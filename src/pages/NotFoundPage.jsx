import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel max-w-md rounded-3xl p-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-[var(--muted)]">
          The study session wandered off. Let&apos;s head back home.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-[var(--primary)] px-5 py-3 font-medium text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
