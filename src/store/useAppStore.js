import { create } from "zustand";
import { createStarterContent } from "../data/demoData";
import {
  authenticateCloudAccount,
  fetchCloudState,
  saveCloudState,
} from "../services/cloudSync";
import { loadState, saveState } from "../services/storage";
import { createFlashcardState, createLearnSession, answerLearnCard, revealLearnAnswer, undoLearnAnswer, moveFlashcard, toggleFlashcardShuffle } from "../utils/session";
import { generateId, normalizeTags, sortByRecentStudy, sortByUpdatedAt } from "../utils/helpers";

const initialState = loadState();
let remoteSaveTimer = null;

function getUserProgress(state, userId) {
  return (
    state.progressByUser[userId] ?? {
      setProgress: {},
      dailyGoal: 20,
    }
  );
}

function getSetProgress(state, userId, setId) {
  const userProgress = getUserProgress(state, userId);
  return (
    userProgress.setProgress[setId] ?? {
      completedCardIds: [],
      flaggedCardIds: [],
      learnSession: null,
      flashcardState: null,
      stats: {
        totalKnown: 0,
        totalUnknown: 0,
      },
    }
  );
}

function withSetProgress(state, userId, setId, updater) {
  const userProgress = getUserProgress(state, userId);
  const currentProgress = getSetProgress(state, userId, setId);
  const nextSetProgress = updater(currentProgress);

  return {
    ...state.progressByUser,
    [userId]: {
      ...userProgress,
      setProgress: {
        ...userProgress.setProgress,
        [setId]: nextSetProgress,
      },
    },
  };
}

function createUser(name, email, password) {
  return {
    id: generateId("user"),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    createdAt: new Date().toISOString(),
  };
}

