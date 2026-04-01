import { useEffect } from "react";

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center py-6">
        <div
          className="glass-panel flex max-h-[calc(100vh-3rem)] w-full max-w-lg flex-col rounded-[2rem]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-6">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[var(--muted)]">
            Close
          </button>
          </div>
          <div className="min-h-0 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
