# Kickoff: Rebuild “Where are we?” (shareable trip briefing app)

Paste this entire document into a **brand-new** Cursor project as the system/kickoff prompt. The new project has **no access** to any existing repo. Recreate the product from this spec alone.

You are the building agent. Follow these instructions imperatively. Do not ask the human to invent UX that is already specified here. Prefer implementing the locked UI and flows first; only invent where this prompt explicitly marks something as new (auth, onboarding, collaborators).

---

## 1. Product goal

Build **Where are we?** — a mobile-first, shareable browser app for family trip briefings.

**Owner (and invited collaborators)** author a trip online: destination, dates, flights, car rentals, stays, travel insurance, JW congregations, then share a **view-only magic link** with family.

**Guests** open `/s/<token>`, land on a read-only trip briefing that matches the owner’s view layout (without edit controls), and need **no account**.

This is a greenfield rebuild of an existing MVP. Match the **visual language and trip edit/view UX** described below as closely as possible, then **add real multi-user auth, onboarding, and access control**. Do **not** port the legacy single-secret unlock model.

---

## 2. Tech preferences

Use unless you have a strong, documented reason otherwise:

| Layer | Choice |
| --- | --- |
| Framework | **Next.js App Router** + **TypeScript** |
| UI | **Material UI (MUI)** — phone-first, dense controls |
| DB | **Postgres** (local: Postgres or embedded/PGlite-equivalent is fine) |
| Auth | Real multi-user accounts (email/password and/or OAuth). Session cookies or equivalent. **Not** a shared env passphrase. |
| Deploy | Ordinary web app / Vercel-style hosting is fine. **PWA is optional later** — do not block MVP on installability. |

Constraints:

- Mobile-first layouts; content column max ~480px on phone, ~720px on larger screens, centered.
- Safe-area insets for notched phones.
- No native mobile apps in MVP.
- No outbound invite email in MVP (copy link only).

---

## 3. Visual language (recreate closely)

### Brand & chrome

- App name: **Where are we?**
- Sticky brand **AppBar** (primary teal) with flight-takeoff icon + serif title linking home — **except** on trip **details** and **guest** trip pages, where the AppBar is **hidden**.
- On details/guest: use a light **title chrome** (white/paper background, bottom divider) with:
  - Back arrow (owner/collaborator only; guests: no back to trip list)
  - Destination as `h4`/`h1` (ellipsis if long; fallback **Untitled trip**)
  - Subtext: `Travel → Return` dates (locale short date; missing → em dash)
  - Optional end action (owner: **share** icon button)

### Theme tokens

- Mode: **light**
- Primary: `#0f4c5c`
- Secondary / accent: `#e36414`
- Background default: `#f4f7f8`
- Paper: `#ffffff`
- Foreground-ish body: `#102a33`
- Shape radius: **8px** everywhere (inputs, buttons, accordions, papers)
- Density: MUI `size="small"` defaults; buttons min-height ~36; list/accordion summary min-height ~44
- Buttons: **no** uppercase (`textTransform: none`), font-weight 600
- Inputs: full width, left-aligned labels and values; force left-align for `date` / `datetime-local` (Chromium otherwise right-aligns)
- Typography:
  - Body / UI: **Source Sans 3** (or equivalent humanist sans — not Inter/Roboto/system default as the brand face)
  - Headings: **Source Serif 4** (or Georgia-backed serif)
- Theme color / viewport meta: primary teal; `viewportFit: cover`

### Accordion pattern

- Border `1px solid divider`, radius 8, **no elevation**, disable gutters, hide default accordion `::before` rule
- Summary: bold section title left; optional count; optional pencil / + / trash actions on the right; expand chevron
- Multiple items inside a section separated by **horizontal Dividers** (not nested cards)
- Empty section body: muted “None” / “No … yet.”

### View field pattern (label–data)

- 2-column CSS grid for short fields; long values (long text, URLs, emails, multiline) span full width
- Caption label (secondary) above body2 value
- **Omit empty fields entirely**
- Item headers: `subtitle2` title + optional `body2` secondary subtext

### Documents

- Attachment row: paperclip icon + filename link (ellipsis)
- Empty hint: “No document uploaded.”
- Accept PDF + images (JPEG/PNG/WebP/GIF); max **10 MB**

### Trip list cards

- Page title: **Your trips**
- Empty: “No trips yet.”
- **2-column** grid of compact cards
- Each card: 4:3 **deterministic pastel gradient** header (hash from destination + id — no external image CDN), then destination keyword (first segment before `,`/`-`/`/`) + trash icon on the **same row**, then date range caption
- **No** share control and **no** share URL on the list
- Fixed circular primary **FAB** bottom-right: add / new trip

---

## 4. Information architecture & screens

### Routes (suggested)

