import { FolderOpen, Plus, Trash2 } from "lucide-react";

export default function FolderSidebar({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}) {
  return (
    <aside className="glass-panel rounded-[2rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Organization
          </p>
          <h2 className="mt-2 text-xl font-semibold">Folders</h2>
        </div>
        <button
          type="button"
          onClick={onCreateFolder}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => onSelectFolder("all")}
          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
            activeFolderId === "all" ? "bg-[var(--primary)] text-white" : "soft-panel"
          }`}
        >
          <span>All sets</span>
          <span className="text-xs opacity-75">Everything</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectFolder("ungrouped")}
          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
            activeFolderId === "ungrouped"
              ? "bg-[var(--primary)] text-white"
              : "soft-panel"
          }`}
        >
          <span>No folder</span>
          <span className="text-xs opacity-75">Loose sets</span>
        </button>

        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${
              activeFolderId === folder.id ? "bg-[var(--primary)] text-white" : "soft-panel"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 px-1 py-1 text-left"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <FolderOpen size={16} />
                <span className="truncate">{folder.name}</span>
              </span>
              <span className="text-xs opacity-75">Folder</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteFolder(folder)}
              className={`rounded-full p-2 ${
                activeFolderId === folder.id ? "hover:bg-white/15" : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              aria-label={`Delete ${folder.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
