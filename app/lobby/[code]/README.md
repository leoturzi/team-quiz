# Lobby Page Overview (`app/lobby/[code]/page.tsx`)

This page is the waiting room for a quiz session.  
Players join using a lobby code, see who is in the room, and wait for the host to start.

---

## What can happen on this page

- Users enter a lobby by code and are automatically added to the participant list.
- Everyone can see the lobby code and copy it to invite more people.
- Everyone can see live participant updates (join/leave/cancel/start transitions).
- If the session starts, users are redirected to the quiz session page.
- If the host cancels the session, users are redirected out of the lobby.
- If a session is invalid, already closed, or missing, the page shows an error state.

---

## What the host can do

- View all participants in real time.
- Choose how many questions to include in the quiz (between 5 and 30, default 10).
- Optionally filter questions by tag.
- Start the quiz when ready.
- Cancel the session (with confirmation dialog).

### Host and question submission behavior

When the host starts the quiz, the page:

1. Requests random questions from the question pool (`questionCount` + optional selected tags).
2. Validates there are enough questions available.
3. Submits the selected question IDs when calling `startSession(...)`.
4. Redirects the host to `/quiz/[sessionId]`.

If not enough questions are available, the host sees an error and can adjust count/tags.

---

## What an invitee can do

- Join the lobby and appear in the participant list.
- See who is host and who is "you" in the list.
- Copy and share the lobby code.
- Wait for the host to configure and start the quiz.
- Get automatically redirected to the quiz when it starts.

Invitees do **not** control quiz configuration, start, or cancellation.

---

## Session and realtime management (technical)

### Session bootstrap

- The page reads `quiz_player_id` and `quiz_alias` from `localStorage`.
- If missing, user is redirected to registration (`/register?redirect=join&code=...`).
- It attempts to resolve the session by lobby code:
  - First from local store cache (`store.getSessionByCode(code)`),
  - Then from server refresh (`store.refreshSessionByCode(code)`) if not cached.
- The page only allows `waiting` sessions for this lobby flow.

### Joining and identity handling

- If player is not already in the session, it calls `store.joinSession(sessionId, playerId, alias)`.
- If backend reports "Player not found", local player identity is cleared and registration is required again.

### Realtime sync model

- `store.subscribeToSession(sessionId)` subscribes to realtime events for this lobby.
- Realtime updates the central store cache.
- `store.subscribe(updateFromStore)` listens for store changes and refreshes UI state from cache.
- `updateFromStore` also handles navigation side effects:
  - Redirect to quiz when status becomes `in_progress`,
  - Redirect home if session disappears (e.g., host cancellation/deletion).

### Lifecycle and cleanup

- Subscriptions are created after initial load succeeds.
- On unmount, realtime/store subscriptions are unsubscribed synchronously.
- An `isMounted` guard prevents state updates after unmount during async flows.

### Error and transition handling

- Invalid code / missing session -> error card with return-home action.
- Non-waiting session -> error (or direct quiz redirect if already in-progress and user is a participant).
- Start failures and cancel failures surface inline user-friendly errors.

#### When users see "This quiz has already started or ended."

This message appears when a user opens the lobby page for a session that is **not** in `waiting` state, and they are **not allowed to continue from this lobby route**:

- Session status is `in_progress`, but this player is **not already registered as a participant** in that session.
- Session status is any final/non-waiting state (in this app, that is `completed`).
- If the host cancels, the session is deleted (not moved to a `cancelled` status), which is handled as a missing session path.

The only non-waiting case that does **not** show this error is:

- Session is `in_progress` **and** this player is already in the participant list -> they are redirected directly to `/quiz/[sessionId]`.

