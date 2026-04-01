export default function EmptyState({ title, description, action }) {
  return (
    <div className="soft-panel rounded-[2rem] border-dashed p-8 text-center">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
