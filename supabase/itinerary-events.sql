-- Itinerary events: things the trip owner or a collaborator adds to a day on the itinerary.
-- Run this once in the Supabase SQL editor. It is safe to run again.
-- supabase/schema.sql has the same statements for new projects.

create table if not exists public.itinerary_events (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  event_date text not null,
  title text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_itinerary_events_trip on public.itinerary_events (trip_id, event_date, sort_order);

-- The app talks to Postgres with DATABASE_URL, which bypasses row level security.
alter table public.itinerary_events enable row level security;
