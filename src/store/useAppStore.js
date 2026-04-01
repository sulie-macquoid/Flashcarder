import { create } from "zustand";
import { createStarterContent } from "../data/demoData";
import { loadState, saveState } from "../services/storage";
import { fetchOwnerState, saveOwnerState } from "../services/ownerSync";
import {
  answerLearnCard,
  answerQuizQuestion,
  createLearnSession,
  createQuizSession,
  getQuizCompletion,
  isQuizComplete,
  revealLearnAnswer,
  toggleReviewShuffle,
  undoLearnAnswer,
  undoQuizAnswer,
} from "../utils/session";
import { generateId, normalizeTags, sortByRecentStudy, sortByUpdatedAt } from "../utils/helpers";

const initialState = loadState();
const SINGLE_USER_PASSWORD = "SullyIsBigBoss";
const SINGLE_USER_ID = "user-sully-owner";
let remoteSaveTimer = null;

function normalizeCard(card) {
  return {
    id: typeof card?.id === "string" && card.id ? card.id : generateId("card"),
    front: typeof card?.front === "string" ? card.front.trim() : "",
    back: typeof card?.back === "string" ? card.back.trim() : "",
    imageUrl: typeof card?.imageUrl === "string" ? card.imageUrl.trim() : "",
  };
}

function normalizeFolder(folder) {
  const now = new Date().toISOString();

  return {
    id: typeof folder?.id === "string" && folder.id ? folder.id : generateId("folder"),
    userId: SINGLE_USER_ID,
    name: typeof folder?.name === "string" ? folder.name.trim() : "Untitled folder",
    description: typeof folder?.description === "string" ? folder.description.trim() : "",
    createdAt: folder?.createdAt ?? now,
    updatedAt: folder?.updatedAt ?? folder?.createdAt ?? now,
  };
}

function normalizeSetItem(setItem) {
  const now = new Date().toISOString();
  const cards = Array.isArray(setItem?.cards)
    ? setItem.cards.map(normalizeCard).filter((card) => card.front && card.back)
    : [];

  return {
    id: typeof setItem?.id === "string" && setItem.id ? setItem.id : generateId("set"),
    userId: SINGLE_USER_ID,
    folderId: typeof setItem?.folderId === "string" && setItem.folderId ? setItem.folderId : null,
    title: typeof setItem?.title === "string" && setItem.title.trim()
      ? setItem.title.trim()
      : "Untitled set",
    description: typeof setItem?.description === "string" ? setItem.description.trim() : "",
    tags: Array.isArray(setItem?.tags) ? normalizeTags(setItem.tags) : [],
    cards,
    createdAt: setItem?.createdAt ?? now,
    updatedAt: setItem?.updatedAt ?? setItem?.createdAt ?? now,
    lastStudiedAt: setItem?.lastStudiedAt ?? null,
  };
}

function sanitizeReviewSession(rawSession) {
  if (!rawSession || typeof rawSession !== "object") {
    return null;
  }

  const queue = Array.isArray(rawSession.queue) ? rawSession.queue.filter(Boolean) : [];
  const completedCardIds = Array.isArray(rawSession.completedCardIds)
    ? rawSession.completedCardIds.filter(Boolean)
    : [];
  const originalOrder = Array.isArray(rawSession.originalOrder)
    ? rawSession.originalOrder.filter(Boolean)
    : [...queue];
  const currentCardId =
    typeof rawSession.currentCardId === "string" && rawSession.currentCardId
      ? rawSession.currentCardId
      : queue[0] ?? null;

  return {
    setId: rawSession.setId ?? null,
    infiniteMode: Boolean(rawSession.infiniteMode),
    originalOrder,
    shuffled: Boolean(rawSession.shuffled),
    queue,
    completedCardIds,
    currentCardId,
    revealed: Boolean(rawSession.revealed),
    stats: {
      answered: rawSession.stats?.answered ?? 0,
      known: rawSession.stats?.known ?? 0,
      unknown: rawSession.stats?.unknown ?? 0,
    },
    history: Array.isArray(rawSession.history) ? rawSession.history : [],
    updatedAt: rawSession.updatedAt ?? null,
  };
}

