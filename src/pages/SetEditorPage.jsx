import { useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CardEditor from "../components/CardEditor";
import EmptyState from "../components/EmptyState";
import ImportExportPanel from "../components/ImportExportPanel";
import { useAppStore } from "../store/useAppStore";
import { generateId, sortByUpdatedAt } from "../utils/helpers";

function createBlankCard() {
  return {
    id: generateId("card"),
    front: "",
    back: "",
    imageUrl: "",
  };
}

export default function SetEditorPage() {
  const navigate = useNavigate();
  const { setId } = useParams();
  const currentUserId = useAppStore((state) => state.currentUserId);
  const allSets = useAppStore((state) => state.sets);
  const allFolders = useAppStore((state) => state.folders);
  const saveSet = useAppStore((state) => state.saveSet);
  const existingSet = useMemo(
    () => (setId ? allSets.find((item) => item.id === setId) ?? null : null),
    [allSets, setId],
  );
  const folders = useMemo(
    () =>
      sortByUpdatedAt(
        allFolders.filter((folder) => folder.userId === currentUserId),
      ),
    [allFolders, currentUserId],
  );

  const [title, setTitle] = useState(existingSet?.title ?? "");
  const [description, setDescription] = useState(existingSet?.description ?? "");
  const [folderId, setFolderId] = useState(existingSet?.folderId ?? "");
  const [tags, setTags] = useState(existingSet?.tags.join(", ") ?? "");
  const [cards, setCards] = useState(
    existingSet?.cards?.length ? existingSet.cards : [createBlankCard(), createBlankCard()],
  );
  const [error, setError] = useState("");

  const hasValidCards = useMemo(
    () => cards.some((card) => card.front.trim() && card.back.trim()),
    [cards],
  );

  function updateCard(cardId, field, value) {
    setCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, [field]: value } : card)),
    );
  }

  function removeCard(cardId) {
    setCards((current) => current.filter((card) => card.id !== cardId));
  }

  function submitSet() {
    try {
      if (!title.trim()) {
        throw new Error("Set title is required.");
      }
      if (!hasValidCards) {
        throw new Error("Add at least one card with both front and back.");
      }

      saveSet({
        id: existingSet?.id,
        createdAt: existingSet?.createdAt,
        title,
        description,
        folderId,
        tags: tags.split(","),
        cards,
      });
      navigate("/");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass-panel flex flex-col gap-4 rounded-[2rem] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <h2 className="mt-3 text-3xl font-semibold">
            {existingSet ? "Edit set" : "Create a new set"}
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Keep cards clean and import-ready. Empty cards are ignored on save.
          </p>
        </div>
        <button
          type="button"
          onClick={submitSet}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--secondary)] px-5 py-4 font-semibold text-white"
        >
          <Save size={18} />
          Save set
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-5">
          <div className="glass-panel rounded-[2rem] p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                  placeholder="Biology chapter 4"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Folder</span>
                <select
                  value={folderId}
                  onChange={(event) => setFolderId(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                placeholder="What this set covers and why it matters"
              />
            </label>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium">Tags</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                placeholder="Exam Prep, Biology, Midterm"
              />
            </label>
          </div>

          {cards.length ? (
            <CardEditor
              cards={cards}
              onChangeCard={updateCard}
              onAddCard={() => setCards((current) => [...current, createBlankCard()])}
              onRemoveCard={removeCard}
            />
          ) : (
            <EmptyState
              title="No cards yet"
              description="Add your first card to start building the set."
              action={
                <button
                  type="button"
                  onClick={() => setCards([createBlankCard()])}
                  className="rounded-full bg-[var(--primary)] px-5 py-3 font-semibold text-white"
                >
                  Add card
                </button>
              }
            />
          )}

          {error ? (
            <div className="soft-panel rounded-2xl p-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="space-y-5">
          <div className="glass-panel rounded-[2rem] p-5">
            <h3 className="text-xl font-semibold">Editing tips</h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li>Each card needs both a front and a back.</li>
              <li>Image URLs are optional and show during study.</li>
              <li>Imports replace the editor list only after validation or preview.</li>
            </ul>
          </div>
          <ImportExportPanel
            cards={cards}
            onImport={setCards}
            enableUrlImport={!existingSet}
            onImportedTitle={(importedTitle) => {
              if (!title.trim()) {
                setTitle(importedTitle);
              }
            }}
          />
        </aside>
      </div>
    </div>
  );
}
