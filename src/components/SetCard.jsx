import { Copy, Edit3, FolderTree, Play, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";

export default function SetCard({
  setItem,
  folderName,
  completion,
  stats,
  onDuplicate,
  onDelete,
  onReset,
}) {
  return (
    <article className="glass-panel rounded-[2rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {folderName ? <span className="inline-flex items-center gap-1"><FolderTree size={13} /> {folderName}</span> : <span>Ungrouped</span>}
            <span>{setItem.cards.length} cards</span>
          </div>
          <div>
            <h3 className="text-2xl font-semibold">{setItem.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {setItem.description || "No description yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {setItem.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-200/60 px-3 py-1 text-xs dark:bg-slate-800/70">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-[18rem]">
          <Link
            to={`/sets/${setItem.id}/study`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--secondary)] px-4 py-3 font-semibold text-white"
          >
            <Play size={16} />
            Study
          </Link>
          <Link
            to={`/sets/${setItem.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-3 font-medium"
          >
            <Edit3 size={16} />
            Edit
          </Link>
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-3 text-sm"
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-3 text-sm"
          >
            <RotateCcw size={16} />
            Reset progress
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/20 dark:text-red-200 sm:col-span-2"
          >
            <Trash2 size={16} />
            Delete set
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <ProgressBar value={completion} label="Set progress" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="soft-panel rounded-2xl px-4 py-3">
            <p className="text-[var(--muted)]">Known</p>
            <p className="mt-1 text-lg font-semibold">{stats.totalKnown}</p>
          </div>
          <div className="soft-panel rounded-2xl px-4 py-3">
            <p className="text-[var(--muted)]">Needs work</p>
            <p className="mt-1 text-lg font-semibold">{stats.totalUnknown}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