function sanitizeQuizSession(rawSession) {
  if (!rawSession || typeof rawSession !== "object") {
    return null;
  }

  const queue = Array.isArray(rawSession.queue) ? rawSession.queue.filter(Boolean) : [];
  const completedCardIds = Array.isArray(rawSession.completedCardIds)
    ? rawSession.completedCardIds.filter(Boolean)
    : [];
  const currentCardId =
    typeof rawSession.currentCardId === "string" && rawSession.currentCardId
      ? rawSession.currentCardId
      : queue[0] ?? null;

  return {
    setId: rawSession.setId ?? null,
    queue,
    completedCardIds,
    currentCardId,
    options: Array.isArray(rawSession.options) ? rawSession.options.filter(Boolean) : [],
    lastResult:
      rawSession.lastResult === "correct" || rawSession.lastResult === "wrong"
        ? rawSession.lastResult
        : null,
    stats: {
      answered: rawSession.stats?.answered ?? 0,
      correct: rawSession.stats?.correct ?? 0,
      wrong: rawSession.stats?.wrong ?? 0,
    },
    history: Array.isArray(rawSession.history) ? rawSession.history : [],
    updatedAt: rawSession.updatedAt ?? null,
  };
}

function getSessionTimestamp(progress) {
  const timestamps = [
    progress?.reviewSession?.updatedAt,
    progress?.quizSession?.updatedAt,
  ]
    .map((value) => (value ? Date.parse(value) : 0))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length) {
    return Math.max(...timestamps);
  }

  return 0;
}

function mergeProgressEntry(baseProgress, incomingProgress) {
  if (!baseProgress) {
    return incomingProgress;
  }

  if (!incomingProgress) {
    return baseProgress;
  }

  const baseTimestamp = getSessionTimestamp(baseProgress);
  const incomingTimestamp = getSessionTimestamp(incomingProgress);

  if (incomingTimestamp !== baseTimestamp) {
    return incomingTimestamp > baseTimestamp ? incomingProgress : baseProgress;
  }

  const baseScore =
    (baseProgress.completedCardIds?.length ?? 0) +
    (baseProgress.stats?.totalKnown ?? 0) +
    (baseProgress.stats?.totalUnknown ?? 0);
  const incomingScore =
    (incomingProgress.completedCardIds?.length ?? 0) +
    (incomingProgress.stats?.totalKnown ?? 0) +
    (incomingProgress.stats?.totalUnknown ?? 0);

  return incomingScore > baseScore ? incomingProgress : baseProgress;
}

function mergeCollections(baseItems, incomingItems, timestampField = "updatedAt") {
  const byId = new Map();

  [...baseItems, ...incomingItems].forEach((item) => {
    if (!item?.id) {
      return;
    }

    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }

    const existingTime = Date.parse(existing[timestampField] ?? "") || 0;
    const nextTime = Date.parse(item[timestampField] ?? "") || 0;
    byId.set(item.id, nextTime >= existingTime ? item : existing);
  });

  return [...byId.values()];
}

function adoptExistingLocalState(state) {
  const existingOwner = state.users.find((user) => user.id === SINGLE_USER_ID);
  const fallbackName =
    existingOwner?.name ??
    state.users.find((user) => user?.name)?.name ??
    "Sully";
  const owner = createUser(fallbackName);
  const folders = mergeCollections([], state.folders.map(normalizeFolder));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const sets = mergeCollections(
    [],
    state.sets
      .map(normalizeSetItem)
      .map((setItem) => ({
        ...setItem,
        folderId: setItem.folderId && folderIds.has(setItem.folderId) ? setItem.folderId : null,
      }))
      .filter((setItem) => setItem.cards.length),
  );

  const mergedSetProgress = {};
  Object.values(state.progressByUser ?? {}).forEach((userProgress) => {
    Object.entries(userProgress?.setProgress ?? {}).forEach(([setId, rawProgress]) => {
      const sanitized = getSetProgress(
        {
          progressByUser: {
            temp: {
              setProgress: {
                [setId]: rawProgress,
              },
            },
          },
        },
        "temp",
        setId,
      );

      mergedSetProgress[setId] = mergeProgressEntry(mergedSetProgress[setId], sanitized);
    });
  });

  return {
    currentUserId: SINGLE_USER_ID,
    users: [owner],
    folders,
    sets,
    progressByUser: {
      [SINGLE_USER_ID]: {
        setProgress: mergedSetProgress,
        dailyGoal:
          state.progressByUser?.[SINGLE_USER_ID]?.dailyGoal ??
          Object.values(state.progressByUser ?? {}).find((item) => item?.dailyGoal)?.dailyGoal ??
          20,
      },
    },
  };
}

