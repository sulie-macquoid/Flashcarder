import { Image, Trash2 } from "lucide-react";

export default function CardEditor({
  cards,
  onChangeCard,
  onAddCard,
  onRemoveCard,
}) {
  return (
    <div className="space-y-4">
      {cards.map((card, index) => (
        <div key={card.id} className="soft-panel rounded-[1.75rem] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Card {index + 1}</h3>
            <button
              type="button"
              onClick={() => onRemoveCard(card.id)}
              className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/20 dark:text-red-100"
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Front</span>
              <textarea
                value={card.front}
                onChange={(event) =>
                  onChangeCard(card.id, "front", event.target.value)
                }
                rows={4}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                placeholder="Question, term, or prompt"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Back</span>
              <textarea
                value={card.back}
                onChange={(event) =>
                  onChangeCard(card.id, "back", event.target.value)
                }
                rows={4}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
                placeholder="Answer, definition, or explanation"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Image size={16} />
              Optional image URL
            </span>
            <input
              type="url"
              value={card.imageUrl}
              onChange={(event) =>
                onChangeCard(card.id, "imageUrl", event.target.value)
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none dark:bg-slate-950/30"
              placeholder="https://example.com/image.jpg"
            />
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddCard}
        className="w-full rounded-[1.5rem] border border-dashed border-[var(--border)] px-4 py-4 text-center font-medium"
      >
        Add another card
      </button>
    </div>
  );
}
