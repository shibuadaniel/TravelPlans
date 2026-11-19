# Where are we?

A mobile-first trip briefing app. The owner writes the plan. Family opens a view-only link. No guest account.

## Run locally

```bash
npm install
cp .env.example .env.local
# fill in the Supabase URL, keys, DATABASE_URL, and SESSION_SECRET
npm run dev
```

Open http://localhost:3000

## Environment

Copy `.env.example` to `.env.local`.

| Name | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Private document uploads. Server only. |
| `DATABASE_URL` | Yes | Postgres connection. On Vercel, use the pooler URI. |
| `SESSION_SECRET` | Yes | Signs the guest share cookie. Account sessions are Supabase cookies. |

Run `supabase/schema.sql` in the Supabase SQL editor. In Authentication settings, turn off “Confirm email” if you want register to sign the person in immediately. Create stays local until those values are set.

## Data

Trips are in Supabase Postgres. PDFs and images are in the private `trip-documents` storage bucket. Accounts are Supabase Auth users, with a `public.users` profile for the display name. Guest links are still app tokens, not accounts.

Do not commit `.env.local`.

## Roles

| Role | How they get in | What they can do |
| --- | --- | --- |
| Owner | Creates the trip | Edit everything, delete the trip, manage share links, add or remove collaborators |
| Collaborator | Owner adds an email that already has an account | Edit trip sections and upload documents. Cannot delete the trip, manage share links, or manage collaborators |
| Guest | Opens `/s/<token>` | View that one trip. No account, no edit, no print control |

There is no shared passphrase and no `OWNER_ACCESS_CODE`.

## Collaborators

Invite is in the trip’s Share panel: enter the person’s email and choose Add. They must already have registered. The app does not send email. If they do not have an account yet, ask them to register, then add the email.

## Share links

Creating or rotating a link shows the raw URL once. The database stores only a SHA-256 hash of the token. Active links list the created time and last opened time, not the token. Revoke turns a link off. Rotate revokes every active link and mints a new one. Guests redeem `/s/<token>`, which sets an httpOnly cookie and opens the view-only briefing.
