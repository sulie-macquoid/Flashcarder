import { formatPercentage } from "../utils/helpers";

export default function ProgressBar({ value, label }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-medium">{formatPercentage(value)}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-200/40 dark:bg-slate-800/60">
        <div
          className="h-3 rounded-full bg-[var(--secondary)] transition-all"
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  );
}
