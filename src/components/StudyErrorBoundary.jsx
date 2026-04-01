import React from "react";
import { Link } from "react-router-dom";

function buildErrorCode(error) {
  const source = `${error?.name ?? "Error"}:${error?.message ?? "unknown"}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `STUDY-${hash.toString(16).toUpperCase().padStart(8, "0").slice(0, 8)}`;
}

export default class StudyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCode: null,
      detailsOpen: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorCode: buildErrorCode(error),
    };
  }

  componentDidCatch(error, info) {
    const snapshot = {
      code: buildErrorCode(error),
      message: error?.message ?? "Unknown study error",
      name: error?.name ?? "Error",
      stack: error?.stack ?? "",
      componentStack: info?.componentStack ?? "",
      capturedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("sully-study-last-error", JSON.stringify(snapshot));
    } catch {
      // Best-effort only.
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorCode, detailsOpen } = this.state;

    return (
      <div className="glass-panel rounded-[2rem] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Study Error
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Study mode hit an error</h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          The page was stopped before it could blank completely. If you send me the
          code below, I can trace the exact crash path faster.
        </p>
        <div className="mt-5 rounded-2xl border border-red-300/60 bg-red-50/80 px-4 py-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
          <p className="font-semibold">{errorCode}</p>
          <p className="mt-2 text-sm">{error?.message ?? "Unknown study error."}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
          >
            Reload study page
          </button>
          <Link
            to="/"
            className="rounded-full border border-[var(--border)] px-5 py-3 font-medium"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => this.setState((current) => ({ detailsOpen: !current.detailsOpen }))}
            className="rounded-full border border-[var(--border)] px-5 py-3 font-medium"
          >
            {detailsOpen ? "Hide details" : "Show details"}
          </button>
        </div>
        {detailsOpen ? (
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(
              {
                code: errorCode,
                name: error?.name ?? "Error",
                message: error?.message ?? "Unknown study error.",
                stack: error?.stack ?? "",
              },
              null,
              2,
            )}
          </pre>
        ) : null}
      </div>
    );
  }
}