| Route | Who | Purpose |
| --- | --- | --- |
| `/` | Signed-in | Trip list |
| `/auth/sign-in`, `/auth/register` | Public | Account entry |
| `/onboarding` | New user | First-run setup |
| `/trips/new` | Owner/editor | Create blank trip → redirect to edit Overview |
| `/trips/[id]` | Owner/editor | **View** briefing (accordions, share icon) |
| `/trips/[id]/edit?step=` | Owner/editor | Accordion **edit** flow |
| `/s/[token]` | Anyone with link | Redeem token → set httpOnly cookie → redirect guest view |
| `/s/invalid` | Anyone | Invalid/revoked share |
| `/guest/[tripId]` (or equivalent) | Cookie-authenticated guest | View-only briefing |

Hide brand AppBar on owner trip details and guest briefing. Show AppBar on list, auth, onboarding, edit is optional — current MVP shows AppBar on edit/list/home and hides on details/guest; match that.

### Owner trip list (`/`)

- Lists **only** trips the signed-in user owns or can access (see permissions).
- Tap card → view screen.
- Trash on destination row with confirm: `Delete {label}? This cannot be undone.`
- FAB → `/trips/new`.

### New trip

- POST blank trip (`destination: ""`, null dates, empty notes).
- Replace-navigate to edit with `step=overview`.
- While creating: light title chrome “New trip” + “Starting editor…”

### View screen (`/trips/[id]`) — owner/collaborator

- **No brand AppBar**
- Light title chrome: back → list, destination, dates, **IosShare-style share icon** top-right
- Accordions **only** for: Flights, Car rentals, Stays, Insurance, Congregations  
  - **Do not** show Overview accordion on view (destination/dates live in the header; notes are edit-only surface)
  - **Do not** show Share as a view accordion
- Default expand **Flights**
- Each accordion summary: title + **pencil** → `/trips/[id]/edit?step=<section>`
- Section bodies use label–data `TripSectionView` patterns below
- Share icon opens a **Dialog**: title “Share trip”, body = Share panel (embedded). Active raw URL is only available when freshly created inside that panel/modal — see Share rules.

### Edit screen (`/trips/[id]/edit`)

- Title chrome: back → **trip view** (`Back to trip`)
- Accordion steps **in this order**:
  1. Overview
  2. Flights
  3. Car rentals
  4. Stays
  5. Insurance
  6. Congregations (**last content section**)
  7. Share
- One panel expanded at a time (controlled).
- List steps (Flights, Cars, Stays, Congregations): summary shows `Title (count)` + small filled primary circular **+** FAB (32px) to add an item + pencil when in view mode inside editor.
- Overview / Insurance: no +.
- Share step: always in “manage” mode (never collapses to a stub view).
- Per-section modes inside editor: after save, section switches to label–data view with pencil to re-edit; Save advances to the **next** step’s edit mode.
- **One full-width primary Save button per accordion** (except Share, which has its own create/rotate/revoke actions).
- Item trash: delete IconButton on the **right of each item header** inside the section.

### Guest briefing

- Same accordion view as owner view, `editable={false}`: **no** back, **no** share icon, **no** pencils, **no** +.
- **No print toolbar / no print CTA** on the guest page.
- Invalid cookie/token: warning “Open a valid share link from the trip owner.”

---

## 5. Section field specs (MVP content)

### Overview (edit only)

Fields:

- Where are we going? (required destination / trip title)
- Date of travel (`date`)
- Date of return (`date`)
- Notes (multiline)

View header shows destination + dates only. Notes appear when Overview is edited; not as a view accordion.

### Flights (many)

Edit fields per leg:

- Airline, Flight #, From, To
- Depart (local) / Arrive (local) — `datetime-local`
- Confirmation, Passengers, Terminal / gate

View item title/subtext:

- Title: airline (or `Flight N`)
- Subtext: flight number
- Fields: Route (`From → To`), Depart, Arrive, Confirmation, Passengers, Terminal / gate

### Car rentals (many)

Edit:

- Company, Confirmation
- Pickup place, Dropoff place
- Pickup time, Dropoff time (`datetime-local`)
- Vehicle class, Contact phone

View:

- Title: company (or `Rental N`)
- Subtext: `pickup → dropoff` datetimes when present
- Fields: Confirmation, Pickup, Dropoff, Vehicle, Phone

### Stays (many)

MVP edit surface (shipped product simplified to):

- Place (name)
- Address
- Check-in / Check-out (`date`)
- Optional **one document** per stay (upload / remove / paperclip link)

Do **not** build Airbnb URL scrape assist in this rebuild unless time remains after auth MVP. Do **not** surface Google Maps links.

View:

- Title: place (or `Stay N`)
- Subtext: `check-in → check-out` dates
- Address field + document attachment link when present

(DB may still allow stay_type / contact / confirmation / notes / listing_url later; keep schema extensible but UI matches the simplified stay form above.)

