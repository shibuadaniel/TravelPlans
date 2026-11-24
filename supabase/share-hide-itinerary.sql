-- Hide the itinerary on a shared link. Safe to run more than once.
alter table public.trips
  add column if not exists share_hide_itinerary integer not null default 0;
