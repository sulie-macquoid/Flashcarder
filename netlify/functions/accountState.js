import {
  buildClientState,
  loadAccountFromSession,
  saveAccountStateFromSession,
} from "./lib/accountSync.js";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function getBearerToken(headers = {}) {
  const authHeader = headers.authorization || headers.Authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export async function handler(event) {
  const token = getBearerToken(event.headers);
  if (!token) {
    return jsonResponse(401, {
      success: false,
      error: "Missing session token.",
    });
  }

  try {
    if (event.httpMethod === "GET") {
      const account = await loadAccountFromSession(token);
      return jsonResponse(200, {
        success: true,
        state: buildClientState(account),
      });
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const state = await saveAccountStateFromSession(token, payload);
      return jsonResponse(200, {
        success: true,
        state,
      });
    }

    return jsonResponse(405, {
      success: false,
      error: "Method not allowed.",
    });
  } catch (error) {
    return jsonResponse(400, {
      success: false,
      error: error?.message || "Cloud sync failed.",
    });
  }
}
