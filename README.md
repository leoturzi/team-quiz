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
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: In-memory store (current) / Supabase (planned)
- **Real-time**: In-memory subscriptions (current) / Supabase Realtime (planned)
- **Deployment**: Vercel (with Analytics)

## Current Implementation Status

⚠️ **Note**: The current implementation uses an **in-memory store** (`lib/store.ts`) for demo and development purposes. This means:
- Data persists only during the browser session
- Multiple users on different devices won't see each other's data
- Perfect for local development and testing
- **Production-ready Supabase integration is planned** (see Database Schema section below)

### Demo Mode
The app includes a "Try Demo" feature that seeds mock data including:
- 10 demo players with various stats
- 10 sample questions
- An active lobby session

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
│   ├── store.ts                 # In-memory data store
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                  # Utility functions
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

3. **Run the development server**
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

## Database Schema (Planned for Supabase)

The following schema is designed for future Supabase integration:

### Tables

#### `players`
Stores player aliases and their cumulative scores.

```sql
create table players (
  id uuid default uuid_generate_v4() primary key,
  alias varchar(50) unique not null,
  total_questions_answered integer default 0,
  total_correct_answers integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### `questions`
Stores all submitted questions and their answers.

```sql
create table questions (
  id uuid default uuid_generate_v4() primary key,
  question_text text not null,
  correct_answer varchar(500) not null,
  wrong_answer_1 varchar(500) not null,
  wrong_answer_2 varchar(500) not null,
  wrong_answer_3 varchar(500) not null,
  tags text[] default '{}',
  submitted_by uuid references players(id),
  flagged boolean default false,
  flag_reason text,
  created_at timestamp with time zone default now()
);
```

#### `quiz_sessions`
Stores metadata about each quiz game session.

```sql
create table quiz_sessions (
  id uuid default uuid_generate_v4() primary key,
  lobby_code varchar(10) unique not null,
  host_player_id uuid references players(id),
  status varchar(20) default 'waiting' check (status in ('waiting', 'in_progress', 'completed')),
  current_question_index integer default 0,
  question_ids uuid[] default '{}',
  created_at timestamp with time zone default now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone
);
```

#### `quiz_participants`
Tracks which players joined a quiz session.

```sql
create table quiz_participants (
  id uuid default uuid_generate_v4() primary key,
  quiz_session_id uuid references quiz_sessions(id) on delete cascade,
  player_id uuid references players(id),
  joined_at timestamp with time zone default now(),
  unique(quiz_session_id, player_id)
);
```

#### `answers`
Records each player's answer to each question in a session.

```sql
create table answers (
  id uuid default uuid_generate_v4() primary key,
  quiz_session_id uuid references quiz_sessions(id) on delete cascade,
  question_id uuid references questions(id),
  player_id uuid references players(id),
  selected_answer varchar(500) not null,
  is_correct boolean not null,
  answered_at timestamp with time zone default now(),
  unique(quiz_session_id, question_id, player_id)
);
```

### Indexes

```sql
create index idx_questions_tags on questions using gin(tags);
create index idx_quiz_sessions_lobby_code on quiz_sessions(lobby_code);
create index idx_quiz_sessions_status on quiz_sessions(status);
create index idx_answers_session_question on answers(quiz_session_id, question_id);
```

### Supabase Realtime

Enable realtime subscriptions for:
- `quiz_sessions` - for status changes and current question updates
- `quiz_participants` - for lobby participant list
- `answers` - for tracking who has answered

## Environment Variables (Future)

When integrating Supabase, create a `.env.local` file:

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
- Demo mode option
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

### Current Architecture

The app uses a singleton `QuizStore` class (`lib/store.ts`) that:
- Maintains in-memory Maps for all data entities
- Provides subscription-based reactivity
- Seeds demo data for testing
- Mirrors the planned Supabase schema structure

### Migration Path to Supabase

To migrate to Supabase:

1. **Install Supabase client**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create Supabase client utilities**
   - `lib/supabase/client.ts` - Browser client
   - `lib/supabase/server.ts` - Server client

3. **Create server actions**
   - `actions/players.ts` - Player CRUD operations
   - `actions/questions.ts` - Question operations
   - `actions/quiz.ts` - Quiz session management

4. **Replace store calls**
   - Update components to use server actions
   - Add Supabase Realtime subscriptions for live updates
   - Migrate localStorage to Supabase auth (optional)

5. **Set up database**
   - Run SQL schema in Supabase SQL Editor
   - Enable Realtime for specified tables
   - Configure Row Level Security (RLS) policies

### Type Safety

All types are defined in `lib/types.ts`:
- `Player`
- `Question`
- `QuizSession`
- `QuizParticipant`
- `Answer`
- `ScoreboardEntry`

## Future Enhancements

- [ ] **Supabase Integration**
  - Replace in-memory store with Supabase
  - Real-time multiplayer across devices
  - Persistent data storage

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

**Note**: This application is currently in development. The in-memory store is suitable for local testing and demos, but production deployment requires Supabase integration for multi-user support and data persistence.
