import { generateId } from "../utils/helpers";

const QUIZLET_URL_PATTERN =
  /^https?:\/\/(www\.)?quizlet\.com\/\d+(?:\/[-a-zA-Z0-9_/?=&%#.]*)?$/i;

export function validateQuizletUrl(url) {
  return QUIZLET_URL_PATTERN.test(url.trim());
}

export async function importCardsFromQuizlet(url) {
  const response = await fetch("/.netlify/functions/importQuizlet", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  const payload = await response.json().catch(() => ({
    success: false,
    error: "Quizlet import failed.",
  }));

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.error || "Import failed. Try copy-paste or CSV instead.",
    );
  }

  return {
    title: payload.title ?? "",
    cards: (payload.cards ?? []).map((card) => ({
      id: generateId("card"),
      front: String(card.front ?? "").trim(),
      back: String(card.back ?? "").trim(),
      imageUrl: "",
    })),
  };
}