### Insurance (one form per trip + many documents)

Form:

- Provider, Policy number, Phone
- Coverage start / end (`date`)
- Claim notes (multiline)

Documents:

- **Multiple** policy documents
- Upload PDF/image
- Each doc: paperclip link + **trash** IconButton to delete that document
- Section label: “Policy documents”

View: provider/policy/phone/coverage/claim notes + list of document links.

### Congregations (many) — last content section before Share

Purpose: JW Kingdom Hall / congregation info for the trip.

Edit:

- Search: City / region (default from stay address/name or destination) + “Find nearby” (OSM / Overpass-style search is fine)
- Suggestions: name, address, Attach button, optional safe `jw.org` outbound link
- Manual add: Name, Address, Meeting times, jw.org link, Notes
- **Do not** show or persist Google Maps / map URLs in the product UI (force empty / omit)

View:

- Title: congregation name
- Fields: Address, Meeting times, jw.org, Notes
- No map links

### Share

Capabilities:

- **Create share link**
- **Rotate link** (revoke all active, mint new)
- Show **fresh URL only once** after create/rotate (copyable field + Copy button). Message: raw token shown once.
- List active links with created time, optional last opened, **Revoke**
- URL shape: `{origin}/s/<short-token>`
- Tokens: CSPRNG ~12 bytes → ~16 char base64url; store **SHA-256 hash only**; never log raw tokens
- Redeem: `/s/<token>` → validate active → set httpOnly `SameSite=Lax` cookie → redirect to guest trip view; update `last_used_at`
- Guests: view-only; no account required
- Owner view: share management primarily via **header share icon → modal**; edit flow also has a Share accordion with the same panel

---

## 6. Data model (shapes)

Implement equivalent tables/types. Timestamps ISO; IDs UUID.

### Trip

`id`, `owner_user_id` (or `owner_sub`), `destination`, `travel_date`, `return_date`, `notes`, `created_at`, `updated_at`

### Flight

`id`, `trip_id`, `airline`, `flight_number`, `from_airport`, `to_airport`, `depart_at`, `arrive_at`, `confirmation`, `passengers`, `terminal_gate`, `sort_order`, timestamps

### CarRental

`id`, `trip_id`, `company`, `confirmation`, `pickup_place`, `dropoff_place`, `pickup_at`, `dropoff_at`, `vehicle_class`, `contact_phone`, `sort_order`, timestamps

### Stay

`id`, `trip_id`, `name` (place), `address`, `check_in`, `check_out`, optional document metadata (`document_name`, `document_mime`, `document_size`, blob/storage key), `sort_order`, timestamps  
(Optional unused columns OK: stay_type, contacts, confirmation, notes, listing_url)

### Congregation

`id`, `trip_id`, `name`, `address`, `meeting_times`, `jw_org_url`, `notes`, `sort_order`, timestamps  
(`map_url` may exist but must stay empty / unused in UI)

### Insurance (+ documents)

Insurance row keyed by `trip_id`: `provider`, `policy_number`, `phone`, `coverage_start`, `coverage_end`, `claim_notes`, `updated_at`

`insurance_documents`: `id`, `trip_id`, `document_name`, `document_mime`, `document_size`, `sort_order`, `created_at`, storage blob/key

### ShareLink

`id`, `trip_id`, `token_hash`, `label`, `created_at`, `revoked_at`, `last_used_at`  
API may expose `active: revoked_at is null`

### TripBundle (API aggregate)

`{ trip, flights, car_rentals, stays, congregations, insurance, insurance_documents }`

### New for rebuild: Users & membership

You **must** add:

- `users` (id, email, name, password hash / auth provider ids, created_at, …)
- `trip_members` or equivalent: `trip_id`, `user_id`, `role` (`owner` | `collaborator` | maybe `viewer` account later), timestamps
- Owner is the creating user; collaborators are invited accounts with edit rights (see matrix)
- Guest share access is **not** a user row — token only

Isolate queries by membership: users never see other users’ trips unless membership or valid share token says so.

---

## 7. Auth model (NEW — required)

### Explicitly exclude (do not rebuild)

Do **not** implement any of:

- `OWNER_ACCESS_CODE` / shared passphrase env unlock
- “Primary” unlock username tied to a publish secret
- Cursor-identity-only owner gate as the sole production auth
- Single global owner for the whole deployment
- Publish-time secret as the family password

Those patterns are considered broken for a multi-user shareable app.

### Required auth / onboarding