function extractOwnerSnapshot(state) {
  const owner = state.users.find((user) => user.id === SINGLE_USER_ID) ?? createUser("Sully");

  return {
    user: {
      name: owner.name,
      email: owner.email,
    },
    folders: state.folders
      .filter((folder) => folder.userId === SINGLE_USER_ID)
      .map(normalizeFolder),
    sets: state.sets
      .filter((setItem) => setItem.userId === SINGLE_USER_ID)
      .map(normalizeSetItem),
    progress: getUserProgress(state, SINGLE_USER_ID),
  };
}

function mergeOwnerSnapshotIntoState(state, snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return adoptExistingLocalState(state);
  }

  const localOwnerState = adoptExistingLocalState(state);
  const remoteFolders = Array.isArray(snapshot.folders) ? snapshot.folders.map(normalizeFolder) : [];
  const remoteSets = Array.isArray(snapshot.sets) ? snapshot.sets.map(normalizeSetItem) : [];
  const mergedFolders = mergeCollections(localOwnerState.folders, remoteFolders);
  const folderIds = new Set(mergedFolders.map((folder) => folder.id));
  const mergedSets = mergeCollections(
    localOwnerState.sets,
    remoteSets.map((setItem) => ({
      ...setItem,
      folderId: setItem.folderId && folderIds.has(setItem.folderId) ? setItem.folderId : null,
    })),
  ).map((setItem) => ({
    ...setItem,
    folderId: setItem.folderId && folderIds.has(setItem.folderId) ? setItem.folderId : null,
  }));

  const remoteProgressSource =
    snapshot.progress?.setProgress && typeof snapshot.progress.setProgress === "object"
      ? snapshot.progress.setProgress
      : {};
  const mergedProgress = {
    ...localOwnerState.progressByUser[SINGLE_USER_ID].setProgress,
  };

  Object.entries(remoteProgressSource).forEach(([setId, rawProgress]) => {
    const sanitized = getSetProgress(
      {
        progressByUser: {
          temp: {
            setProgress: {
              [setId]: rawProgress,
            },
          },
        },
      },
      "temp",
      setId,
    );

    mergedProgress[setId] = mergeProgressEntry(mergedProgress[setId], sanitized);
  });

  return {
    currentUserId: SINGLE_USER_ID,
    users: [
      createUser(snapshot.user?.name || localOwnerState.users[0]?.name || "Sully"),
    ],
    folders: mergedFolders,
    sets: mergedSets,
    progressByUser: {
      [SINGLE_USER_ID]: {
        setProgress: mergedProgress,
        dailyGoal:
          snapshot.progress?.dailyGoal ??
          localOwnerState.progressByUser[SINGLE_USER_ID].dailyGoal ??
          20,
      },
    },
  };
}

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
  const rawProgress = userProgress.setProgress[setId] ?? {};
  const legacyReviewSession =
    rawProgress.reviewSession ?? rawProgress.learnSession ?? null;

  return {
    completedCardIds: Array.isArray(rawProgress.completedCardIds)
      ? rawProgress.completedCardIds
      : [],
    flaggedCardIds: Array.isArray(rawProgress.flaggedCardIds)
      ? rawProgress.flaggedCardIds
      : [],
    reviewSession: sanitizeReviewSession(legacyReviewSession),
    quizSession: sanitizeQuizSession(rawProgress.quizSession),
    stats: {
      totalKnown: rawProgress.stats?.totalKnown ?? 0,
      totalUnknown: rawProgress.stats?.totalUnknown ?? 0,
    },
  };
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

