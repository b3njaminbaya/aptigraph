<!-- @format -->

# Aptigraph

[![CI](https://github.com/teevexa/aptigraph/actions/workflows/ci.yml/badge.svg)](https://github.com/teevexa/aptigraph/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Maintained by [Teevexa Ltd](https://www.teevexa.com).

## Overview

Aptigraph is a **LeetCode problem tracker** that helps you track your solving progress, spot weak topics, and build a consistent practice habit. It tracks solved/attempted problems, streaks, and topic-level analytics, gives rule-based recommendations for what to practice next based on your weakest topics, schedules solved problems for spaced review, and adds a social layer — a global leaderboard, friends, and per-problem discussion threads.

## Features

### Problem Tracking

- A curated 74-problem catalog in the spirit of the well-known "Blind 75" list (title, difficulty, topics — no scraped problem statements), searchable and filterable by difficulty and topic
- Mark problems **solved**, **attempted**, or leave them unsolved; log time-per-attempt (per problem) and free-text notes per problem
- **Reset** a problem's status, notes, and review schedule from the Problems page (with a confirmation step) — your attempt history is kept for streaks and analytics
- Per-user data is stored in Supabase (Postgres) behind row-level security, not `localStorage` — it follows you across devices

### Analytics & Motivation

- Dashboard with solved count, current streak, and next-milestone tracking (with celebratory toasts on milestones)
- Difficulty heatmap and topic-strength breakdown (Recharts)
- **Spaced repetition**: solved problems come back for review on an SM-2-inspired schedule that adapts based on whether you solve them again cleanly or struggle
- **Smart recommendations**: a SQL-driven engine surfaces problems from your weakest topics (lowest solve rate among topics you've actually attempted), not a generic list

### Social

- Global **leaderboard** ranked by problems solved
- **Friends**: search by display name, send/accept/decline friend requests, compare solved counts
- **Discuss**: per-problem discussion threads with upvoting and comments

### Account

- Email/password authentication (Supabase Auth), with a "Forgot password?" email-reset flow
- Editable profile (display name); avatars are generated automatically and deterministically per account (via [DiceBear](https://www.dicebear.com/)) rather than requiring an image upload
- Password change and full account deletion (deletion runs through a Supabase Edge Function using the service-role key, and cascades across all of a user's data)

### UI

- Full dark/light theme support (defaults to dark), built on [shadcn/ui](https://ui.shadcn.com/) and Tailwind CSS
- Responsive down to mobile, with route-based code splitting so the initial load stays light

## Tech Stack

- **Frontend**: [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript, [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/), [TanStack Query](https://tanstack.com/query) for server state, [React Router](https://reactrouter.com/), [Recharts](https://recharts.org/)
- **Backend**: [Supabase](https://supabase.com/) — Postgres with row-level security, Auth, auto-generated REST/RPC (PostgREST), and one Edge Function (account deletion)
- **Testing**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **CI**: GitHub Actions (lint, typecheck, test, build on every push/PR)

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/teevexa/aptigraph.git
cd aptigraph
```

### 2. Install dependencies

```sh
npm install
```

### 3. Set up Supabase

This project expects a [Supabase](https://supabase.com/) project (free tier is enough).

1. Create a project in the Supabase dashboard.
2. Copy `.env.example` to `.env` and fill in your project's URL and anon key (Supabase dashboard → Settings → API):
   ```sh
   cp .env.example .env
   ```
3. Link the [Supabase CLI](https://supabase.com/docs/guides/cli) to your project and apply the migrations in `supabase/migrations/`:
   ```sh
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
4. (Optional) Deploy the account-deletion Edge Function if you want that flow working:
   ```sh
   supabase functions deploy delete-account
   ```
5. To make "Forgot password?" work, add your app's `/reset-password` URL (e.g. `http://localhost:5173/reset-password` for local dev, plus your production URL) to **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard.

### 4. Run the app

```sh
npm run dev
```

## Testing & Quality

```sh
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript, strict mode
npm test           # Vitest
npm run build      # Production build
```

All four run automatically on every push via GitHub Actions.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, the PR process, and the commit sign-off (DCO) requirement. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

Found a security issue? Please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

---

## License

MIT © [Teevexa Ltd](https://www.teevexa.com). See [LICENSE](LICENSE).

---

## Contact

For issues or feature requests, open an issue on GitHub. For anything else, contact [b3njaminbaya@gmail.com](mailto:b3njaminbaya@gmail.com).
