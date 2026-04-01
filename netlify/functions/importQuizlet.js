import { extractQuizletUrlDetails, importQuizletSet } from "./lib/quizlet.js";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "Method not allowed.",
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const url = payload?.url;

    if (!url || typeof url !== "string") {
      return jsonResponse(400, {
        success: false,
        error: "A Quizlet URL is required.",
      });
    }

    try {
      extractQuizletUrlDetails(url);
    } catch (error) {
      return jsonResponse(400, {
        success: false,
        error: error.message,
      });
    }

    const result = await importQuizletSet(url);

    if (!result.cards.length) {
      return jsonResponse(422, {
        success: false,
        error: "No cards were found in that Quizlet set.",
      });
    }

    return jsonResponse(200, {
      success: true,
      title: result.title || "",
      cards: result.cards,
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      error:
        error?.name === "AbortError"
          ? "Quizlet import timed out. Try again or use CSV instead."
          : error?.message || "Quizlet import failed.",
    });
  }
}
