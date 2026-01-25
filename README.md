# GDP Quiz Game

A real-time multiplayer quiz application designed to make dev training sessions more interactive and engaging. Team members submit questions about bugs, features, or programming concepts, then compete in Kahoot-style quiz sessions while learning together.

## Overview

### Problem
Dev training sessions where team members present topics have become passive and lack interaction between presenters and listeners.

### Solution
A quiz game where:
- Every dev contributes questions to a shared pool
- During training sessions, the team plays through randomly selected questions together
- Real-time feedback keeps everyone engaged
- Anonymous aliases remove the pressure of public scoring
- Questions accumulate over time, building a team knowledge base

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Database & Backend**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Supabase with server actions
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Vercel (with Analytics)

## Current Implementation Status

✅ **Supabase Infrastructure**: The project includes:
- Database schema migrations in `/migrations` folder
- Supabase client utilities (`lib/supabase/`)
- Server actions for all database operations (`actions/`)
- Type-safe database types (`lib/supabase/types.ts`)

⚠️ **Migration Status**: The app currently uses an **in-memory store** (`lib/store.ts`) for client-side caching. To complete the migration:
1. Set up a Supabase project
2. Run the migration files in order
3. Update components to use server actions instead of the store
4. Enable Realtime subscriptions for live updates

## Features

### ✅ Implemented

1. **Player Registration (Anonymous)**
   - Simple alias-based registration
   - No password required
   - Alias uniqueness validation
   - Persistent storage in localStorage

2. **Question Submission**
   - Submit questions with 1 correct + 3 wrong answers
   - Optional tag system for categorization
   - Immediate availability in question pool

3. **Quiz Session Flow**
   - Create quiz sessions with unique lobby codes
   - Join sessions via lobby code
   - Real-time participant list updates
   - Host controls for starting quiz
   - Optional tag filtering for questions

4. **Quiz Gameplay**
   - 10 questions per session (configurable)
   - 60-second timer per question (or until all answer)
   - Shuffled answer options
   - Real-time answer tracking
   - Answer distribution visualization
   - Question flagging system

5. **Scoreboard**
   - Global leaderboard ranked by accuracy
   - Session-specific results
   - Player statistics tracking

6. **UI/UX**
   - Modern, responsive design
   - Dark/light mode support (via system preference)
   - Loading states and error handling
   - Smooth transitions and animations

## Project Structure

