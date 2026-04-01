import { useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  exportCardsToCsv,
  exportCardsToJson,
  parseCsvCards,
  parseJsonCards,
} from "../utils/importExport";

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
}) {
  const [format, setFormat] = useState("csv");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

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
