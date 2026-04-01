import { useDeferredValue, useMemo, useState } from "react";
import { Search, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FolderSidebar from "../components/FolderSidebar";
import SetCard from "../components/SetCard";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { useAppStore } from "../store/useAppStore";
import { sortByRecentStudy, sortByUpdatedAt } from "../utils/helpers";

function completionForSet(setItem, progress) {
  if (!setItem.cards.length) {
    return 0;
  }
  return (progress.completedCardIds.length / setItem.cards.length) * 100;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUserId = useAppStore((state) => state.currentUserId);
  const users = useAppStore((state) => state.users);
  const allFolders = useAppStore((state) => state.folders);
  const allSets = useAppStore((state) => state.sets);
  const progressByUser = useAppStore((state) => state.progressByUser);
  const duplicateSet = useAppStore((state) => state.duplicateSet);
  const deleteSet = useAppStore((state) => state.deleteSet);
  const resetSetProgress = useAppStore((state) => state.resetSetProgress);
  const resetAllProgress = useAppStore((state) => state.resetAllProgress);
  const createFolder = useAppStore((state) => state.createFolder);
  const deleteFolder = useAppStore((state) => state.deleteFolder);
  const setDailyGoal = useAppStore((state) => state.setDailyGoal);

  const folders = useMemo(
    () =>
      sortByUpdatedAt(
        allFolders.filter((folder) => folder.userId === currentUserId),
      ),
    [allFolders, currentUserId],
  );
  const sets = useMemo(
    () => sortByRecentStudy(allSets.filter((setItem) => setItem.userId === currentUserId)),
    [allSets, currentUserId],
  );
  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [currentUserId, users],
  );
  const userProgress = progressByUser[currentUserId] ?? { setProgress: {}, dailyGoal: 20 };
  const dailyGoal = userProgress.dailyGoal ?? 20;

  const [activeFolderId, setActiveFolderId] = useState("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");

  const filteredSets = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    return sets.filter((item) => {
      const matchesFolder =
        activeFolderId === "all"
          ? true
          : activeFolderId === "ungrouped"
            ? !item.folderId
            : item.folderId === activeFolderId;

      const haystack = [
        item.title,
        item.description,
        item.tags.join(" "),
        item.cards.map((card) => `${card.front} ${card.back}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesFolder && (!search || haystack.includes(search));
    });
  }, [activeFolderId, deferredQuery, sets]);

  const completedToday = useMemo(
    () =>
      sets.reduce((total, setItem) => {
        const progress = userProgress.setProgress[setItem.id] ?? {
          stats: { totalKnown: 0 },
        };
        return total + (progress.stats.totalKnown ?? 0);
      }, 0),
    [sets, userProgress.setProgress],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <FolderSidebar
        folders={folders}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolderId}
        onCreateFolder={() => setFolderModalOpen(true)}
        onDeleteFolder={(folder) => {
          if (
            window.confirm(
              `Delete folder "${folder.name}"? Sets inside it will stay saved and become ungrouped.`,
            )
          ) {
            deleteFolder(folder.id);
            if (activeFolderId === folder.id) {
              setActiveFolderId("all");
            }
          }
        }}
      />

      <section className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel rounded-[2rem] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Dashboard
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Welcome back, {currentUser?.name}
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--muted)]">
              Your sets autosave locally, adaptive learn sessions can be resumed,
              and reset tools only clear progress, never your content.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/sets/new")}
                className="rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
              >
                Create a set
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Reset all saved progress for every set?")) {
                    resetAllProgress();
                  }
                }}
                className="rounded-full border border-[var(--border)] px-5 py-3 font-medium"
              >
                Reset all progress
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Target size={18} />
              Daily goal
            </div>
            <p className="mt-3 text-4xl font-semibold">{completedToday}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Known answers recorded across all learn sessions
            </p>
            <label className="mt-5 block">
              <span className="text-sm font-medium">Goal target</span>
              <input
                type="number"
                min="1"
                value={dailyGoal}
                onChange={(event) => setDailyGoal(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
              />
            </label>
            <div className="mt-4 h-3 rounded-full bg-slate-200/40 dark:bg-slate-800/60">
              <div
                className="h-3 rounded-full bg-[var(--success)]"
                style={{ width: `${Math.min((completedToday / dailyGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Your flashcard sets</h3>
              <p className="mt-2 text-[var(--muted)]">
                Search cards, filter by folder, duplicate decks, and jump back
                into any study session.
              </p>
            </div>
            <label className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-slate-950/30">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, tags, or card content"
                className="min-w-[16rem] bg-transparent outline-none"
              />
            </label>
          </div>

          <div className="mt-5 space-y-4">
            {filteredSets.length ? (
              filteredSets.map((setItem) => {
                const progress = userProgress.setProgress[setItem.id] ?? {
                  completedCardIds: [],
                  stats: {
                    totalKnown: 0,
                    totalUnknown: 0,
                  },
                };
                const folder = folders.find((item) => item.id === setItem.folderId);

                return (
                  <SetCard
                    key={setItem.id}
                    setItem={setItem}
                    folderName={folder?.name}
                    completion={completionForSet(setItem, progress)}
                    stats={progress.stats}
                    onDuplicate={() => duplicateSet(setItem.id)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${setItem.title}"?`)) {
                        deleteSet(setItem.id);
                      }
                    }}
                    onReset={() => {
                      if (window.confirm(`Reset progress for "${setItem.title}"?`)) {
                        resetSetProgress(setItem.id);
                      }
                    }}
                  />
                );
              })
            ) : (
              <EmptyState
                title="No sets match this view"
                description="Try a different search, switch folders, or create a new study set."
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/sets/new")}
                    className="rounded-full bg-[var(--primary)] px-5 py-3 font-semibold text-white"
                  >
                    Create your first set
                  </button>
                }
              />
            )}
          </div>
        </div>
      </section>

      <Modal
        open={folderModalOpen}
        title="Create folder"
        description="Organize related sets without affecting progress."
        onClose={() => setFolderModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Folder name</span>
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={folderDescription}
              onChange={(event) => setFolderDescription(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!folderName.trim()) {
                return;
              }
              createFolder({ name: folderName, description: folderDescription });
              setFolderName("");
              setFolderDescription("");
              setFolderModalOpen(false);
            }}
            className="rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
          >
            Save folder
          </button>
        </div>
      </Modal>
    </div>
  );
}
