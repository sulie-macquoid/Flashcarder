const QUIZLET_HOSTS = new Set(["quizlet.com", "www.quizlet.com"]);
const MAX_CARDS = 500;
const MAX_TEXT_LENGTH = 400;
const REQUEST_TIMEOUT_MS = 5000;

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanCards(cards) {
  const seen = new Set();

  return cards
    .map((card) => ({
      front: normalizeWhitespace(card.front).slice(0, MAX_TEXT_LENGTH),
      back: normalizeWhitespace(card.back).slice(0, MAX_TEXT_LENGTH),
    }))
    .filter((card) => card.front && card.back)
    .filter((card) => {
      const key = `${card.front}::${card.back}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CARDS);
}

export function extractQuizletUrlDetails(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Please paste a valid Quizlet set URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol) || !QUIZLET_HOSTS.has(parsed.hostname)) {
    throw new Error("Only public Quizlet set URLs are supported.");
  }

  const match = parsed.pathname.match(/\/(\d+)(?:\/|$)/);
  if (!match) {
    throw new Error("Could not find a Quizlet set ID in that URL.");
  }

  return {
    setId: match[1],
    normalizedUrl: `https://quizlet.com/${match[1]}`,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url, options = {}, retries = 1) {
  let response;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    response = await fetchWithTimeout(url, options);
    if (response.status !== 429 || attempt === retries) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return response;
}

function createBrowserHeaders(referer) {
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    pragma: "no-cache",
    referer,
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };
}

function extractText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join(" ").trim();
  }

  if (typeof value === "object") {
    if (typeof value.plainText === "string") {
      return value.plainText;
    }
    if (typeof value.text?.plainText === "string") {
      return value.text.plainText;
    }
    if (typeof value.text === "string") {
      return value.text;
    }
    if (typeof value.word === "string") {
      return value.word;
    }
    if (typeof value.definition === "string") {
      return value.definition;
    }
    if (typeof value.prompt === "string") {
      return value.prompt;
    }
    if (typeof value.answer === "string") {
      return value.answer;
    }

    const preferredKeys = ["media", "text", "label", "content"];
    for (const key of preferredKeys) {
      const candidate = extractText(value[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  return "";
}

function cardsFromCardSides(cardSides) {
  if (!Array.isArray(cardSides) || cardSides.length < 2) {
    return null;
  }

  const front = extractText(cardSides[0]);
  const back = extractText(cardSides[1]);
  if (!front || !back) {
    return null;
  }

  return { front, back };
}

function cardsFromObject(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if (item._word && item._definition) {
    return { front: item._word, back: item._definition };
  }

  if (item.word && item.definition) {
    return { front: item.word, back: item.definition };
  }

  if (item.front && item.back) {
    return { front: item.front, back: item.back };
  }

  if (Array.isArray(item.cardSides)) {
    return cardsFromCardSides(item.cardSides);
  }

  if (Array.isArray(item.sides)) {
    return cardsFromCardSides(item.sides);
  }

  if (Array.isArray(item.studiableMediaConnections) && item.studiableMediaConnections.length >= 2) {
    const front = extractText(item.studiableMediaConnections[0]);
    const back = extractText(item.studiableMediaConnections[1]);
    if (front && back) {
      return { front, back };
    }
  }

  return null;
}

function walkForCards(node, results = []) {
  if (!node) {
    return results;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => walkForCards(item, results));
    return results;
  }

  if (typeof node === "object") {
    const card = cardsFromObject(node);
    if (card) {
      results.push(card);
    }

    Object.values(node).forEach((value) => walkForCards(value, results));
  }

  return results;
}

function extractTitleFromNode(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  const directTitle =
    typeof node.title === "string"
      ? node.title
      : typeof node.name === "string"
        ? node.name
        : "";

  if (directTitle && directTitle.length <= 140) {
    return normalizeWhitespace(directTitle);
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = extractTitleFromNode(item);
        if (nested) {
          return nested;
        }
      }
      continue;
    }

    const nested = extractTitleFromNode(value);
    if (nested) {
      return nested;
    }
  }

  return "";
}

function extractBalancedJson(source, startIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
    }

    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function extractJsonBlobsFromHtml(html) {
  const blobs = [];
  const markers = [
    "__INITIAL_STATE__",
    "__NEXT_DATA__",
    "dehydratedReduxState",
    "studiableItems",
  ];

  for (const marker of markers) {
    let searchIndex = 0;
    while (searchIndex < html.length) {
      const markerIndex = html.indexOf(marker, searchIndex);
      if (markerIndex === -1) {
        break;
      }

      const jsonStart = html.slice(markerIndex).search(/[{\[]/);
      if (jsonStart === -1) {
        break;
      }

      const absoluteStart = markerIndex + jsonStart;
      const blob = extractBalancedJson(html, absoluteStart);
      if (blob) {
        blobs.push(blob);
      }
      searchIndex = absoluteStart + 1;
    }
  }

  const ldJsonMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of ldJsonMatches) {
    if (match[1]) {
      blobs.push(match[1]);
    }
  }

  return blobs;
}

function parseCardsFromUnknownJson(payload) {
  const cards = cleanCards(walkForCards(payload));
  const title = extractTitleFromNode(payload);
  return { cards, title };
}

async function tryInternalApi(setId, normalizedUrl) {
  // Quizlet changes its internal endpoints from time to time, so we try a couple
  // of lightweight browser-like requests before falling back to page parsing.
  const endpoints = [
    `https://quizlet.com/webapi/3.2/sets/${setId}`,
    `https://quizlet.com/webapi/3.2/studiable-item-documents?filters[set][]=${setId}&perPage=${MAX_CARDS}`,
  ];

  for (const endpoint of endpoints) {
    const response = await fetchWithRetry(endpoint, {
      headers: createBrowserHeaders(normalizedUrl),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("This Quizlet set appears to be private or unavailable.");
    }

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    const parsed = parseCardsFromUnknownJson(payload);
    if (parsed.cards.length) {
      return parsed;
    }
  }

  throw new Error("Quizlet API import returned no cards.");
}

async function tryHtmlFallback(normalizedUrl) {
  const response = await fetchWithRetry(normalizedUrl, {
    headers: {
      ...createBrowserHeaders(normalizedUrl),
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("This Quizlet set appears to be private or unavailable.");
  }

  if (!response.ok) {
    throw new Error("Could not load the Quizlet page for fallback parsing.");
  }

  const html = await response.text();
  const blobs = extractJsonBlobsFromHtml(html);

  // The fallback scans embedded JSON blobs that public Quizlet pages often ship
  // for hydration, then recursively looks for card-like structures.
  for (const blob of blobs) {
    try {
      const payload = JSON.parse(blob);
      const parsed = parseCardsFromUnknownJson(payload);
      if (parsed.cards.length) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Could not extract cards from the Quizlet page.");
}

export async function importQuizletSet(rawUrl) {
  const { setId, normalizedUrl } = extractQuizletUrlDetails(rawUrl);

  try {
    return await tryInternalApi(setId, normalizedUrl);
  } catch (apiError) {
    const apiMessage = apiError?.message ?? "";
    if (apiMessage.includes("private")) {
      throw apiError;
    }

    return tryHtmlFallback(normalizedUrl);
  }
}
