import { getStore } from "@netlify/blobs";

const OWNER_PASSWORD = "SullyIsBigBoss";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function isAuthorized(event) {
  return event.headers["x-owner-password"] === OWNER_PASSWORD;
}

export async function handler(event) {
  if (!isAuthorized(event)) {
    return json(401, {
      success: false,
      error: "Unauthorized",
    });
  }

  try {
    const store = getStore("sullys-grand-flashcards");

    if (event.httpMethod === "GET") {
      const payload = await store.get("owner-state", { type: "json" });
      return json(200, {
        success: true,
        state: payload?.state ?? null,
      });
    }

    if (event.httpMethod === "POST") {
      const parsed = JSON.parse(event.body ?? "{}");
      if (!parsed.state || typeof parsed.state !== "object") {
        return json(400, {
          success: false,
          error: "State payload is required.",
        });
      }

      await store.setJSON("owner-state", {
        state: parsed.state,
        updatedAt: new Date().toISOString(),
      });

      return json(200, {
        success: true,
        state: parsed.state,
      });
    }

    return json(405, {
      success: false,
      error: "Method not allowed.",
    });
  } catch (error) {
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed.",
    });
  }
}