1. **Registration** — create account (email + password minimum; OAuth optional bonus)
2. **Sign-in / sign-out** — durable session
3. **New-user onboarding / first-run** — short setup after first register (display name, optional “create your first trip” CTA). Keep it one screen, mobile-first, brand-consistent.
4. **Trip ownership isolation** — every trip has exactly one owner user; list/get/mutate enforce membership
5. **Collaborators** — owner can invite another registered user by email (in-app accept/pending is fine; no email send required in MVP if you use “share invite code” or “add by email if account exists” — pick one simple approach and document it in README)
6. **Share guests** — token URLs, revoke/rotate, no account

Signed-out users hitting `/` see auth entry, not the old passphrase panel.

---

## 8. Permissions matrix

| Action | Owner | Collaborator | Share guest | Signed-out |
| --- | --- | --- | --- | --- |
| List own/accessible trips | Yes | Yes (member trips) | No | No |
| Create trip | Yes | No (unless you explicitly allow; default **owner-only create**) | No | No |
| Edit trip sections / uploads | Yes | Yes | No | No |
| Delete trip | Yes | No | No | No |
| Manage share links (create/rotate/revoke) | Yes | Optional: allow or owner-only — **default owner-only** | No | No |
| Manage collaborators | Yes | No | No | No |
| View trip briefing | Yes | Yes | Yes (via valid token) | No |
| Print CTA on guest page | — | — | **No** | — |

APIs must return 401/403 appropriately. Share-token requests must be scoped to that trip only. Never leak other trips’ data through guest APIs.

---

## 9. MVP scope

### In scope

- Mobile-first UI matching sections 3–5
- Full trip CRUD for sections listed
- Multi-doc insurance + stay documents
- Congregation search assist (best-effort OSM) + manual entry
- Magic share links `/s/<token>` with revoke/rotate; token shown once
- Real auth: register, sign-in, session, onboarding
- Owner vs collaborator vs guest permissions
- Trip isolation
- Owner print optional (browser print CSS / owner-only control OK); **guest has no print UI**

### Out of scope (v1)

- Booking engines / changing real reservations
- Outbound invite emails
- Real-time location tracking
- Native apps
- PWA install prompts (optional later)
- Airbnb listing scrape assist
- Google Maps links in UI
- Legacy OWNER_ACCESS_CODE / primary unlock
- Dense desktop dashboard layouts

---

## 10. Acceptance criteria

Ship when all of the following pass:

1. New user can register, complete onboarding, land on empty trip list.
2. User can create a trip, edit Overview → Flights → Cars → Stays → Insurance → Congregations → Share with accordion UX described.
3. View screen hides Overview accordion; shows destination/dates in light title chrome; Flights default-expanded; Congregations after Insurance; share via header icon → modal.
4. Guest `/s/<token>` opens view-only briefing without account; invalid/revoked tokens fail safely; guest has no print control and no edit controls.
5. Fresh share URL appears only at create/rotate time; list of active links does not re-display raw tokens; revoke works.
6. Second registered user cannot see first user’s trips until added as collaborator (or equivalent membership).
7. Collaborator can edit trip content but cannot delete the trip (and cannot manage share links if you kept owner-only default).
8. No `OWNER_ACCESS_CODE` / primary unlock / publish-secret auth path exists in code or docs.
9. Mobile viewport (~390px) is usable without horizontal scroll; forms left-aligned; teal/orange theme present.
10. Insurance supports multiple documents with per-doc trash delete.

---

## 11. Do-not constraints

- Do **not** invent a purple/indigo AI-slop theme or cream+terracotta newspaper look; use the teal/orange tokens above.
- Do **not** put a dashboard of stats on the home screen — trip cards + FAB only.
- Do **not** put share/copy links on the trip list.
- Do **not** show brand AppBar on trip details or guest briefing.
- Do **not** show Overview or Share as view-mode accordions.
- Do **not** put Google Maps links in congregation or stay UI.
- Do **not** add print controls on the guest page.
- Do **not** reintroduce long opaque share tokens when short ~16-char tokens work; hash at rest.
- Do **not** use a shared environment passphrase as “login.”
- Do **not** require guests to create accounts.
- Do **not** block MVP on PWA, email delivery, or Airbnb scraping.

---

## 12. Implementation order

1. Scaffold Next.js App Router + TS + MUI theme/fonts/AppShell.
2. Auth (register/sign-in/session) + onboarding + middleware/guards.
3. Trips list + create + ownership isolation.
4. Edit/view accordion UX + section APIs (Overview → … → Congregations).
5. Documents (stay + multi insurance).
6. Share tokens + guest redeem + modal share panel.
7. Collaborator membership + permissions enforcement.
8. Polish mobile density, empty states, revoke/rotate copy-once messaging.
9. README: how to run, env vars, roles.

---

## 13. Tone for your work

Act as an autonomous implementer. Prefer matching this locked UX over redesign. When a choice is unspecified (exact OAuth provider, exact collaborator invite UX), pick the simplest secure option, document it in the README, and keep moving. Deliver a working shareable browser app Shibu can open on a phone and use with family.
