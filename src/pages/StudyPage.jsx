import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Flag,
  Maximize,
  Minimize,
  Pencil,
  RefreshCcw,
  RotateCcw,
  Shuffle,
  StepBack,
  StepForward,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import CardEditor from "../components/CardEditor";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useAppStore } from "../store/useAppStore";
import { getLearnCompletion, isLearnComplete } from "../utils/session";
import { generateId } from "../utils/helpers";

function accuracy(stats) {
  return stats.answered ? Math.round((stats.known / stats.answered) * 100) : 0;
}

export default function StudyPage() {
  const navigate = useNavigate();
  const { setId } = useParams();
  const studyShellRef = useRef(null);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const sets = useAppStore((state) => state.sets);
  const progressByUser = useAppStore((state) => state.progressByUser);
  const hydrateStudyModes = useAppStore((state) => state.hydrateStudyModes);
  const initFlashcardMode = useAppStore((state) => state.initFlashcardMode);
  const flipFlashcard = useAppStore((state) => state.flipFlashcard);
  const moveFlashcard = useAppStore((state) => state.moveFlashcard);
  const toggleFlashcardShuffle = useAppStore((state) => state.toggleFlashcardShuffle);
  const startLearnSession = useAppStore((state) => state.startLearnSession);
  const resumeLearnSession = useAppStore((state) => state.resumeLearnSession);
  const revealLearn = useAppStore((state) => state.revealLearnAnswer);
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
    () =>
      progressByUser[currentUserId]?.setProgress?.[setId] ?? {
        completedCardIds: [],
        flaggedCardIds: [],
        learnSession: null,
        flashcardState: null,
        stats: {
          totalKnown: 0,
          totalUnknown: 0,
        },
      },
    [currentUserId, progressByUser, setId],
  );

  const [mode, setMode] = useState("learn");
  const [editOpen, setEditOpen] = useState(false);
  const [infiniteMode, setInfiniteMode] = useState(progress.learnSession?.infiniteMode ?? false);
  const [editableCards, setEditableCards] = useState(studySet?.cards ?? []);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!studySet) {
      return;
    }
    hydrateStudyModes(studySet.id);
  }, [hydrateStudyModes, studySet]);

  useEffect(() => {
    if (studySet) {
      setEditableCards(studySet.cards);
    }
  }, [studySet]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const flashcardState = progress.flashcardState;
  const learnSession = progress.learnSession;

  const flashcardCard = useMemo(() => {
    if (!studySet || !flashcardState) {
      return null;
    }
    const cardId = flashcardState.order[flashcardState.index];
    return studySet.cards.find((card) => card.id === cardId) ?? null;
  }, [flashcardState, studySet]);

  const learnCard = useMemo(() => {
    if (!studySet || !learnSession?.currentCardId) {
      return null;
    }
    return studySet.cards.find((card) => card.id === learnSession.currentCardId) ?? null;
  }, [learnSession, studySet]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (studyShellRef.current?.requestFullscreen) {
        await studyShellRef.current.requestFullscreen();
      }
    } catch {
      // If fullscreen is blocked by the browser, the study page still works normally.
    }
  }

  useKeyboardShortcuts(
    {
      " ": () => {
        if (mode === "flashcards") {
          flipFlashcard(setId);
        } else if (mode === "learn" && learnSession) {
          if (!learnSession.revealed) {
            revealLearn(setId);
          }
        }
      },
      ArrowLeft: () => {
        if (mode === "flashcards") {
          moveFlashcard(setId, -1);
        } else if (mode === "learn" && learnSession?.revealed) {
          answerLearn(setId, "dontKnow");
        }
      },
      ArrowRight: () => {
        if (mode === "flashcards") {
          moveFlashcard(setId, 1);
        } else if (mode === "learn" && learnSession?.revealed) {
          answerLearn(setId, "know");
        }
      },
      f: () => {
        toggleFullscreen();
      },
      F: () => {
        toggleFullscreen();
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
    <div
      ref={studyShellRef}
      className={`space-y-5 ${isFullscreen ? "min-h-screen overflow-y-auto bg-[var(--bg)] p-4 sm:p-6" : ""}`}
    >
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
              onClick={() => setMode("learn")}
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
                if (!flashcardState) {
                  initFlashcardMode(setId);
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
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-medium"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="space-y-5">
          {mode === "flashcards" ? (
            <div className="glass-panel rounded-[2rem] p-5">
              {flashcardCard && flashcardState ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--muted)]">
                        Card {flashcardState.index + 1} of {flashcardState.order.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFlashcardShuffle(setId)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                    >
                      <Shuffle size={16} />
                      {flashcardState.shuffle ? "Unshuffle" : "Shuffle"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => flipFlashcard(setId)}
                    className={`relative block min-h-[24rem] w-full rounded-[2.2rem] bg-transparent text-left ${flashcardState.flipped ? "is-flipped" : ""} card-flip`}
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
                          className="mt-6 max-h-56 rounded-2xl object-cover"
                        />
                      ) : null}
                      <p className="absolute bottom-8 text-sm text-white/70">
                        Press Space to flip, F for fullscreen
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
                    <button
                      type="button"
                      onClick={() => moveFlashcard(setId, -1)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-medium"
                    >
                      <StepBack size={16} />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => flipFlashcard(setId)}
                      className="rounded-full bg-[var(--secondary)] px-5 py-3 font-semibold text-white"
                    >
                      Flip card
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFlashcard(setId, 1)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-medium"
                    >
                      Next
                      <StepForward size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No flashcards loaded yet"
                  description="Start flashcard mode to initialize the card order."
                  action={
                    <button
                      type="button"
                      onClick={() => initFlashcardMode(setId)}
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
              {!learnSession ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-semibold">Start adaptive learn mode</h3>
                    <p className="mt-3 text-[var(--muted)]">
                      Cards you know leave the queue. Cards you miss are reinserted
                      a few cards later for quick reinforcement.
                    </p>
                  </div>
                  <label className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-4">
                    <div>
                      <p className="font-medium">Infinite mode</p>
                      <p className="text-sm text-[var(--muted)]">
                        Keep cards cycling instead of fully disappearing.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={infiniteMode}
                      onChange={(event) => setInfiniteMode(event.target.checked)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => startLearnSession(setId, { infiniteMode })}
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
                        Resume picks up right where you stopped. Shortcuts: Space to
                        reveal, Left for Don&apos;t Know, Right for Know.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => resumeLearnSession(setId, infiniteMode)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                      >
                        <RefreshCcw size={16} />
                        Keep current session
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Start over from a freshly shuffled queue?")) {
                            startLearnSession(setId, { infiniteMode });
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
                    value={getLearnCompletion(learnSession, studySet.cards.length)}
                    label="Session completion"
                  />

                  {learnCard ? (
                    <div className="soft-panel rounded-[2rem] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                            {learnSession.revealed ? "Answer" : "Prompt"}
                          </p>
                          <h4 className="mt-4 text-3xl font-semibold leading-tight">
                            {learnSession.revealed ? learnCard.back : learnCard.front}
                          </h4>
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
                          className="mt-6 max-h-72 rounded-[1.5rem] object-cover"
                        />
                      ) : null}

                      <div className="mt-8 flex flex-wrap gap-3">
                        {!learnSession.revealed ? (
                          <button
                            type="button"
                            onClick={() => revealLearn(setId)}
                            className="rounded-full bg-[var(--secondary)] px-6 py-4 text-lg font-semibold text-white"
                          >
                            Show answer
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => answerLearn(setId, "dontKnow")}
                              className="rounded-full bg-red-600 px-6 py-4 text-lg font-semibold text-white"
                            >
                              I Don&apos;t Know
                            </button>
                            <button
                              type="button"
                              onClick={() => answerLearn(setId, "know")}
                              className="rounded-full bg-[var(--success)] px-6 py-4 text-lg font-semibold text-white"
                            >
                              I Know
                            </button>
                            <button
                              type="button"
                              onClick={() => undoLearn(setId)}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-4 font-medium"
                            >
                              <RotateCcw size={16} />
                              Undo last answer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : isLearnComplete(learnSession) ? (
                    <EmptyState
                      title="Session complete"
                      description="Every card was marked as known. You can restart, switch to infinite mode, or head back to the dashboard."
                      action={
                        <div className="flex flex-wrap justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => startLearnSession(setId, { infiniteMode: false })}
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
                  {accuracy(learnSession?.stats ?? { answered: 0, known: 0 })}%
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
