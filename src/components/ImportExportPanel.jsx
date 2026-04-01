import { useState } from "react";
import { Download, Link2, LoaderCircle, Upload } from "lucide-react";
import {
  exportCardsToCsv,
  exportCardsToJson,
  parseCsvCards,
  parseJsonCards,
} from "../utils/importExport";
import { importCardsFromQuizlet, validateQuizletUrl } from "../services/quizletImport";

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ImportExportPanel({
  cards,
  onImport,
  enableUrlImport = false,
  onImportedTitle,
}) {
  const [format, setFormat] = useState("csv");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [quizletUrl, setQuizletUrl] = useState("");
  const [quizletError, setQuizletError] = useState("");
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [quizletPreview, setQuizletPreview] = useState(null);

  function handleImport() {
    try {
      const imported =
        format === "csv" ? parseCsvCards(draft) : parseJsonCards(draft);
      onImport(imported);
      setDraft("");
      setError("");
    } catch (importError) {
      setError(importError.message);
    }
  }

  async function handleQuizletImport() {
    setQuizletError("");
    setQuizletPreview(null);

    if (!validateQuizletUrl(quizletUrl)) {
      setQuizletError("Paste a full public Quizlet set URL first.");
      return;
    }

    setIsImportingUrl(true);
    try {
      const result = await importCardsFromQuizlet(quizletUrl);
      if (!result.cards.length) {
        throw new Error("Import failed. Try copy-paste or CSV instead.");
      }
      setQuizletPreview(result);
    } catch (importError) {
      setQuizletError(
        importError.message || "Import failed. Try copy-paste or CSV instead.",
      );
    } finally {
      setIsImportingUrl(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="soft-panel rounded-[1.75rem] p-5">
        <div className="flex items-center gap-2">
          <Upload size={18} />
          <h3 className="text-lg font-semibold">Import cards</h3>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setFormat("csv")}
            className={`rounded-full px-4 py-2 text-sm ${
              format === "csv" ? "bg-[var(--primary)] text-white" : "soft-panel"
            }`}
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => setFormat("json")}
            className={`rounded-full px-4 py-2 text-sm ${
              format === "json" ? "bg-[var(--primary)] text-white" : "soft-panel"
            }`}
          >
            JSON
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={12}
          className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
          placeholder={
            format === "csv"
              ? "front,back\nterm,definition"
              : '[{ "front": "term", "back": "definition" }]'
          }
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={handleImport}
          className="mt-4 rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
        >
          Import into editor
        </button>

        {enableUrlImport ? (
          <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Import from Quizlet URL</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Pull terms into a preview before replacing the editor cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUrlOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
              >
                <Link2 size={16} />
                Import from URL
              </button>
            </div>

            {urlOpen ? (
              <div className="mt-4 space-y-4">
                <input
                  type="url"
                  value={quizletUrl}
                  onChange={(event) => setQuizletUrl(event.target.value)}
                  placeholder="https://quizlet.com/123456789/..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                />
                {quizletError ? (
                  <p className="text-sm text-red-600">
                    {quizletError} Try copy-paste or CSV instead.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleQuizletImport}
                  disabled={isImportingUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {isImportingUrl ? <LoaderCircle className="animate-spin" size={16} /> : <Link2 size={16} />}
                  {isImportingUrl ? "Fetching Quizlet set..." : "Fetch preview"}
                </button>
              </div>
            ) : null}

            {quizletPreview ? (
              <div className="mt-5 rounded-[1.25rem] bg-slate-100/60 p-4 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--muted)]">Preview ready</p>
                    <h4 className="mt-1 text-lg font-semibold">
                      {quizletPreview.title || "Imported Quizlet set"}
                    </h4>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {quizletPreview.cards.length} cards ready to load into the editor
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onImport(quizletPreview.cards);
                      if (quizletPreview.title) {
                        onImportedTitle?.(quizletPreview.title);
                      }
                      setQuizletPreview(null);
                    }}
                    className="rounded-full bg-[var(--secondary)] px-4 py-3 font-semibold text-white"
                  >
                    Use imported cards
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {quizletPreview.cards.slice(0, 6).map((card) => (
                    <div
                      key={card.id}
                      className="grid gap-2 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm dark:bg-slate-950/30"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Front
                        </p>
                        <p className="mt-1 font-medium">{card.front}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Back
                        </p>
                        <p className="mt-1">{card.back}</p>
                      </div>
                    </div>
                  ))}
                  {quizletPreview.cards.length > 6 ? (
                    <p className="text-sm text-[var(--muted)]">
                      Showing the first 6 cards before import.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="soft-panel rounded-[1.75rem] p-5">
        <div className="flex items-center gap-2">
          <Download size={18} />
          <h3 className="text-lg font-semibold">Export current cards</h3>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Download this set in the same formats that the importer accepts.
        </p>
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() =>
              downloadFile(exportCardsToCsv(cards), "flashmind-set.csv", "text/csv")
            }
            className="rounded-full bg-[var(--primary)] px-5 py-3 font-semibold text-white"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                exportCardsToJson(cards),
                "flashmind-set.json",
                "application/json",
              )
            }
            className="rounded-full border border-[var(--border)] px-5 py-3 font-medium"
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
