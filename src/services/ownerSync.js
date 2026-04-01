const OWNER_SYNC_ENDPOINT = "/.netlify/functions/ownerState";

async function requestOwnerState(method, state) {
  const response = await fetch(OWNER_SYNC_ENDPOINT, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-owner-password": "SullyIsBigBoss",
    },
    body: state ? JSON.stringify({ state }) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || "Unable to sync right now.");
  }

  return payload.state ?? null;
}

export async function fetchOwnerState() {
  return requestOwnerState("GET");
}

export async function saveOwnerState(state) {
  return requestOwnerState("POST", state);
}

