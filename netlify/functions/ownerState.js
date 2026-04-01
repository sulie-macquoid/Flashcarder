import { getStore } from "@netlify/blobs";

const OWNER_PASSWORD = "SullyIsBigBoss";
const GITHUB_SYNC_REPO =
  process.env.GITHUB_SYNC_REPO || "sulie-macquoid/Flashcarder";
const GITHUB_SYNC_PATH =
  process.env.GITHUB_SYNC_PATH || "data/owner-state.json";
const GITHUB_SYNC_BRANCH =
  process.env.GITHUB_SYNC_BRANCH || "main";

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
  const suppliedPassword =
    event.headers?.["x-owner-password"] ??
    event.headers?.["X-Owner-Password"] ??
    event.headers?.["x-owner-password".toLowerCase()] ??
    null;

  return suppliedPassword === OWNER_PASSWORD;
}

function getGitHubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_SYNC_TOKEN}`,
    "User-Agent": "sullys-grand-flashcards-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readGitHubState() {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_SYNC_REPO}/contents/${GITHUB_SYNC_PATH}?ref=${encodeURIComponent(GITHUB_SYNC_BRANCH)}`,
    {
      headers: getGitHubHeaders(),
    },
  );

  if (response.status === 404) {
    return { state: null, sha: null };
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "GitHub sync read failed.");
  }

  const content = typeof payload.content === "string" ? payload.content.replace(/\n/g, "") : "";
  const decoded = content
    ? JSON.parse(Buffer.from(content, "base64").toString("utf8"))
    : null;

  return {
    state: decoded?.state ?? null,
    sha: payload.sha ?? null,
  };
}

async function writeGitHubState(state) {
  const current = await readGitHubState();
  const body = {
    message: "Update Sullys Grand Flashcards owner state",
    content: Buffer.from(
      JSON.stringify(
        {
          state,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    ).toString("base64"),
    branch: GITHUB_SYNC_BRANCH,
  };

  if (current.sha) {
    body.sha = current.sha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_SYNC_REPO}/contents/${GITHUB_SYNC_PATH}`,
    {
      method: "PUT",
      headers: getGitHubHeaders(),
      body: JSON.stringify(body),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "GitHub sync write failed.");
  }

  return state;
}

export async function handler(event) {
  if (!isAuthorized(event)) {
    return json(401, {
      success: false,
      code: "SYNC_AUTH_401",
      error: "Unauthorized",
    });
  }

  try {
    const hasGitHubSync = Boolean(process.env.GITHUB_SYNC_TOKEN);
    const hasBlobsContext = Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
    const hasManualBlobsConfig =
      Boolean(process.env.NETLIFY_SITE_ID) && Boolean(process.env.NETLIFY_AUTH_TOKEN);

    const readState = async () => {
      if (hasGitHubSync) {
        const payload = await readGitHubState();
        return payload.state;
      }

      if (hasBlobsContext || hasManualBlobsConfig) {
        const store = hasManualBlobsConfig
          ? getStore("sullys-grand-flashcards", {
              siteID: process.env.NETLIFY_SITE_ID,
              token: process.env.NETLIFY_AUTH_TOKEN,
            })
          : getStore("sullys-grand-flashcards");
        const payload = await store.get("owner-state", { type: "json" });
        return payload?.state ?? null;
      }

      throw new Error(
        "Sync storage is not configured. Add GITHUB_SYNC_TOKEN in Netlify, or enable Netlify Blobs.",
      );
    };

    const writeState = async (state) => {
      if (hasGitHubSync) {
        return writeGitHubState(state);
      }

      if (hasBlobsContext || hasManualBlobsConfig) {
        const store = hasManualBlobsConfig
          ? getStore("sullys-grand-flashcards", {
              siteID: process.env.NETLIFY_SITE_ID,
              token: process.env.NETLIFY_AUTH_TOKEN,
            })
          : getStore("sullys-grand-flashcards");
        await store.setJSON("owner-state", {
          state,
          updatedAt: new Date().toISOString(),
        });
        return state;
      }

      throw new Error(
        "Sync storage is not configured. Add GITHUB_SYNC_TOKEN in Netlify, or enable Netlify Blobs.",
      );
    };

    if (event.httpMethod === "GET") {
      return json(200, {
        success: true,
        state: await readState(),
      });
    }

    if (event.httpMethod === "POST") {
      const parsed = JSON.parse(event.body ?? "{}");
      if (!parsed.state || typeof parsed.state !== "object") {
        return json(400, {
          success: false,
          code: "SYNC_BAD_PAYLOAD",
          error: "State payload is required.",
        });
      }

      return json(200, {
        success: true,
        state: await writeState(parsed.state),
      });
    }

    return json(405, {
      success: false,
      code: "SYNC_METHOD_405",
      error: "Method not allowed.",
    });
  } catch (error) {
    return json(500, {
      success: false,
      code: "SYNC_SERVER_500",
      error: error instanceof Error ? error.message : "Sync failed.",
    });
  }
}
