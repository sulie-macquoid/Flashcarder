export function generateId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function shuffleArray(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function dedupe(values) {
  return [...new Set(values)];
}

export function normalizeTags(tags) {
  return dedupe(
    tags
      .flatMap((tag) => tag.split(","))
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

export function formatPercentage(value) {
  return `${Math.round(value)}%`;
}

export function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sortByUpdatedAt(items) {
  return [...items].sort(
    (left, right) => new Date(right.updatedAt) - new Date(left.updatedAt),
  );
}

export function sortByRecentStudy(items) {
  return [...items].sort((left, right) => {
    const rightRecent = right.lastStudiedAt ? new Date(right.lastStudiedAt).getTime() : 0;
    const leftRecent = left.lastStudiedAt ? new Date(left.lastStudiedAt).getTime() : 0;

    if (rightRecent !== leftRecent) {
      return rightRecent - leftRecent;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
