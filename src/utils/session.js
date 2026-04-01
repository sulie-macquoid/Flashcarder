import {
  LEARN_REINSERT_RANGE,
  MAX_UNDO_HISTORY,
} from "./constants";
import { clamp, shuffleArray } from "./helpers";

function createReviewSnapshot(session) {
  return {
    queue: [...session.queue],
    completedCardIds: [...session.completedCardIds],
    currentCardId: session.currentCardId,
    revealed: session.revealed,
    stats: { ...session.stats },
  };
}

function insertWithinNextFewCards(queue, cardId) {
  const minOffset = LEARN_REINSERT_RANGE.min;
  const maxOffset = Math.min(LEARN_REINSERT_RANGE.max, queue.length + 1);
  const offset =
    Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  const insertIndex = clamp(offset - 1, 0, queue.length);
  const nextQueue = [...queue];
  nextQueue.splice(insertIndex, 0, cardId);
  return nextQueue;
}

export function createLearnSession(cards, options = {}) {
  const originalOrder = cards.map((card) => card.id);
  const orderedCards = options.shuffle ? shuffleArray(originalOrder) : originalOrder;
  const currentCardId = orderedCards[0] ?? null;

  return {
    setId: options.setId ?? null,
    infiniteMode: Boolean(options.infiniteMode),
    originalOrder,
    shuffled: Boolean(options.shuffle),
    queue: orderedCards,
    completedCardIds: [],
    currentCardId,
    revealed: false,
    stats: {
      answered: 0,
      known: 0,
      unknown: 0,
    },
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

export function toggleReviewShuffle(session) {
  if (!session.currentCardId) {
    return session;
  }

  const currentCardId = session.currentCardId;
  const remaining = session.queue.filter((cardId) => cardId !== currentCardId);
  const nextRemaining = session.shuffled
    ? session.originalOrder.filter(
        (cardId) =>
          cardId !== currentCardId &&
          remaining.includes(cardId) &&
          !session.completedCardIds.includes(cardId),
      )
    : shuffleArray(remaining);

  return {
    ...session,
    queue: [currentCardId, ...nextRemaining],
    currentCardId,
    revealed: false,
    shuffled: !session.shuffled,
    updatedAt: new Date().toISOString(),
  };
}

export function revealLearnAnswer(session) {
  return {
    ...session,
    revealed: true,
    updatedAt: new Date().toISOString(),
  };
}

export function answerLearnCard(session, result) {
  if (!session.currentCardId) {
    return session;
  }

  const queue = [...session.queue];
  const activeCardId = queue.shift();
  let nextQueue = queue;
  let nextCompleted = [...session.completedCardIds];
  const nextStats = {
    ...session.stats,
    answered: session.stats.answered + 1,
    known: session.stats.known + (result === "know" ? 1 : 0),
    unknown: session.stats.unknown + (result === "dontKnow" ? 1 : 0),
  };

  if (result === "know") {
    if (session.infiniteMode) {
      nextQueue = insertWithinNextFewCards(queue, activeCardId);
    } else {
      nextCompleted.push(activeCardId);
    }
  } else {
    nextQueue = insertWithinNextFewCards(queue, activeCardId);
  }

  const nextSession = {
    ...session,
    queue: nextQueue,
    completedCardIds: nextCompleted,
    currentCardId: nextQueue[0] ?? null,
    revealed: false,
    stats: nextStats,
    history: [...session.history, createReviewSnapshot(session)].slice(-MAX_UNDO_HISTORY),
    updatedAt: new Date().toISOString(),
  };

  return nextSession;
}

export function undoLearnAnswer(session) {
  const history = [...session.history];
  const previous = history.pop();
  if (!previous) {
    return session;
  }

  return {
    ...session,
    ...previous,
    history,
    updatedAt: new Date().toISOString(),
  };
}

export function getLearnCompletion(session, totalCards) {
  if (!totalCards) {
    return 0;
  }

  if (session.infiniteMode) {
    return session.stats.known
      ? Math.min((session.stats.known / totalCards) * 100, 100)
      : 0;
  }

  return (session.completedCardIds.length / totalCards) * 100;
}

export function isLearnComplete(session) {
  return !session.infiniteMode && session.queue.length === 0;
}

export function createFlashcardState(cards) {
  const order = cards.map((card) => card.id);

  return {
    order,
    index: 0,
    flipped: false,
    shuffle: false,
    updatedAt: new Date().toISOString(),
  };
}

export function toggleFlashcardShuffle(state) {
  const currentCardId = state.order[state.index] ?? null;
  const order = state.shuffle ? [...state.order].sort() : shuffleArray(state.order);
  const nextIndex = currentCardId ? Math.max(order.indexOf(currentCardId), 0) : 0;

  return {
    ...state,
    order,
    index: nextIndex,
    flipped: false,
    shuffle: !state.shuffle,
    updatedAt: new Date().toISOString(),
  };
}

export function moveFlashcard(state, direction) {
  const nextIndex = clamp(state.index + direction, 0, state.order.length - 1);
  return {
    ...state,
    index: nextIndex,
    flipped: false,
    updatedAt: new Date().toISOString(),
  };
}

function buildMultipleChoiceOptions(cards, currentCardId) {
  const currentCard = cards.find((card) => card.id === currentCardId);
  if (!currentCard) {
    return [];
  }

  const distractors = shuffleArray(
    cards
      .filter((card) => card.id !== currentCardId && card.back !== currentCard.back)
      .map((card) => card.back),
  ).slice(0, 3);

  return shuffleArray([currentCard.back, ...distractors]);
}

function createQuizSnapshot(session) {
  return {
    queue: [...session.queue],
    completedCardIds: [...session.completedCardIds],
    currentCardId: session.currentCardId,
    options: [...session.options],
    lastResult: session.lastResult,
    stats: { ...session.stats },
  };
}

export function createQuizSession(cards, options = {}) {
  const orderedCards = shuffleArray(cards.map((card) => card.id));
  const currentCardId = orderedCards[0] ?? null;

  return {
    setId: options.setId ?? null,
    queue: orderedCards,
    completedCardIds: [],
    currentCardId,
    options: buildMultipleChoiceOptions(cards, currentCardId),
    lastResult: null,
    stats: {
      answered: 0,
      correct: 0,
      wrong: 0,
    },
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

export function answerQuizQuestion(session, cards, selectedAnswer) {
  if (!session.currentCardId) {
    return session;
  }

  const activeCard = cards.find((card) => card.id === session.currentCardId);
  if (!activeCard) {
    return session;
  }

  const queue = [...session.queue];
  const activeCardId = queue.shift();
  const isCorrect = selectedAnswer === activeCard.back;
  let nextQueue = queue;
  let nextCompleted = [...session.completedCardIds];

  if (isCorrect) {
    nextCompleted.push(activeCardId);
  } else {
    nextQueue = insertWithinNextFewCards(queue, activeCardId);
  }

  const nextCurrentCardId = nextQueue[0] ?? null;

  return {
    ...session,
    queue: nextQueue,
    completedCardIds: nextCompleted,
    currentCardId: nextCurrentCardId,
    options: buildMultipleChoiceOptions(cards, nextCurrentCardId),
    lastResult: isCorrect ? "correct" : "wrong",
    stats: {
      answered: session.stats.answered + 1,
      correct: session.stats.correct + (isCorrect ? 1 : 0),
      wrong: session.stats.wrong + (isCorrect ? 0 : 1),
    },
    history: [...session.history, createQuizSnapshot(session)].slice(-MAX_UNDO_HISTORY),
    updatedAt: new Date().toISOString(),
  };
}

export function undoQuizAnswer(session) {
  const history = [...session.history];
  const previous = history.pop();
  if (!previous) {
    return session;
  }

  return {
    ...session,
    ...previous,
    history,
    updatedAt: new Date().toISOString(),
  };
}

export function getQuizCompletion(session, totalCards) {
  if (!totalCards) {
    return 0;
  }

  return (session.completedCardIds.length / totalCards) * 100;
}

export function isQuizComplete(session) {
  return session.queue.length === 0;
}
