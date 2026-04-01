import { generateId } from "./helpers";

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCsvCards(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header and at least one card.");
  }

  const [headerLine, ...rows] = lines;
  const headers = splitCsvLine(headerLine).map((header) => header.toLowerCase());
  const frontIndex = headers.indexOf("front");
  const backIndex = headers.indexOf("back");

  if (frontIndex === -1 || backIndex === -1) {
    throw new Error('CSV header must include "front" and "back" columns.');
  }

  const cards = rows.map((row, rowIndex) => {
    const cells = splitCsvLine(row);
    const front = cells[frontIndex]?.trim();
    const back = cells[backIndex]?.trim();
    const imageUrl = cells[headers.indexOf("imageurl")]?.trim() ?? "";

    if (!front || !back) {
      throw new Error(`Row ${rowIndex + 2} must include both front and back values.`);
    }

    return {
      id: generateId("card"),
      front,
      back,
      imageUrl,
    };
  });

  return cards;
}

export function parseJsonCards(input) {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("JSON import is not valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON import must be a non-empty array of cards.");
  }

  return parsed.map((item, index) => {
    if (!item?.front?.trim() || !item?.back?.trim()) {
      throw new Error(`Card ${index + 1} must include non-empty front and back values.`);
    }

    return {
      id: generateId("card"),
      front: item.front.trim(),
      back: item.back.trim(),
      imageUrl: item.imageUrl?.trim() ?? "",
    };
  });
}

export function exportCardsToCsv(cards) {
  const header = "front,back,imageUrl";
  const rows = cards.map((card) =>
    [card.front, card.back, card.imageUrl ?? ""]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );

  return [header, ...rows].join("\n");
}

export function exportCardsToJson(cards) {
  return JSON.stringify(
    cards.map(({ front, back, imageUrl }) => ({ front, back, imageUrl })),
    null,
    2,
  );
}
