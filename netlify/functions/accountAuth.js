import {
  loginAccount,
  signupAccount,
  validateCredentials,
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

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      success: false,
      error: "Method not allowed.",
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const mode = payload?.mode;
    const credentials = validateCredentials(payload);

    const result =
      mode === "signup"
        ? await signupAccount(credentials)
        : mode === "login"
          ? await loginAccount(credentials)
          : null;

    if (!result) {
      return jsonResponse(400, {
        success: false,
        error: "Unsupported account action.",
      });
    }

    return jsonResponse(200, {
      success: true,
      sessionToken: result.sessionToken,
      state: result.state,
    });
  } catch (error) {
    return jsonResponse(400, {
      success: false,
      error: error?.message || "Account request failed.",
    });
  }
}
