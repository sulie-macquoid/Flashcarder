import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Flag,
  Maximize,
  Minimize,
  Pencil,
  RotateCcw,
  RefreshCcw,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import CardEditor from "../components/CardEditor";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useAppStore } from "../store/useAppStore";
import {
  getLearnCompletion,
  getQuizCompletion,
  isLearnComplete,
  isQuizComplete,
} from "../utils/session";
import { generateId } from "../utils/helpers";

function accuracy(stats) {
  const correct = stats.correct ?? stats.known ?? 0;
  return stats.answered ? Math.round((correct / stats.answered) * 100) : 0;
}

function normalizeStudyProgress(rawProgress) {
  const rawReviewSession =
    rawProgress?.reviewSession && typeof rawProgress.reviewSession === "object"
      ? rawProgress.reviewSession
      : rawProgress?.learnSession && typeof rawProgress.learnSession === "object"
        ? rawProgress.learnSession
        : null;
  const reviewQueue = Array.isArray(rawReviewSession?.queue)
    ? rawReviewSession.queue.filter(Boolean)
    : [];
  const reviewCompletedCardIds = Array.isArray(rawReviewSession?.completedCardIds)
    ? rawReviewSession.completedCardIds.filter(Boolean)
    : [];
  const reviewCurrentCardId =
    typeof rawReviewSession?.currentCardId === "string" && rawReviewSession.currentCardId
      ? rawReviewSession.currentCardId
      : reviewQueue[0] ?? null;
  const rawQuizSession =
    rawProgress?.quizSession && typeof rawProgress.quizSession === "object"
      ? rawProgress.quizSession
      : null;
  const quizQueue = Array.isArray(rawQuizSession?.queue)
    ? rawQuizSession.queue.filter(Boolean)
    : [];
  const quizCompletedCardIds = Array.isArray(rawQuizSession?.completedCardIds)
    ? rawQuizSession.completedCardIds.filter(Boolean)
    : [];
  const quizCurrentCardId =
    typeof rawQuizSession?.currentCardId === "string" && rawQuizSession.currentCardId
      ? rawQuizSession.currentCardId
      : quizQueue[0] ?? null;

  return {
    completedCardIds: Array.isArray(rawProgress?.completedCardIds)
      ? rawProgress.completedCardIds
      : [],
    flaggedCardIds: Array.isArray(rawProgress?.flaggedCardIds)
      ? rawProgress.flaggedCardIds
      : [],
    reviewSession: rawReviewSession
      ? {
          ...rawReviewSession,
          originalOrder: Array.isArray(rawReviewSession.originalOrder)
            ? rawReviewSession.originalOrder.filter(Boolean)
            : [...reviewQueue],
          queue: reviewQueue,
          completedCardIds: reviewCompletedCardIds,
          currentCardId: reviewCurrentCardId,
          revealed: Boolean(rawReviewSession.revealed),
          shuffled: Boolean(rawReviewSession.shuffled),
          infiniteMode: Boolean(rawReviewSession.infiniteMode),
          stats: {
            answered: rawReviewSession.stats?.answered ?? 0,
            known: rawReviewSession.stats?.known ?? 0,
            unknown: rawReviewSession.stats?.unknown ?? 0,
          },
          history: Array.isArray(rawReviewSession.history) ? rawReviewSession.history : [],
        }
      : null,
    quizSession: rawQuizSession
      ? {
          ...rawQuizSession,
          queue: quizQueue,
          completedCardIds: quizCompletedCardIds,
          currentCardId: quizCurrentCardId,
          options: Array.isArray(rawQuizSession.options)
            ? rawQuizSession.options.filter(Boolean)
            : [],
          lastResult:
            rawQuizSession.lastResult === "correct" || rawQuizSession.lastResult === "wrong"
              ? rawQuizSession.lastResult
              : null,
          stats: {
            answered: rawQuizSession.stats?.answered ?? 0,
            correct: rawQuizSession.stats?.correct ?? 0,
            wrong: rawQuizSession.stats?.wrong ?? 0,
          },
          history: Array.isArray(rawQuizSession.history) ? rawQuizSession.history : [],
        }
      : null,
    stats: {
      totalKnown: rawProgress?.stats?.totalKnown ?? 0,
      totalUnknown: rawProgress?.stats?.totalUnknown ?? 0,
    },
  };
}

