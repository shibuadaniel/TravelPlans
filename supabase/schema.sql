-- Run this in the Supabase SQL editor after creating a project.
-- Auth lives in auth.users. This table is the app profile.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  onboarded_at text,
  created_at text not null,
  pin_hash text,
  share_gate integer not null default 0
);

create table if not exists public.trips (
  id text primary key,
  owner_user_id uuid not null references public.users (id),
  destination text not null default '',
  travel_date text,
  return_date text,
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);

create table if not exists public.trip_members (
  trip_id text not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator')),
  created_at text not null,
  primary key (trip_id, user_id)
);

create table if not exists public.flights (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  airline text not null default '',
  flight_number text not null default '',
  from_airport text not null default '',
  to_airport text not null default '',
  depart_at text,
  arrive_at text,
  confirmation text not null default '',
  passengers text not null default '',
  terminal_gate text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.car_rentals (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  company text not null default '',
  confirmation text not null default '',
  pickup_place text not null default '',
  dropoff_place text not null default '',
  pickup_at text,
  dropoff_at text,
  vehicle_class text not null default '',
  contact_phone text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.stays (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  name text not null default '',
  address text not null default '',
  check_in text,
  check_out text,
  document_name text,
  document_mime text,
  document_size integer,
  document_key text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.congregations (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  name text not null default '',
  address text not null default '',
  meeting_times text not null default '',
  jw_org_url text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.insurance (
  trip_id text primary key references public.trips (id) on delete cascade,
  provider text not null default '',
  policy_number text not null default '',
  phone text not null default '',
  coverage_start text,
  coverage_end text,
  claim_notes text not null default '',
  updated_at text not null
);

create table if not exists public.insurance_documents (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  document_name text not null,
  document_mime text not null,
  document_size integer not null,
  document_key text not null,
  sort_order integer not null default 0,
  created_at text not null
);

create table if not exists public.share_links (
  id text primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  token_hash text not null unique,
  label text,
  created_at text not null,
  revoked_at text,
  last_used_at text
);

create table if not exists public.place_photos (
  place_key text primary key,
  image_url text not null default '',
  credit text not null default '',
  credit_url text not null default '',
  fetched_at text not null
);

create index if not exists idx_members_user on public.trip_members (user_id);
create index if not exists idx_flights_trip on public.flights (trip_id, sort_order);
create index if not exists idx_cars_trip on public.car_rentals (trip_id, sort_order);
create index if not exists idx_stays_trip on public.stays (trip_id, sort_order);
create index if not exists idx_congregations_trip on public.congregations (trip_id, sort_order);
create index if not exists idx_insurance_docs_trip on public.insurance_documents (trip_id, sort_order);
create index if not exists idx_share_trip on public.share_links (trip_id);

create table if not exists public.auth_attempts (
  id text primary key,
  attempt_key text not null,
  created_at text not null
);

create index if not exists idx_auth_attempts_key on public.auth_attempts (attempt_key, created_at);

-- The app talks to Postgres with DATABASE_URL, which bypasses row level security.
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.flights enable row level security;
alter table public.car_rentals enable row level security;
alter table public.stays enable row level security;
alter table public.congregations enable row level security;
alter table public.insurance enable row level security;
alter table public.insurance_documents enable row level security;
alter table public.share_links enable row level security;
alter table public.place_photos enable row level security;
alter table public.auth_attempts enable row level security;

insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;