```
gdp-quiz-game/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Home screen
│   ├── register/
│   │   ├── page.tsx             # Alias registration
│   │   └── loading.tsx          # Loading state
│   ├── submit/
│   │   └── page.tsx             # Question submission
│   ├── lobby/
│   │   └── [code]/
│   │       └── page.tsx         # Quiz lobby
│   ├── quiz/
│   │   └── [sessionId]/
│   │       └── page.tsx         # Quiz game screen
│   └── scoreboard/
│       └── page.tsx             # Global scoreboard
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── progress.tsx
│   │   └── ...                  # 50+ UI components
│   └── theme-provider.tsx       # Theme configuration
│
├── hooks/                       # Custom React hooks
│   ├── use-mobile.ts
│   └── use-toast.ts
│
├── lib/
│   ├── store.ts                 # In-memory data store (legacy, being migrated)
│   ├── types.ts                 # TypeScript type definitions
│   ├── utils.ts                 # Utility functions
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── server.ts            # Server Supabase client
│       └── types.ts             # Generated database types
│
├── actions/                     # Server actions
│   ├── players.ts               # Player operations
│   ├── questions.ts             # Question operations
│   └── quiz.ts                  # Quiz session operations
│
├── migrations/                  # Database migrations
│   ├── 001_create_players_table.sql
│   ├── 002_create_questions_table.sql
│   ├── 003_create_quiz_sessions_table.sql
│   ├── 004_create_quiz_participants_table.sql
│   ├── 005_create_answers_table.sql
│   └── README.md
│
├── public/                      # Static assets
├── styles/                      # Global styles
├── components.json              # shadcn/ui configuration
├── next.config.mjs             # Next.js configuration
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gdp-quiz-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create a `.env.local` file:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Run migrations in order (see `migrations/README.md`)

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Usage Guide

### For Players

1. **Register an Alias**
   - Click "Register Your Alias" or navigate to `/register`
   - Choose a unique alias (2-20 characters)
   - No password required

2. **Join a Quiz**
   - Enter a lobby code on the home page
   - Wait for the host to start the quiz
   - Answer questions as they appear

3. **Submit Questions**
   - Navigate to "Submit a Question"
   - Fill in question text, correct answer, and 3 wrong answers
   - Add optional tags for categorization
   - Submit to add to the question pool

4. **View Scoreboard**
   - Check global rankings at `/scoreboard`
   - See your accuracy and total questions answered

### For Hosts

1. **Create a Quiz Session**
   - Click "Host a Quiz" on the home page
   - Share the generated lobby code with participants
   - Optionally filter questions by tags

2. **Start the Quiz**
   - Wait for participants to join
   - Click "Start Quiz" when ready
   - Control the pace by clicking "Next Question" after each question

3. **Manage the Session**
   - Monitor participant count
   - View answer distributions
   - Flag questions that need review

## Database Schema

The database schema is defined in migration files located in `/migrations`. See `migrations/README.md` for details on applying migrations.

### Tables

- **`players`** - Stores player aliases and cumulative scores
- **`questions`** - Stores all submitted questions and answers
- **`quiz_sessions`** - Stores quiz session metadata
- **`quiz_participants`** - Tracks players in each session
- **`answers`** - Records player answers to questions

### Supabase Realtime

After running migrations, enable Realtime subscriptions in Supabase Dashboard:
- Go to Database > Replication
- Enable replication for: `quiz_sessions`, `quiz_participants`, `answers`

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Application Screens

### 1. Home Screen (`/`)
- Welcome message and app description
- "Join a Quiz" with lobby code input
- "Host a Quiz" button
- Link to submit questions
- Link to scoreboard
- Welcome message if user has registered alias

### 2. Alias Registration Screen (`/register`)
- Single input field for alias
- Real-time availability checking
- Validation (2-20 characters, unique)
- Redirects to intended destination after registration

### 3. Question Submission Screen (`/submit`)
- Form with question text (textarea)
- Correct answer input
- Three wrong answer inputs
- Tags input (comma-separated)
- Success confirmation with option to submit another

### 4. Quiz Lobby Screen (`/lobby/[code]`)
- Displays lobby code (copyable)
- Real-time participant list
- Host controls:
  - Tag filtering (optional)
  - Start quiz button
- Participant view: waiting message

### 5. Quiz Game Screen (`/quiz/[sessionId]`)
- Question display with progress indicator
- Four answer options (shuffled)
- 60-second countdown timer
- Answer tracking (X/Y participants answered)
- Results phase:
  - Correct answer highlighted
  - Player's answer shown
  - Answer distribution chart
  - Flag question button
  - Host: Next Question button
- Quiz completion screen with session results

### 6. Scoreboard Screen (`/scoreboard`)
- Top 3 podium display
- Full leaderboard table
- Rank, alias, questions answered, correct answers, accuracy
- Highlights current player
- Minimum 1 question to appear on leaderboard

## Game Rules

1. **Question Pool**: All submitted questions form a shared pool
2. **Quiz Size**: Each quiz consists of 10 randomly selected questions
3. **Time Limit**: 60 seconds per question, or until everyone answers
4. **Scoring**: 1 point per correct answer (no speed bonus)
5. **Aliases**: Players use consistent aliases across sessions for score tracking
6. **Anonymity**: No real names required
7. **Learning Focus**: Discussion encouraged after each question reveal
8. **Quality Control**: Flagging system for questions needing correction

## Development Notes

### Architecture

**Current State**: The app includes both implementations:
- **Client-side cache**: In-memory store (`lib/store.ts`) - used for client-side caching and Realtime subscriptions
- **Backend**: Supabase with server actions - handles all database operations

**Supabase Infrastructure**:
- Client utilities in `lib/supabase/` for browser and server
- Server actions in `actions/` for all database operations
- Type-safe database types in `lib/supabase/types.ts`
- Migration files in `migrations/` for schema management

### Completing the Migration

To fully migrate from in-memory store to Supabase:

1. **Set up Supabase project**
   - Create project at supabase.com
   - Add environment variables to `.env.local`
   - Run migrations in order (001-005)

2. **Update components**
   - Replace `store.*` calls with server actions from `actions/`
   - Add Supabase Realtime subscriptions for live updates
   - Update imports to use Supabase clients

3. **Enable Realtime**
   - Enable replication for `quiz_sessions`, `quiz_participants`, `answers`
   - Set up Realtime subscriptions in components

4. **Test and remove legacy code**
   - Test all functionality with Supabase
   - Remove or deprecate `lib/store.ts` once migration is complete

### Type Safety

All types are defined in `lib/types.ts`:
- `Player`
- `Question`
- `QuizSession`
- `QuizParticipant`
- `Answer`
- `ScoreboardEntry`

## Future Enhancements

- [x] **Supabase Infrastructure**
  - ✅ Database schema migrations
  - ✅ Supabase client utilities
  - ✅ Server actions for all operations
  - ⏳ Component migration (in progress)
  - ⏳ Realtime subscriptions setup

- [ ] **Admin Panel**
  - Review/edit flagged questions
  - Moderate question submissions
  - Analytics dashboard

- [ ] **Enhanced Features**
  - Question difficulty ratings
  - Team-based competitions
  - Export quiz results
  - Question images/code snippets support
  - Custom quiz lengths
  - Question categories/topics

- [ ] **Integrations**
  - Slack/Teams notifications
  - Calendar integration for scheduled quizzes
  - API for external integrations

- [ ] **Improvements**
  - Better mobile responsiveness
  - Offline mode support
  - Question search and filtering
  - Player profiles and achievements

## Contributing

This is a team project. When contributing:

1. Follow the existing code style
2. Use TypeScript strictly
3. Test your changes locally
4. Update documentation as needed

## License

[Add your license here]

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Note**: This application uses Supabase for data persistence and real-time updates. The in-memory store (`lib/store.ts`) serves as a client-side cache that integrates with Supabase Realtime subscriptions for optimal performance.