export default function StudyPage() {
  const navigate = useNavigate();
  const { setId } = useParams();
  const currentUserId = useAppStore((state) => state.currentUserId);
  const sets = useAppStore((state) => state.sets);
  const progressByUser = useAppStore((state) => state.progressByUser);
  const hydrateStudyModes = useAppStore((state) => state.hydrateStudyModes);
  const markSetStudied = useAppStore((state) => state.markSetStudied);
  const startFlashcardSession = useAppStore((state) => state.startFlashcardSession);
  const resumeFlashcardSession = useAppStore((state) => state.resumeFlashcardSession);
  const revealFlashcardAnswer = useAppStore((state) => state.revealFlashcardAnswer);
  const answerFlashcardCard = useAppStore((state) => state.answerFlashcardCard);
  const undoFlashcardAnswer = useAppStore((state) => state.undoFlashcardAnswer);
  const toggleFlashcardShuffle = useAppStore((state) => state.toggleFlashcardShuffle);
  const startLearnSession = useAppStore((state) => state.startLearnSession);
  const resumeLearnSession = useAppStore((state) => state.resumeLearnSession);
  const answerLearn = useAppStore((state) => state.answerLearnCard);
  const undoLearn = useAppStore((state) => state.undoLearnAnswer);
  const resetCardProgress = useAppStore((state) => state.resetCardProgress);
  const toggleFlagCard = useAppStore((state) => state.toggleFlagCard);
  const saveSet = useAppStore((state) => state.saveSet);
  const studySet = useMemo(
    () => sets.find((item) => item.id === setId) ?? null,
    [setId, sets],
  );
  const progress = useMemo(
    () => normalizeStudyProgress(progressByUser[currentUserId]?.setProgress?.[setId]),
    [currentUserId, progressByUser, setId],
  );

  const [mode, setMode] = useState("flashcards");
  const [editOpen, setEditOpen] = useState(false);
  const [infiniteMode, setInfiniteMode] = useState(progress.reviewSession?.infiniteMode ?? false);
  const [editableCards, setEditableCards] = useState(studySet?.cards ?? []);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    if (!studySet) {
      return;
    }
    hydrateStudyModes(studySet.id);
    markSetStudied(studySet.id);
  }, [hydrateStudyModes, markSetStudied, studySet]);

  useEffect(() => {
    if (studySet) {
      setEditableCards(studySet.cards);
    }
  }, [studySet]);

  const flashcardSession = progress.reviewSession;
  const quizSession = progress.quizSession;
  const hasValidFlashcardSession =
    Boolean(flashcardSession?.currentCardId) &&
    Array.isArray(flashcardSession?.queue) &&
    Array.isArray(flashcardSession?.completedCardIds);
  const hasValidQuizSession =
    Boolean(quizSession?.currentCardId) &&
    Array.isArray(quizSession?.options) &&
    Array.isArray(quizSession?.queue) &&
    Array.isArray(quizSession?.completedCardIds);

  useEffect(() => {
    if (mode === "learn" && !hasValidQuizSession && studySet) {
      startLearnSession(setId);
    }
  }, [hasValidQuizSession, mode, setId, startLearnSession, studySet]);

  const flashcardCard = useMemo(() => {
    if (!studySet || !flashcardSession?.currentCardId) {
      return null;
    }
    return (
      studySet.cards.find((card) => card.id === flashcardSession.currentCardId) ?? null
    );
  }, [flashcardSession, studySet]);

  const learnCard = useMemo(() => {
    if (!studySet || !quizSession?.currentCardId) {
      return null;
    }
    return studySet.cards.find((card) => card.id === quizSession.currentCardId) ?? null;
  }, [quizSession, studySet]);

  function toggleFocusMode() {
    setIsFocusMode((current) => !current);
  }

  useKeyboardShortcuts(
    {
      " ": () => {
        if (mode === "flashcards") {
          if (flashcardSession && !flashcardSession.revealed) {
            revealFlashcardAnswer(setId);
          }
        }
      },
      ArrowLeft: () => {
        if (mode === "flashcards" && flashcardSession?.revealed) {
          answerFlashcardCard(setId, "dontKnow");
        }
      },
      ArrowRight: () => {
        if (mode === "flashcards" && flashcardSession?.revealed) {
          answerFlashcardCard(setId, "know");
        }
      },
      f: () => {
        toggleFocusMode();
      },
      F: () => {
        toggleFocusMode();
      },
    },
    Boolean(studySet),
  );

  if (!studySet) {
    return (
      <EmptyState
        title="Set not found"
        description="This deck may have been deleted."
        action={
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full bg-[var(--primary)] px-5 py-3 font-semibold text-white"
          >
            Return home
          </button>
        }
      />
    );
  }

  return (
    <div className={`space-y-5 ${isFocusMode ? "mx-auto max-w-6xl" : ""}`}>
      <div className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
            <h2 className="mt-3 text-3xl font-semibold">{studySet.title}</h2>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              {studySet.description || "Study with classic flashcards or adaptive learn mode."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("learn");
                if (!hasValidQuizSession) {
                  startLearnSession(setId);
                }
              }}
              className={`rounded-full px-5 py-3 font-medium ${
                mode === "learn" ? "bg-[var(--secondary)] text-white" : "border border-[var(--border)]"
              }`}
            >
              Learn mode
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("flashcards");
                if (!flashcardSession) {
                  startFlashcardSession(setId, { infiniteMode });
                }
              }}
              className={`rounded-full px-5 py-3 font-medium ${
                mode === "flashcards" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)]"
              }`}
            >
              Flashcards
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-medium"
            >
              <Pencil size={16} />
              Edit during study
            </button>
            <button
              type="button"
              onClick={toggleFocusMode}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-medium"
            >
              {isFocusMode ? <Minimize size={16} /> : <Maximize size={16} />}
              {isFocusMode ? "Exit focus mode" : "Focus mode"}
            </button>
          </div>
        </div>
      </div>

      <div className={`grid gap-5 ${isFocusMode ? "mx-auto max-w-5xl" : "xl:grid-cols-[minmax(0,1fr)_21rem]"}`}>
        <section className={`space-y-5 ${isFocusMode ? "mx-auto w-full max-w-5xl" : ""}`}>
          {mode === "flashcards" ? (
            <div className="glass-panel rounded-[2rem] p-5">
              {flashcardCard && hasValidFlashcardSession ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--muted)]">
                        {flashcardSession.completedCardIds.length} known,{" "}
                        {flashcardSession.queue.length} still in this review cycle
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => toggleFlashcardShuffle(setId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                      >
                        {flashcardSession.shuffled ? "Unshuffle" : "Shuffle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => resumeFlashcardSession(setId, infiniteMode)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                      >
                        <RefreshCcw size={16} />
                        Keep current session
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Restart this flashcard review from the beginning?")) {
                            startFlashcardSession(setId, { infiniteMode, shuffle: false });
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                      >
                        <RotateCcw size={16} />
                        Restart
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => revealFlashcardAnswer(setId)}
                    className={`relative block w-full rounded-[2.2rem] bg-transparent text-left ${flashcardSession.revealed ? "is-flipped" : ""} card-flip ${isFocusMode ? "min-h-[34rem]" : "min-h-[24rem]"}`}
                  >
                    <div className="card-face absolute inset-0 rounded-[2.2rem] bg-[var(--primary)] p-8 text-white">
                      <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                        Front
                      </p>
                      <div className="mt-8 text-3xl font-semibold leading-tight">
                        {flashcardCard.front}
                      </div>
                      {flashcardCard.imageUrl ? (
                        <img
                          src={flashcardCard.imageUrl}
                          alt=""
                          className={`mt-6 rounded-2xl object-cover ${isFocusMode ? "max-h-72" : "max-h-56"}`}
                        />
                      ) : null}
                      <p className="absolute bottom-8 text-sm text-white/70">
                        Press Space to flip, F for focus mode
                      </p>
                    </div>
                    <div className="card-face back absolute inset-0 rounded-[2.2rem] bg-[var(--secondary)] p-8 text-white">
                      <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                        Back
                      </p>
                      <div className="mt-8 text-3xl font-semibold leading-tight">
                        {flashcardCard.back}
                      </div>
                    </div>
                  </button>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {!flashcardSession.revealed ? (
                      <button
                        type="button"
                        onClick={() => revealFlashcardAnswer(setId)}
                        className="rounded-full bg-[var(--secondary)] px-6 py-4 text-lg font-semibold text-white"
                      >
                        Show answer
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => answerFlashcardCard(setId, "dontKnow")}
                          className="rounded-full bg-red-600 px-6 py-4 text-lg font-semibold text-white"
                        >
                          I Don&apos;t Know
                        </button>
                        <button
                          type="button"
                          onClick={() => answerFlashcardCard(setId, "know")}
                          className="rounded-full bg-[var(--success)] px-6 py-4 text-lg font-semibold text-white"
                        >
                          I Know
                        </button>
                        <button
                          type="button"
                          onClick={() => undoFlashcardAnswer(setId)}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-4 font-medium"
                        >
                          <RotateCcw size={16} />
                          Undo last answer
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Start flashcard review"
                  description="Flip a card, then rate yourself with I Know or I Don't Know. Missed cards will come back soon."
                  action={
                    <button
                      type="button"
                      onClick={() => startFlashcardSession(setId, { infiniteMode })}
                      className="rounded-full bg-[var(--primary)] px-5 py-3 font-semibold text-white"
                    >
                      Start flashcards
                    </button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-[2rem] p-5">
              {!hasValidQuizSession ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-semibold">Start learn quiz mode</h3>
                    <p className="mt-3 text-[var(--muted)]">
                      Answer multiple-choice questions built from the other flashcards in this set. Wrong answers repeat later.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startLearnSession(setId)}
                    className="rounded-full bg-[var(--secondary)] px-6 py-4 text-lg font-semibold text-white"
                  >
                    Start learn session
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold">Learn mode</h3>
                      <p className="mt-2 text-[var(--muted)]">
                        Quiz yourself with multiple choice. Wrong answers come back a few cards later.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => resumeLearnSession(setId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                      >
                        <RefreshCcw size={16} />
                        Keep current session
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Start over from a freshly shuffled queue?")) {
                            startLearnSession(setId);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                      >
                        <RotateCcw size={16} />
                        Restart session
                      </button>
                    </div>
                  </div>

                  <ProgressBar
                    value={getQuizCompletion(quizSession, studySet.cards.length)}
                    label="Session completion"
                  />

                  {learnCard ? (
                    <div className="soft-panel rounded-[2rem] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                            Prompt
                          </p>
                          <h4 className="mt-4 text-3xl font-semibold leading-tight">
                            {learnCard.front}
                          </h4>
                          <p className="mt-3 text-sm text-[var(--muted)]">
                            Choose the matching answer.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFlagCard(setId, learnCard.id)}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                              progress.flaggedCardIds.includes(learnCard.id)
                                ? "bg-[var(--primary)] text-white"
                                : "border border-[var(--border)]"
                            }`}
                          >
                            <Flag size={16} />
                            {progress.flaggedCardIds.includes(learnCard.id)
                              ? "Flagged"
                              : "Flag difficult"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Reset progress for just this card?")) {
                                resetCardProgress(setId, learnCard.id);
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                          >
                            <RotateCcw size={16} />
                            Reset card
                          </button>
                        </div>
                      </div>

                      {learnCard.imageUrl ? (
                        <img
                          src={learnCard.imageUrl}
                          alt=""
                          className={`mt-6 rounded-[1.5rem] object-cover ${isFocusMode ? "max-h-[26rem]" : "max-h-72"}`}
                        />
                      ) : null}

                      <div className="mt-8 grid gap-3 md:grid-cols-2">
                        {(quizSession.options ?? []).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => answerLearn(setId, option)}
                            className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 px-5 py-4 text-left font-medium transition hover:border-[var(--secondary)] hover:bg-white dark:bg-slate-950/30"
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => undoLearn(setId)}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-4 font-medium"
                        >
                          <RotateCcw size={16} />
                          Undo last answer
                        </button>
                        {quizSession.lastResult ? (
                          <div
                            className={`rounded-full px-4 py-3 text-sm font-semibold ${
                              quizSession.lastResult === "correct"
                                ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-100"
                                : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-100"
                            }`}
                          >
                            {quizSession.lastResult === "correct"
                              ? "Correct"
                              : "Wrong answer. That card will repeat soon."}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : isQuizComplete(quizSession) ? (
                    <EmptyState
                      title="Session complete"
                      description="You answered every card correctly enough to finish the learn quiz."
                      action={
                        <div className="flex flex-wrap justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => startLearnSession(setId)}
                            className="rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
                          >
                            Study again
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="rounded-full border border-[var(--border)] px-5 py-3 font-medium"
                          >
                            Back home
                          </button>
                        </div>
                      }
                    />
                  ) : null}
                </div>
              )}
            </div>
          )}
        </section>

        {!isFocusMode ? (
          <aside className="space-y-5">
          <div className="glass-panel rounded-[2rem] p-5">
            <h3 className="text-xl font-semibold">Session stats</h3>
            <div className="mt-5 grid gap-3">
              <div className="soft-panel rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Completed cards</p>
                <p className="mt-1 text-2xl font-semibold">
                  {progress.completedCardIds.length} / {studySet.cards.length}
                </p>
              </div>
              <div className="soft-panel rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Accuracy</p>
                <p className="mt-1 text-2xl font-semibold">
                  {accuracy(
                    mode === "learn"
                      ? quizSession?.stats ?? { answered: 0, correct: 0 }
                      : flashcardSession?.stats ?? { answered: 0, known: 0 },
                  )}%
                </p>
              </div>
              <div className="soft-panel rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Flagged cards</p>
                <p className="mt-1 text-2xl font-semibold">
                  {progress.flaggedCardIds.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5">
            <h3 className="text-xl font-semibold">Current deck details</h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li>{studySet.cards.length} total cards</li>
              <li>{studySet.tags.length ? studySet.tags.join(", ") : "No tags"}</li>
              <li>Progress is saved automatically after each action</li>
              <li>Reset actions never delete card content</li>
            </ul>
          </div>
          </aside>
        ) : null}
      </div>

      <Modal
        open={editOpen}
        title="Edit cards during study"
        description="Changes save directly to the set. Existing progress is kept where possible."
        onClose={() => setEditOpen(false)}
      >
        <div className="space-y-4">
          <CardEditor
            cards={editableCards}
            onChangeCard={(cardId, field, value) =>
              setEditableCards((current) =>
                current.map((card) =>
                  card.id === cardId ? { ...card, [field]: value } : card,
                ),
              )
            }
            onAddCard={() =>
              setEditableCards((current) => [
                ...current,
                { id: generateId("card"), front: "", back: "", imageUrl: "" },
              ])
            }
            onRemoveCard={(cardId) =>
              setEditableCards((current) => current.filter((card) => card.id !== cardId))
            }
          />
          <button
            type="button"
            onClick={() => {
              saveSet({
                ...studySet,
                cards: editableCards,
              });
              setEditOpen(false);
            }}
            className="rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
          >
            Save deck changes
          </button>
        </div>
      </Modal>
    </div>
  );
}
