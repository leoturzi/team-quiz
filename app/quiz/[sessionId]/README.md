# Quiz Session Page (`/quiz/[sessionId]`)

This page is the **in-game experience** for a quiz session. Players arrive here after the host starts the quiz from the lobby. It handles the full game flow: displaying questions, collecting answers, showing results, and completing the session.

## Table of Contents

- [How to Get Here](#how-to-get-here)
- [Game Flow Overview](#game-flow-overview)
- [Timer](#timer)
- [Realtime Synchronization](#realtime-synchronization)
- [Participant Experience](#participant-experience)
- [Host Controls](#host-controls)
- [Answer Submission & Results](#answer-submission--results)
- [Session Completion](#session-completion)
- [Cancel Session](#cancel-session)
- [Key Dependencies](#key-dependencies)

---

## How to Get Here

- **Host**: Starts the quiz from the lobby (`/lobby/[code]`) → redirects to `/quiz/[sessionId]`
- **Participants**: Realtime subscription detects `status: 'in_progress'` → lobby auto-redirects to `/quiz/[sessionId]`
- **Direct visit**: Requires a valid `quiz_player_id` in `localStorage`; otherwise redirects to home

---

## Game Flow Overview

1. **Load** → Session + current question + participants
2. **Subscribe** → Realtime updates for session, participants, answers
3. **Answer phase** → Player selects one of 4 shuffled options; timer counts down
4. **Results phase** → Triggered by: timer reaching 0 **or** all participants having answered
5. **Host advances** → Next question, or Finish Quiz on last question
6. **Completion** → Session scoreboard, links to global scoreboard and home

---

## Timer

- **Duration**: 60 seconds per question
- **Behavior**:
  - Starts when a new question is displayed
  - Pauses when `showResults` is true
  - At 0, automatically triggers results view
- **Visual feedback**:
  - `> 30s` → Secondary (neutral) badge
  - `≤ 30s` → Accent (warning) badge
  - `≤ 10s` → Destructive (urgent) badge
- **Implementation**: `setInterval` in a `useEffect`, cleared on unmount or when `showResults`/`currentQuestion` changes

---

## Realtime Synchronization

The page stays in sync across all participants via **Supabase Realtime** (`postgres_changes`). The store subscribes on mount and unsubscribes on unmount.

### Subscribed Tables

| Table | Events | What Gets Updated |
|-------|--------|-------------------|
| `quiz_sessions` | UPDATE, DELETE | `current_question_index`, `status`, session deletion (cancel) |
| `quiz_participants` | INSERT | New players joining (during lobby; rare mid-game) |
| `answers` | INSERT | New answer submissions from any participant |

### Flow

1. Realtime event → store cache is updated
2. Store `notify()` → `updateFromStore` runs
3. UI state is derived from store (session, question index, answers, participant count)

### What Realtime Drives

- **Question number** (`currentQuestionIndex`) — Host advances → all clients see the next question
- **Participant count** — From `quiz_participants` and cache
- **Answers count** (`X/Y answered`) — From `answers` table inserts
- **Cancel session** — Session DELETE → store clears cache → `getSessionById` returns null → redirect to home

---

## Participant Experience

### Header (All Players)

- **Question X of Y** — From `session.currentQuestionIndex` and `session.questionIds.length`
- **X/Y answered** — Live count from `answers` for current question vs `participantCount`
- **Timer badge** — Countdown with color states
- **Cancel Quiz** — Shown only to host

### Answer Phase

- 4 options, shuffled per question (different order per load)
- One tap = locked in; no changes after submit
- After answering: “Answer locked in! Waiting for other participants...”

### Results Phase

- Correct answer highlighted (green check)
- Wrong selected answer highlighted (red X)
- Bar showing answer distribution (count + %)
- **Flag Question** — For reporting issues (e.g. wrong answer, unclear wording)
- Non-host: “Waiting for host to continue...”

---

## Host Controls

| Control | When | Action |
|---------|------|--------|
| **Cancel Quiz** | Always (in header) | Opens confirmation; on confirm, cancels session and redirects all |
| **Next Question** | Results shown, not last question | Calls `store.nextQuestion(sessionId)` |
| **Finish Quiz** | Results shown, last question | Same `nextQuestion`; backend sets `status: 'completed'` |

## Answer Submission & Results

### Submission

- `store.submitAnswer()` writes to `answers` table
- Server updates player stats (`total_questions_answered`, `total_correct_answers`)
- Store refreshes answers for the question to update distribution

### When Results Appear

1. **Timer expires** (60s)
2. **All participants answered** (`answers.length >= participantCount`)

### Results UI

- Correct/incorrect styling
- Answer distribution bar (percentage of players per option)
- Count per option: `{count} ({percentage}%)`

---

## Session Completion

When `session.status === 'completed'`:

- Session scoreboard (ranked by correct answers)
- Player’s own stats (correct/total, accuracy %)
- Links: **View Global Scoreboard** (`/scoreboard`), **Return Home** (`/`)

---

## Cancel Session

- **Who**: Host only
- **Effect** (handled in `cancelQuizSession`):
  1. Rollback player stats for all answers in this session
  2. Delete session (cascades to answers and participants)
  3. Realtime DELETE on `quiz_sessions` → all clients’ store clears session → redirect to home

---

## Manage Questions

Question content is **fixed when the quiz starts** (chosen in the lobby with count and optional tag filter). During the game:

- **Host** advances with Next Question / Finish Quiz
- **No editing** of questions mid-game
- **Flag Question** allows reporting issues for later review

---

## Key Dependencies

| Dependency | Role |
|------------|------|
| `lib/store.ts` | Cache, `subscribeToSession()`, `subscribe()`, actions for session/answers |
| `lib/types.ts` | `QuizSession`, `Question`, `Answer`, `ScoreboardEntry`, etc. |
| `actions/quiz.ts` | Server actions: `nextQuestion`, `submitAnswer`, `cancelQuizSession`, etc. |
| `actions/questions.ts` | `getQuestionById`, `flagQuestion` |
| `lib/supabase/client.ts` | Supabase client for Realtime |
| `migrations/006_enable_realtime_filters.sql` | RLS + REPLICA IDENTITY for `quiz_sessions`, `quiz_participants`, `answers` |

---

## State Summary

| State | Purpose |
|-------|---------|
| `session` | Current session; null after cancel |
| `currentQuestion` | Active question object |
| `shuffledAnswers` | Shuffled options + correct index |
| `playerId` / `isHost` | Identity and role |
| `selectedAnswer` / `hasAnswered` | Answer status for current user |
| `showResults` | Whether results view is shown |
| `timeLeft` | Countdown (60 → 0) |
| `answers` | All answers for current question |
| `participantCount` | Total participants |
| `isAdvancing` | Guards Next Question / Finish Quiz against concurrent clicks |
| `displayedQuestionIndexRef` | Avoids re-shuffling when store updates for same question |
