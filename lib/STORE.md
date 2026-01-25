# QuizStore Documentation

The `QuizStore` class (`lib/store.ts`) is the central state management system for the GDP Quiz Game. It provides a client-side cache with server action integration and real-time updates via Supabase Realtime.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Components                          │
│         (Lobby Page, Quiz Page, Scoreboard, etc.)               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ subscribe() / method calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          QuizStore                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Client-Side │  │  Listener   │  │   Realtime Channels     │  │
│  │    Cache    │  │   Pattern   │  │   (Supabase WebSocket)  │  │
│  │  (Maps)     │  │  (Set)      │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ Server Actions (async)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Server Actions                       │
│            (actions/players.ts, questions.ts, quiz.ts)          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Database                           │
│     (players, questions, quiz_sessions, quiz_participants,      │
│                          answers)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Singleton Pattern

The store is exported as a singleton instance:

```typescript
export const store = new QuizStore()
```

This ensures all components share the same state and cache.

### 2. Client-Side Cache

The store maintains in-memory Maps for each entity type:

```typescript
private players: Map<string, Player> = new Map()
private questions: Map<string, Question> = new Map()
private sessions: Map<string, QuizSession> = new Map()
private participants: Map<string, QuizParticipant> = new Map()
private answers: Map<string, Answer> = new Map()
```

**Benefits:**
- Fast synchronous reads from cache
- Reduced server requests
- Consistent state across components

### 3. Subscription Pattern (Observer)

Components can subscribe to store changes:

```typescript
// In a React component
useEffect(() => {
  const unsubscribe = store.subscribe(() => {
    // Called whenever store.notify() is invoked
    setParticipants(store.getParticipants(sessionId))
  })
  return () => unsubscribe()
}, [])
```

The `notify()` method triggers all listeners when data changes:

```typescript
private notify() {
  this.listeners.forEach((listener) => listener())
}
```

## Data Flow Patterns

### Read Operations

1. **Cache-first**: Check local cache, return immediately if found
2. **Server fallback**: If not in cache, fetch from server via server actions
3. **Cache update**: Store fetched data in cache and notify listeners

```typescript
// Example: Getting a session by code
getSessionByCode(code: string): QuizSession | undefined {
  // Synchronous cache lookup
  return Array.from(this.sessions.values()).find(
    (s) => s.lobbyCode === code.toUpperCase()
  )
}

// If not in cache, refresh from server
async refreshSessionByCode(code: string): Promise<QuizSession | null> {
  const session = await quizActions.getSessionByCode(code)
  if (session) {
    this.sessions.set(session.id, session)
    this.notify()  // Trigger UI updates
  }
  return session
}
```

### Write Operations

1. **Server-first**: Always persist to database via server actions
2. **Optimistic update**: Update local cache after server confirms
3. **Notify listeners**: Trigger UI updates

```typescript
async createPlayer(alias: string): Promise<Player> {
  // 1. Server action (persists to database)
  const player = await playerActions.registerPlayer(alias)
  
  // 2. Update cache
  this.players.set(player.id, player)
  
  // 3. Notify listeners
  this.notify()
  
  return player
}
```

### Fire-and-Forget Updates

Some operations update cache immediately and sync to server in background:

```typescript
updatePlayerStats(playerId: string, correct: boolean) {
  const player = this.players.get(playerId)
  if (player) {
    // Immediate cache update
    player.totalQuestionsAnswered++
    if (correct) player.totalCorrectAnswers++
    this.notify()
  }
  
  // Background server sync (non-blocking)
  playerActions.updatePlayerStats(playerId, correct).catch(console.error)
}
```

## Realtime Integration

### How It Works

The store uses Supabase Realtime's `postgres_changes` feature to receive live database updates:

