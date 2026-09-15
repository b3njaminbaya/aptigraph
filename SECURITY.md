# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in Aptigraph (for example, a way to bypass
Supabase row-level security, read another user's data, or escalate privileges),
please **do not open a public GitHub issue**.

Instead, email **[teevexa@gmail.com](mailto:teevexa@gmail.com)** with:

- A description of the vulnerability and its impact
- Steps to reproduce it (a minimal repro is ideal)
- Any suggested fix, if you have one

You should get an acknowledgment within a few days. We'll keep you updated as
we investigate and fix the issue, and we're happy to credit you in the fix's
release notes if you'd like.

## Scope

This project is a personal-progress tracker with no payment processing and no
handling of especially sensitive personal data beyond an email/password
account. The main things worth reporting are:

- Row-level security (RLS) policy gaps in `supabase/migrations/` that would
  let one user read or write another user's data
- Authentication/authorization bypasses
- Anything that would let untrusted input reach a SQL query outside of
  Supabase's parameterized client (SQL injection)
- Secrets or credentials accidentally committed to the repository

## Supported Versions

This project doesn't currently maintain multiple release branches — only the
latest code on `main` is supported. Fixes land as new commits, not backports.
