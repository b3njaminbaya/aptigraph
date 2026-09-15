# Contributing to Aptigraph

Thanks for considering a contribution — Aptigraph is maintained by [Teevexa Ltd](https://www.teevexa.com) and welcomes outside contributors.

## Before you start

- For anything beyond a small fix (a new feature, a schema change, a redesign), please open an issue first to discuss the approach. It saves everyone time versus a PR that has to change direction after review.
- For a small, obvious fix (typo, small bug, docs), a PR without a prior issue is fine.

## Development setup

1. Fork the repo and clone your fork.
2. `npm install`
3. Set up a Supabase project and copy `.env.example` to `.env` — see the [Getting Started](README.md#3-set-up-supabase) section of the README for the full steps, including applying the migrations in `supabase/migrations/`.
4. `npm run dev` to start the app locally.

## Making changes

- Create a branch off `main`: `feature/short-description` or `fix/short-description`.
- Keep PRs focused — one logical change per PR is much easier to review than a bundle of unrelated fixes.
- If you're changing the database schema, add a new migration file under `supabase/migrations/` rather than editing an existing one.
- Match the existing code style (the project doesn't use Prettier; ESLint + TypeScript strict mode are the checks that matter).

## Before opening a PR

Run the same checks CI runs, so you're not waiting on a red build:

```sh
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

If you're changing behavior (not just refactoring), please add or update a test that covers it. `src/lib/*.test.ts` and `src/pages/Problems.test.tsx` are good examples of the existing style (Vitest + Testing Library).

## Commit sign-off (DCO)

Every commit must include a `Signed-off-by` trailer — this is a [Developer Certificate of Origin](https://developercertificate.org/), not a copyright transfer. It's just your assertion that you wrote the change (or have the right to submit it).

Add it automatically with the `-s` flag:

```sh
git commit -s -m "Fix streak calculation for a timezone edge case"
```

If you forgot on an already-made commit:

```sh
git commit --amend -s --no-edit
git push --force-with-lease
```

A CI check (`DCO`) will fail your PR if any commit is missing this, with a message telling you which commit(s) need it.

## Opening the PR

- Describe what changed and why, not just what.
- Link the issue it addresses, if any.
- Expect review comments — this is a company-maintained project, so changes get reviewed before merge, same as internal work.

## Reporting bugs / requesting features

Please use the issue templates — they ask for just enough detail (repro steps for bugs, motivation for features) to avoid a back-and-forth before we can act on it.

## Security issues

Please don't open a public issue for a security vulnerability — see [SECURITY.md](SECURITY.md) instead.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you're expected to uphold it.
