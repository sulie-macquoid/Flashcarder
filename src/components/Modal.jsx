export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="glass-panel w-full max-w-lg rounded-[2rem] p-6">
        <div className="flex items-start justify-between gap-4">
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
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
