function jsonHeaders(token) {
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({
    success: false,
    error: "Unexpected server response.",
  }));

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Cloud sync failed.");
  }

  return payload;
}

export async function authenticateCloudAccount(mode, payload) {
  const response = await fetch("/.netlify/functions/accountAuth", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      mode,
      ...payload,
    }),
  });

  return parseResponse(response);
}

export async function fetchCloudState(sessionToken) {
  const response = await fetch("/.netlify/functions/accountState", {
    method: "GET",
    headers: jsonHeaders(sessionToken),
  });

  return parseResponse(response);
}

export async function saveCloudState(sessionToken, state) {
  const response = await fetch("/.netlify/functions/accountState", {
    method: "POST",
    headers: jsonHeaders(sessionToken),
    body: JSON.stringify(state),
  });

  return parseResponse(response);
}
