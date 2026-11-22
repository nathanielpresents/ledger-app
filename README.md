# Secure GL Ledger — starter module

A General Ledger journal workflow (create → submit → approve/reject → post →
reverse) built as a security-first rewrite of a classic ERP journal page,
using **Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL +
NextAuth**.

This is one module, not a full ERP. It's meant as a clean, extensible
foundation — the same patterns here (server-side authorization, append-only
audit log, POST-only mutations, validated input) apply directly if you add
Accounts Payable, Inventory, HR, etc. later.

## What's fixed compared to the old system

| Problem in the old ERP page | How this project avoids it |
|---|---|
| `Reverse`/`Post`/`SendForApproval` were plain `GET` links — forgeable with a single hidden `<img>` tag (CSRF) | Every mutating route is a Next.js Route Handler that **only exports `POST`**; there is no `GET` handler to trick with an auto-loading tag. Combined with the session cookie's `SameSite=Lax` default, a cross-site request cannot carry the session along. |
| Edit/Delete/Approve buttons were only hidden with jQuery `.hide()` — the real authorization lived nowhere | `src/lib/rbac.ts` holds every authorization rule, and **every API route calls it before touching the database**, regardless of what the UI shows. |
| Kendo templates printed fields with `#= x #`, which inserts raw, unescaped HTML (stored XSS), e.g. in the attachment file name | React escapes all text content by default. Nothing in these pages uses `dangerouslySetInnerHTML`. |
| No maker-checker: a user could, in principle, approve their own entry | `canApproveOrReject()` explicitly blocks a journal's own creator from approving or rejecting it, enforced server-side. |
| "Audit" fields (`CreatedBy`/`ModifiedBy`) could be silently overwritten | `AuditLog` is **append-only** — the app code only ever `create`s rows there, never updates or deletes them, so it stays a trustworthy history. |
| SignalR took `userId` from the query string the client sent | Not implemented here; if you add real-time notifications later, derive identity from the authenticated session, never from client-supplied data. |
| Debit/credit balance was only checked in the browser | Both the client form and, authoritatively, the server (`src/lib/validation.ts`) reject unbalanced journals. |

## Project layout

```
prisma/schema.prisma      data model: User, Journal, JournalLine, AuditLog
src/lib/auth.ts           NextAuth config (hashed passwords, JWT sessions)
src/lib/rbac.ts           all authorization rules, in one place
src/lib/validation.ts     zod schemas - the server never trusts client input
src/lib/journalActions.ts shared status-transition + audit-log helper
src/app/api/journals/...  REST-ish API routes (all mutations are POST-only)
src/app/journals/...      pages: list, new, detail (with action buttons)
```

## Running it locally

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and
   `NEXTAUTH_SECRET` (generate the secret with `openssl rand -base64 32`).
3. Push the schema and seed demo users:
   ```
   npx prisma migrate dev --name init
   npm run seed
   ```
4. Run it:
   ```
   npm run dev
   ```
5. Log in at `http://localhost:3000/login` with one of the seeded accounts
   (`admin@example.com` / `maker@example.com` / `checker@example.com`, all
   password `ChangeMe123!`). **Change these before using real data.**

Try the workflow: log in as `maker@example.com`, create and submit a
journal; log out, log in as `checker@example.com`, approve and post it;
notice that `maker@example.com` cannot approve their own journal even if you
edit the page to try, because the server rejects it.

## Deploying for free

**Database — pick one:**
- [Neon](https://neon.tech) — serverless Postgres, generous free tier, gives
  you a `DATABASE_URL` directly.
- [Supabase](https://supabase.com) — Postgres + extra tooling, also has a
  free tier; use its connection string (the "connection pooling" one is
  usually what you want for serverless hosting).

**Hosting — Vercel (built for Next.js):**
1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), "Import Project", pick the repo.
3. In the project's Environment Variables, add `DATABASE_URL`,
   `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (set this to the `https://...`
   domain Vercel gives you — update it once you know the final URL).
4. Deploy. Then run the migration once against the production database —
   easiest is to run `npx prisma migrate deploy` and `npm run seed` locally
   with `DATABASE_URL` temporarily pointed at the production database.

**Free-tier caveats to know about:**
- Neon/Supabase free databases can pause or have storage/row limits —
  fine for a demo or small real usage, not for high volume.
- Vercel's free tier is generous for low traffic but has execution-time and
  bandwidth ceilings; check current limits on their pricing page before
  relying on it for production.
- Rotate `NEXTAUTH_SECRET` and all seeded passwords before putting any real
  financial data in it.

## Honest limitations / what to add next

- No rate limiting on login attempts yet — add one (e.g. Upstash Redis free
  tier) before exposing this publicly.
- No file attachments module yet — if you add one, validate file type by
  content (magic bytes), not just extension, and store outside any
  web-servable path.
- No automated tests included — add integration tests for the RBAC rules in
  `src/lib/rbac.ts` before extending the workflow, since that file is the
  module's main security boundary.
- This only covers General Ledger journals. AP, AR, Inventory, Fixed Assets,
  HR, etc. would each need their own schema + rbac rules following the same
  pattern.