export const useAppStore = create((set, get) => ({
  ...initialState,
  signUp: async ({ name, email, password }) => {
    const result = await authenticateCloudAccount("signup", {
      name,
      email,
      password,
    });

    set((state) => ({
      ...state,
      ...result.state,
      sessionToken: result.sessionToken,
    }));
  },
  logIn: async ({ email, password }) => {
    const result = await authenticateCloudAccount("login", {
      email,
      password,
    });

    set((state) => ({
      ...state,
      ...result.state,
      sessionToken: result.sessionToken,
    }));
  },
  restoreCloudSession: async () => {
    const token = get().sessionToken;
    if (!token) {
      return;
    }

    try {
      const result = await fetchCloudState(token);
      set((state) => ({
        ...state,
        ...result.state,
      }));
    } catch {
      set((state) => ({
        ...state,
        sessionToken: null,
        currentUserId: null,
      }));
    }
  },
  logOut: () =>
    set({
      currentUserId: null,
      sessionToken: null,
    }),
  dismissNotice: (noticeId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        notices: state.ui.notices.filter((notice) => notice.id !== noticeId),
      },
    })),
  toggleTheme: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        theme: state.ui.theme === "light" ? "dark" : "light",
      },
    })),
  setDailyGoal: (value) =>
    set((state) => {
      const userId = state.currentUserId;
      if (!userId) {
        return state;
      }

      return {
        progressByUser: {
          ...state.progressByUser,
          [userId]: {
            ...getUserProgress(state, userId),
            dailyGoal: Number(value) || 20,
          },
        },
      };
    }),
  createFolder: ({ name, description = "" }) =>
    {
      const folder = {
        id: generateId("folder"),
        userId: get().currentUserId,
        name: name.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        folders: [...state.folders, folder],
      }));

      return folder;
    },
  updateFolder: (folderId, updates) =>
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId
          ? {
              ...folder,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : folder,
      ),
    })),
  deleteFolder: (folderId) =>
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== folderId),
      sets: state.sets.map((item) =>
        item.folderId === folderId ? { ...item, folderId: null } : item,
      ),
    })),
  saveSet: (payload) =>
    set((state) => {
      const userId = state.currentUserId;
      const now = new Date().toISOString();
      const cards = payload.cards
        .map((card) => ({
          id: card.id || generateId("card"),
          front: card.front.trim(),
          back: card.back.trim(),
          imageUrl: card.imageUrl?.trim() ?? "",
        }))
        .filter((card) => card.front && card.back);

      if (!cards.length) {
        throw new Error("Add at least one non-empty card before saving.");
      }

      const normalizedSet = {
        id: payload.id || generateId("set"),
        userId,
        folderId: payload.folderId || null,
        title: payload.title.trim(),
        description: payload.description.trim(),
        tags: normalizeTags(payload.tags),
        cards,
        createdAt: payload.createdAt || now,
        updatedAt: now,
        lastStudiedAt: payload.lastStudiedAt ?? null,
      };

      const exists = state.sets.some((item) => item.id === normalizedSet.id);

      return {
        sets: exists
          ? state.sets.map((item) =>
              item.id === normalizedSet.id ? normalizedSet : item,
            )
          : [...state.sets, normalizedSet],
        progressByUser: exists
          ? withSetProgress(state, userId, normalizedSet.id, (current) => ({
              ...current,
              completedCardIds: current.completedCardIds.filter((cardId) =>
                cards.some((card) => card.id === cardId),
              ),
              flaggedCardIds: current.flaggedCardIds.filter((cardId) =>
                cards.some((card) => card.id === cardId),
              ),
              learnSession: current.learnSession
                ? {
                    ...current.learnSession,
                    queue: current.learnSession.queue.filter((cardId) =>
                      cards.some((card) => card.id === cardId),
                    ),
                    completedCardIds:
                      current.learnSession.completedCardIds.filter((cardId) =>
                        cards.some((card) => card.id === cardId),
                      ),
                    currentCardId: cards.some(
                      (card) => card.id === current.learnSession.currentCardId,
                    )
                      ? current.learnSession.currentCardId
                      : current.learnSession.queue[0] ?? null,
                  }
                : null,
            }))
          : state.progressByUser,
      };
    }),
  deleteSet: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      const userProgress = getUserProgress(state, userId);
      const nextSetProgress = { ...userProgress.setProgress };
      delete nextSetProgress[setId];

      return {
        sets: state.sets.filter((item) => item.id !== setId),
        progressByUser: {
          ...state.progressByUser,
          [userId]: {
            ...userProgress,
            setProgress: nextSetProgress,
          },
        },
      };
    }),
  duplicateSet: (setId) =>
    set((state) => {
      const source = state.sets.find((item) => item.id === setId);
      if (!source) {
        return state;
      }

      const duplicateId = generateId("set");
      return {
        sets: [
          ...state.sets,
          {
            ...source,
            id: duplicateId,
            title: `${source.title} Copy`,
            cards: source.cards.map((card) => ({
              ...card,
              id: generateId("card"),
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    }),
  resetCardProgress: (setId, cardId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          completedCardIds: current.completedCardIds.filter((id) => id !== cardId),
          flaggedCardIds: current.flaggedCardIds,
          learnSession: current.learnSession
            ? {
                ...current.learnSession,
                completedCardIds: current.learnSession.completedCardIds.filter(
                  (id) => id !== cardId,
                ),
                queue: current.learnSession.queue.includes(cardId)
                  ? current.learnSession.queue
                  : [...current.learnSession.queue, cardId],
                currentCardId: current.learnSession.currentCardId ?? cardId,
              }
            : current.learnSession,
        })),
      };
    }),
  resetSetProgress: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, () => ({
          completedCardIds: [],
          flaggedCardIds: [],
          learnSession: null,
          flashcardState: null,
          stats: {
            totalKnown: 0,
            totalUnknown: 0,
          },
        })),
      };
    }),
  resetAllProgress: () =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: {
          ...state.progressByUser,
          [userId]: {
            ...getUserProgress(state, userId),
            setProgress: {},
          },
        },
      };
    }),
  toggleFlagCard: (setId, cardId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => {
          const flagged = current.flaggedCardIds.includes(cardId)
            ? current.flaggedCardIds.filter((id) => id !== cardId)
            : [...current.flaggedCardIds, cardId];

          return {
            ...current,
            flaggedCardIds: flagged,
          };
        }),
      };
    }),
  startLearnSession: (setId, options = {}) =>
    set((state) => {
      const userId = state.currentUserId;
      const studySet = state.sets.find((item) => item.id === setId);
      if (!studySet) {
        return state;
      }

      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          learnSession: createLearnSession(studySet.cards, {
            setId,
            infiniteMode: options.infiniteMode,
          }),
        })),
      };
    }),
  resumeLearnSession: (setId, infiniteMode) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          learnSession: current.learnSession
            ? {
                ...current.learnSession,
                infiniteMode:
                  infiniteMode ?? current.learnSession.infiniteMode ?? false,
              }
            : current.learnSession,
        })),
      };
    }),
  revealLearnAnswer: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          learnSession: current.learnSession
            ? revealLearnAnswer(current.learnSession)
            : current.learnSession,
        })),
      };
    }),
  answerLearnCard: (setId, result) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => {
          if (!current.learnSession) {
            return current;
          }

          const nextSession = answerLearnCard(current.learnSession, result);
          return {
            ...current,
            completedCardIds: nextSession.infiniteMode
              ? current.completedCardIds
              : nextSession.completedCardIds,
            learnSession: nextSession,
            stats: {
              totalKnown: current.stats.totalKnown + (result === "know" ? 1 : 0),
              totalUnknown:
                current.stats.totalUnknown + (result === "dontKnow" ? 1 : 0),
            },
          };
        }),
      };
    }),
  undoLearnAnswer: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => {
          if (!current.learnSession) {
            return current;
          }

          const restored = undoLearnAnswer(current.learnSession);
          return {
            ...current,
            completedCardIds: restored.completedCardIds,
            learnSession: restored,
          };
        }),
      };
    }),
  initFlashcardMode: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      const studySet = state.sets.find((item) => item.id === setId);
      if (!studySet) {
        return state;
      }

      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          flashcardState: createFlashcardState(studySet.cards),
        })),
      };
    }),
  markSetStudied: (setId) =>
    set((state) => ({
      sets: state.sets.map((item) =>
        item.id === setId
          ? {
              ...item,
              lastStudiedAt: new Date().toISOString(),
            }
          : item,
      ),
    })),
  flipFlashcard: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          flashcardState: current.flashcardState
            ? {
                ...current.flashcardState,
                flipped: !current.flashcardState.flipped,
                updatedAt: new Date().toISOString(),
              }
            : current.flashcardState,
        })),
      };
    }),
  moveFlashcard: (setId, direction) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          flashcardState: current.flashcardState
            ? moveFlashcard(current.flashcardState, direction)
            : current.flashcardState,
        })),
      };
    }),
  toggleFlashcardShuffle: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          flashcardState: current.flashcardState
            ? toggleFlashcardShuffle(current.flashcardState)
            : current.flashcardState,
        })),
      };
    }),
  hydrateStudyModes: (setId) => {
    const state = get();
    const userId = state.currentUserId;
    const progress = getSetProgress(state, userId, setId);
    const studySet = state.sets.find((item) => item.id === setId);
    if (!studySet) {
      return;
    }

    if (!progress.flashcardState) {
      get().initFlashcardMode(setId);
    }
  },
  getCurrentUser: () => {
    const state = get();
    return state.users.find((user) => user.id === state.currentUserId) ?? null;
  },
  getFoldersForCurrentUser: () => {
    const state = get();
    return sortByUpdatedAt(
      state.folders.filter((folder) => folder.userId === state.currentUserId),
    );
  },
  getSetsForCurrentUser: () => {
    const state = get();
    return sortByRecentStudy(
      state.sets.filter((item) => item.userId === state.currentUserId),
    );
  },
  getSetById: (setId) => get().sets.find((item) => item.id === setId) ?? null,
  getProgressForSet: (setId) => {
    const state = get();
    return getSetProgress(state, state.currentUserId, setId);
  },
}));

useAppStore.subscribe((state) => {
  saveState(state);
  document.documentElement.classList.toggle("dark", state.ui.theme === "dark");

  if (!state.sessionToken || !state.currentUserId) {
    return;
  }

  if (remoteSaveTimer) {
    clearTimeout(remoteSaveTimer);
  }

  remoteSaveTimer = setTimeout(() => {
    const currentState = useAppStore.getState();
    const currentUser = currentState.users.find(
      (user) => user.id === currentState.currentUserId,
    );

    if (!currentState.sessionToken || !currentUser) {
      return;
    }

    saveCloudState(currentState.sessionToken, {
      user: {
        name: currentUser.name,
      },
      folders: currentState.folders.filter(
        (folder) => folder.userId === currentState.currentUserId,
      ),
      sets: currentState.sets.filter(
        (setItem) => setItem.userId === currentState.currentUserId,
      ),
      progress:
        currentState.progressByUser[currentState.currentUserId] ?? {
          setProgress: {},
          dailyGoal: 20,
        },
    }).catch(() => {
      // Local state is still preserved even if a cloud save fails.
    });
  }, 450);
});

document.documentElement.classList.toggle(
  "dark",
  initialState.ui.theme === "dark",
);