function createUser(name, email = "owner@sullys-grand-flashcards.local") {
  return {
    id: SINGLE_USER_ID,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
}

export const useAppStore = create((set, get) => ({
  ...initialState,
  unlockApp: async ({ password }) => {
    if (password !== SINGLE_USER_PASSWORD) {
      throw new Error("That password is not correct.");
    }

    let nextLocalState = adoptExistingLocalState(get());
    if (!nextLocalState.sets.length && !nextLocalState.folders.length) {
      const owner = createUser("Sully");
      const starter = createStarterContent(owner.id);
      nextLocalState = {
        ...nextLocalState,
        users: [owner],
        folders: starter.folders.map(normalizeFolder),
        sets: starter.sets.map(normalizeSetItem),
      };
    }

    set((current) => ({
      ...current,
      ...nextLocalState,
    }));

    await get().restoreOwnerState();
  },
  restoreOwnerState: async () => {
    if (get().currentUserId !== SINGLE_USER_ID) {
      return;
    }

    try {
      const remoteSnapshot = await fetchOwnerState();
      if (!remoteSnapshot) {
        await saveOwnerState(extractOwnerSnapshot(get()));
        return;
      }

      set((current) => ({
        ...current,
        ...mergeOwnerSnapshotIntoState(current, remoteSnapshot),
      }));

      await saveOwnerState(extractOwnerSnapshot(get()));
    } catch (error) {
      set((state) => ({
        ui: {
          ...state.ui,
          notices: [
            ...state.ui.notices.filter((notice) => notice.id !== "sync-warning"),
            {
              id: "sync-warning",
              type: "warning",
              message: `Sync warning: ${error instanceof Error ? error.message : "this device is using its local saved copy right now."}`,
            },
          ],
        },
      }));
    }
  },
  logOut: () =>
    set({
      currentUserId: null,
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
              reviewSession: current.reviewSession
                ? {
                    ...current.reviewSession,
                    queue: current.reviewSession.queue.filter((cardId) =>
                      cards.some((card) => card.id === cardId),
                    ),
                    completedCardIds: current.reviewSession.completedCardIds.filter((cardId) =>
                        cards.some((card) => card.id === cardId),
                      ),
                    currentCardId: cards.some(
                      (card) => card.id === current.reviewSession.currentCardId,
                    )
                      ? current.reviewSession.currentCardId
                      : current.reviewSession.queue[0] ?? null,
                  }
                : null,
              quizSession: current.quizSession
                ? {
                    ...current.quizSession,
                    queue: current.quizSession.queue.filter((cardId) =>
                      cards.some((card) => card.id === cardId),
                    ),
                    completedCardIds: current.quizSession.completedCardIds.filter((cardId) =>
                      cards.some((card) => card.id === cardId),
                    ),
                    currentCardId: cards.some(
                      (card) => card.id === current.quizSession.currentCardId,
                    )
                      ? current.quizSession.currentCardId
                      : current.quizSession.queue[0] ?? null,
                    options: current.quizSession.options.filter(Boolean),
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
          reviewSession: current.reviewSession
            ? {
                ...current.reviewSession,
                completedCardIds: current.reviewSession.completedCardIds.filter(
                  (id) => id !== cardId,
                ),
                queue: current.reviewSession.queue.includes(cardId)
                  ? current.reviewSession.queue
                  : [...current.reviewSession.queue, cardId],
                currentCardId: current.reviewSession.currentCardId ?? cardId,
              }
            : current.reviewSession,
          quizSession: current.quizSession
            ? {
                ...current.quizSession,
                completedCardIds: current.quizSession.completedCardIds.filter(
                  (id) => id !== cardId,
                ),
                queue: current.quizSession.queue.includes(cardId)
                  ? current.quizSession.queue
                  : [...current.quizSession.queue, cardId],
                currentCardId: current.quizSession.currentCardId ?? cardId,
              }
            : current.quizSession,
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
          reviewSession: null,
          quizSession: null,
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
  startFlashcardSession: (setId, options = {}) =>
    set((state) => {
      const userId = state.currentUserId;
      const studySet = state.sets.find((item) => item.id === setId);
      if (!studySet) {
        return state;
      }

      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          reviewSession: createLearnSession(studySet.cards, {
            setId,
            infiniteMode: options.infiniteMode,
            shuffle: Boolean(options.shuffle),
          }),
        })),
      };
    }),
  resumeFlashcardSession: (setId, infiniteMode) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          reviewSession: current.reviewSession
            ? {
                ...current.reviewSession,
                infiniteMode:
                  infiniteMode ?? current.reviewSession.infiniteMode ?? false,
              }
            : current.reviewSession,
        })),
      };
    }),
  revealFlashcardAnswer: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          reviewSession: current.reviewSession
            ? revealLearnAnswer(current.reviewSession)
            : current.reviewSession,
        })),
      };
    }),
  answerFlashcardCard: (setId, result) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => {
          if (!current.reviewSession) {
            return current;
          }

          const nextSession = answerLearnCard(current.reviewSession, result);
          return {
            ...current,
            completedCardIds: nextSession.infiniteMode
              ? current.completedCardIds
              : nextSession.completedCardIds,
            reviewSession: nextSession,
            stats: {
              totalKnown: current.stats.totalKnown + (result === "know" ? 1 : 0),
              totalUnknown:
                current.stats.totalUnknown + (result === "dontKnow" ? 1 : 0),
            },
          };
        }),
      };
    }),
  undoFlashcardAnswer: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => {
          if (!current.reviewSession) {
            return current;
          }

          const restored = undoLearnAnswer(current.reviewSession);
          return {
            ...current,
            completedCardIds: restored.completedCardIds,
            reviewSession: restored,
          };
        }),
      };
    }),
  toggleFlashcardShuffle: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          reviewSession: current.reviewSession
            ? toggleReviewShuffle(current.reviewSession)
            : current.reviewSession,
        })),
      };
    }),
  startLearnSession: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      const studySet = state.sets.find((item) => item.id === setId);
      if (!studySet) {
        return state;
      }

      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          quizSession: createQuizSession(studySet.cards, { setId }),
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
  resumeLearnSession: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          quizSession: current.quizSession ?? null,
        })),
      };
    }),
  answerLearnCard: (setId, selectedAnswer) =>
    set((state) => {
      const userId = state.currentUserId;
      const studySet = state.sets.find((item) => item.id === setId);
      if (!studySet) {
        return state;
      }

      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => {
          if (!current.quizSession) {
            return current;
          }

          const currentCard = studySet.cards.find(
            (card) => card.id === current.quizSession.currentCardId,
          );
          const isCorrect = selectedAnswer === currentCard?.back;
          const nextSession = answerQuizQuestion(
            current.quizSession,
            studySet.cards,
            selectedAnswer,
          );

          return {
            ...current,
            completedCardIds: nextSession.completedCardIds,
            quizSession: nextSession,
            stats: {
              totalKnown: current.stats.totalKnown + (isCorrect ? 1 : 0),
              totalUnknown: current.stats.totalUnknown + (isCorrect ? 0 : 1),
            },
          };
        }),
      };
    }),
  undoLearnAnswer: (setId) =>
    set((state) => {
      const userId = state.currentUserId;
      return {
        progressByUser: withSetProgress(state, userId, setId, (current) => ({
          ...current,
          quizSession: current.quizSession
            ? undoQuizAnswer(current.quizSession)
            : current.quizSession,
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

    if (!progress.reviewSession) {
      get().startFlashcardSession(setId, { shuffle: false });
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

  if (state.currentUserId !== SINGLE_USER_ID) {
    return;
  }

  if (remoteSaveTimer) {
    clearTimeout(remoteSaveTimer);
  }

  remoteSaveTimer = setTimeout(() => {
    const latestState = useAppStore.getState();
    if (latestState.currentUserId !== SINGLE_USER_ID) {
      return;
    }

    saveOwnerState(extractOwnerSnapshot(latestState)).catch(() => {
      // Local persistence still works even if remote sync is temporarily unavailable.
    });
  }, 500);
});

document.documentElement.classList.toggle(
  "dark",
  initialState.ui.theme === "dark",
);