```
┌──────────┐     INSERT/UPDATE      ┌──────────────┐
│ Database │ ───────────────────▶   │   Supabase   │
│  Tables  │                        │   Realtime   │
└──────────┘                        │    Server    │
                                    └──────┬───────┘
                                           │
                                    WebSocket
                                           │
                                           ▼
┌──────────────────────────────────────────────────┐
│                   QuizStore                       │
│                                                   │
│  subscribeToSession(sessionId)                   │
│    ├── Listen: quiz_sessions (UPDATE)            │
│    ├── Listen: quiz_participants (INSERT)        │
│    └── Listen: answers (INSERT)                  │
│                                                   │
│  On event received:                              │
│    1. Filter by sessionId (in callback)          │
│    2. Transform snake_case → camelCase           │
│    3. Update cache                               │
│    4. call notify()                              │
└──────────────────────────────────────────────────┘
```

### Subscription Method

```typescript
subscribeToSession(sessionId: string): () => void {
  // Prevent duplicate subscriptions
  if (this.activeChannels.has(sessionId)) {
    return () => this.unsubscribeFromSession(sessionId)
  }

  const channel = this.supabase
    .channel(`quiz-session-${sessionId}`)
    
    // Listen to quiz_sessions table
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'quiz_sessions' },
      async (payload) => {
        // Filter in callback (not subscription) due to RLS requirements
        const data = payload.new as any
        if (!data || data.id !== sessionId) return
        
        if (payload.eventType === 'UPDATE') {
          // Transform and cache
          const session: QuizSession = {
            id: data.id,
            lobbyCode: data.lobby_code,  // snake_case → camelCase
            // ... more fields
          }
          this.sessions.set(session.id, session)
          this.notify()
        }
      }
    )
    
    // Listen to quiz_participants table
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'quiz_participants' },
      async (payload) => {
        const data = payload.new as any
        if (!data || data.quiz_session_id !== sessionId) return
        
        if (payload.eventType === 'INSERT') {
          // Fetch player alias (not included in realtime payload)
          const player = await playerActions.getPlayerById(data.player_id)
          
          const participant: QuizParticipant = {
            id: data.id,
            playerAlias: player?.alias || 'Unknown',
            // ... more fields
          }
          this.participants.set(participant.id, participant)
          this.notify()
        }
      }
    )
    
    // Listen to answers table
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'answers' },
      // ... similar pattern
    )
    
    .subscribe()

  this.activeChannels.set(sessionId, channel)
  
  // Return cleanup function
  return () => this.unsubscribeFromSession(sessionId)
}
```

### Why Filter in Callback?

The code filters events in the callback instead of using subscription filters:

```typescript
// We do THIS:
.on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' },
  (payload) => {
    if (payload.new.id !== sessionId) return  // Filter here
    // ...
  }
)

// Instead of THIS:
.on('postgres_changes', { 
  event: '*', 
  schema: 'public', 
  table: 'quiz_sessions',
  filter: `id=eq.${sessionId}`  // Subscription filter
}, ...)
```

**Reason:** Subscription-level filters require:
1. `REPLICA IDENTITY FULL` on the table
2. Specific RLS policies configured

Filtering in the callback is more reliable and works with standard RLS setup.

### Database Requirements for Realtime

For `postgres_changes` to work, you need:

1. **Tables in publication:**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
   ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
   ALTER PUBLICATION supabase_realtime ADD TABLE answers;
   ```

2. **RLS enabled with SELECT policies:**
   ```sql
   ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow anonymous read access"
   ON quiz_sessions FOR SELECT TO anon USING (true);
   ```

See `migrations/006_enable_realtime_filters.sql` for the complete setup.

## Usage in Components

### Lobby Page Example

```typescript
useEffect(() => {
  let unsubscribeRealtime: (() => void) | null = null
  let unsubscribeStore: (() => void) | null = null

  const loadSession = async () => {
    // 1. Load initial data from server
    await store.refreshSessionByCode(code)
    await store.refreshParticipants(sessionId)
    
    // 2. Subscribe to realtime updates
    unsubscribeRealtime = store.subscribeToSession(sessionId)
    
    // 3. Subscribe to store changes to update UI
    unsubscribeStore = store.subscribe(() => {
      setSession(store.getSessionByCode(code))
      setParticipants(store.getParticipants(sessionId))
      
      // React to status changes (e.g., quiz started)
      if (session?.status === 'in_progress') {
        router.push(`/quiz/${sessionId}`)
      }
    })
  }

  loadSession()

  // Cleanup on unmount
  return () => {
    unsubscribeRealtime?.()
    unsubscribeStore?.()
  }
}, [code])
```

## API Reference

### Player Methods

| Method                          | Description              |
|---------------------------------|--------------------------|
| `createPlayer(alias)`           | Register a new player    |
| `getPlayerById(id)`             | Get player from cache    |
| `getPlayerByAlias(alias)`       | Find player by alias     |
| `isAliasAvailable(alias)`       | Check if alias is taken  |
| `refreshPlayer(id)`             | Fetch player from server |
| `updatePlayerStats(id, correct)`| Update player statistics |

### Question Methods

| Method                             | Description                |
|------------------------------------|----------------------------|
| `addQuestion(question)`            | Submit a new question      |
| `getQuestions()`                   | Get all cached questions   |
| `getQuestionById(id)`              | Get question from cache    |
| `getRandomQuestions(count, tags?)` | Fetch random questions     |
| `getAllTags()`                     | Get all available tags     |
| `flagQuestion(id, reason?)`        | Flag a question for review |

### Session Methods

| Method | Description |
|--------|-------------|
| `createSession(hostPlayerId)` | Create a new quiz session |
| `getSessionById(id)` | Get session from cache |
| `getSessionByCode(code)` | Find session by lobby code |
| `refreshSession(id)` | Fetch session from server |
| `startSession(id, questionIds)` | Start the quiz |
| `nextQuestion(id)` | Advance to next question |

### Participant Methods

| Method | Description |
|--------|-------------|
| `joinSession(sessionId, playerId, alias)` | Join a quiz session |
| `getParticipants(sessionId)` | Get session participants |
| `refreshParticipants(sessionId)` | Fetch participants from server |
| `isPlayerInSession(sessionId, playerId)` | Check if player joined |

### Answer Methods

| Method | Description |
|--------|-------------|
| `submitAnswer(...)` | Submit an answer |
| `getAnswersForQuestion(sessionId, questionId)` | Get answers for a question |
| `getPlayerAnswer(sessionId, questionId, playerId)` | Get specific player's answer |
| `refreshAnswersForQuestion(...)` | Fetch answers from server |

### Realtime Methods

| Method | Description |
|--------|-------------|
| `subscribeToSession(sessionId)` | Subscribe to session updates |
| `unsubscribeFromSession(sessionId)` | Unsubscribe from a session |
| `unsubscribeAll()` | Cleanup all subscriptions |

### Store Subscription

| Method | Description |
|--------|-------------|
| `subscribe(listener)` | Subscribe to cache changes |

## Demo Mode

The store includes demo mode for testing without a database:

```typescript
// Seed demo data
const { playerId, playerAlias, sessionCode } = store.seedDemoData()

// Get demo session ID
const sessionId = store.getDemoSessionId()

// Clear demo data
store.clearDemoData()
```

Demo mode creates:
- 10 fake players with stats
- A demo session with code `DEMO42`
- 5 participants in the session

## Best Practices

1. **Always use the singleton**: Import `store` from `lib/store.ts`, don't create new instances

2. **Clean up subscriptions**: Always unsubscribe in useEffect cleanup
   ```typescript
   return () => {
     unsubscribeRealtime?.()
     unsubscribeStore?.()
   }
   ```

3. **Check cache first**: Use sync methods like `getSessionById()` before async `refreshSession()`

4. **Handle loading states**: Cache may be empty on first render

5. **Use isMounted pattern**: Prevent state updates after unmount in async operations
   ```typescript
   let isMounted = true
   // ... async operations
   if (!isMounted) return
   setState(...)
   return () => { isMounted = false }
   ```
