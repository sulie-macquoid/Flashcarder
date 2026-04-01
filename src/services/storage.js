import { SESSION_KEY, STORAGE_KEY, THEME_KEY } from "../utils/constants";

const EMPTY_STATE = {
  currentUserId: null,
  sessionToken: null,
  users: [],
  folders: [],
  sets: [],
  progressByUser: {},
  ui: {
    theme: "light",
    notices: [],
  },
};

function normalizeState(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { ...EMPTY_STATE };
  }

  return {
    currentUserId: parsed.currentUserId ?? null,
    sessionToken:
      typeof parsed.sessionToken === "string" && parsed.sessionToken
        ? parsed.sessionToken
        : localStorage.getItem(SESSION_KEY) ?? null,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    folders: Array.isArray(parsed.folders) ? parsed.folders : [],
    sets: Array.isArray(parsed.sets) ? parsed.sets : [],
    progressByUser:
      parsed.progressByUser && typeof parsed.progressByUser === "object"
        ? parsed.progressByUser
        : {},
    ui: {
      theme:
        parsed.ui?.theme === "dark" || parsed.ui?.theme === "light"
          ? parsed.ui.theme
          : "light",
      notices: Array.isArray(parsed.ui?.notices) ? parsed.ui.notices : [],
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const theme = localStorage.getItem(THEME_KEY);
      return {
        ...EMPTY_STATE,
        ui: {
          ...EMPTY_STATE.ui,
          theme: theme === "dark" ? "dark" : "light",
        },
      };
    }

    return normalizeState(JSON.parse(raw));
  } catch {
    return {
      ...EMPTY_STATE,
      ui: {
        ...EMPTY_STATE.ui,
        notices: [
          {
            id: "storage-warning",
            type: "warning",
            message:
              "Stored data looked corrupted, so Sullys Grand Flashcards started with a clean local profile.",
          },
        ],
      },
    };
  }
}

export function saveState(state) {
  const nextState = {
    currentUserId: state.currentUserId,
    sessionToken: state.sessionToken,
    users: state.users,
    folders: state.folders,
    sets: state.sets,
    progressByUser: state.progressByUser,
    ui: {
      theme: state.ui.theme,
      notices: [],
    },
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  localStorage.setItem(THEME_KEY, state.ui.theme);
  if (state.sessionToken) {
    localStorage.setItem(SESSION_KEY, state.sessionToken);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}
