import { FolderOpen, Plus } from "lucide-react";

export default function FolderSidebar({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
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
          <button
            key={folder.id}
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
              activeFolderId === folder.id
                ? "bg-[var(--primary)] text-white"
                : "soft-panel"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FolderOpen size={16} />
              {folder.name}
            </span>
            <span className="text-xs opacity-75">Folder</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
