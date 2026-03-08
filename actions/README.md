# Server Actions

Next.js `'use server'` actions that form the data-access layer between the UI and Supabase. Every exported function creates its own Supabase client via `@/lib/supabase/server`.

## players.ts

Player registration and stats management.

| Function | Description |
|---|---|
| `checkAliasAvailable(alias)` | Returns `true` if no player with that alias exists. |
| `registerPlayer(alias)` | Inserts a new player row and returns the `Player` object. |
| `getPlayerByAlias(alias)` | Looks up a player by alias. Returns `null` if not found. |
| `getPlayerById(id)` | Looks up a player by UUID. Returns `null` if not found. |
| `updatePlayerStats(playerId, isCorrect)` | Increments `total_questions_answered` (and `total_correct_answers` when correct). |

## questions.ts

Question CRUD and querying. Supports multiple question types: `multiple_choice`, `true_false`, `multiple_answer`, and `sequence`.

| Function | Description |
|---|---|
| `submitQuestion(data)` | Inserts a new question with a `questionType` and `questionStructure` (JSONB payload defining options or sequence items), plus optional tags. |
| `getAllTags()` | Aggregates all unique tags across every question. |
| `getRandomQuestions(count, tags?)` | Fetches non-flagged questions, optionally filtered by tags, shuffles them, and returns up to `count`. |
| `getQuestionById(id)` | Single-question lookup by UUID. |
| `flagQuestion(questionId, reason?)` | Marks a question as flagged so it is excluded from future quizzes. |
| `getQuestionCount()` | Returns the total number of non-flagged questions. |

## quiz.ts

Quiz session lifecycle: creation, lobby, gameplay, scoring, and cancellation.

| Function | Description |
|---|---|
| `createQuizSession(hostPlayerId)` | Creates a session with a unique 6-char lobby code (retries up to 10 times for uniqueness). |
| `getSessionByCode(code)` | Looks up a session by its lobby code (case-insensitive). |
| `getSessionById(id)` | Looks up a session by UUID. |
| `joinQuizSession(sessionId, playerId)` | Adds a player as a participant. Idempotent — returns existing record if already joined. |
| `getParticipants(sessionId)` | Returns all participants for a session with their player aliases (joined via FK). |
| `startQuiz(sessionId, questionIds)` | Transitions session to `in_progress`, sets the question list, and records `started_at`. |
| `nextQuestion(sessionId)` | Increments `current_question_index`. Auto-completes the session when all questions are done. |
| `submitAnswer(sessionId, questionId, playerId, selectedAnswer, selectedAnswerData?)` | Records an answer, evaluates correctness server-side using the question's `question_structure`, and updates the player's cumulative stats. Supports structured answer data (`SelectedAnswerData`) for multi-select and sequence question types. |
| `getAnswersForQuestion(sessionId, questionId)` | Returns all answers submitted for a specific question in a session. |
| `getPlayerAnswer(sessionId, questionId, playerId)` | Returns a single player's answer for a question, or `null`. |
| `getScoreboard()` | Global leaderboard of all players with at least one answer, sorted by accuracy then correct count. |
| `getSessionScoreboard(sessionId)` | Per-session leaderboard aggregated from that session's answers. |
| `cancelQuizSession(sessionId)` | Rolls back player stats for all answers in the session, then deletes the session (cascades to answers and participants). |
