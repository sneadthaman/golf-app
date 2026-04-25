create extension if not exists pgcrypto;

-- Core facility/course catalog
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  country text,
  latitude double precision,
  longitude double precision,
  provider text not null default 'golfcourseapi',
  provider_facility_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists facilities_provider_ref_idx
  on public.facilities(provider, provider_facility_ref);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete cascade,
  name text not null,
  hole_count int not null check (hole_count in (9, 18)),
  par_total int not null,
  handicap_mode text not null default 'standard18' check (handicap_mode in ('standard18', 'split9_replay')),
  provider text not null default 'golfcourseapi',
  provider_course_ref text not null,
  source_hash text,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists courses_provider_ref_idx
  on public.courses(provider, provider_course_ref);

create table if not exists public.tee_boxes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null,
  name text not null,
  color text,
  course_rating numeric(4,1) not null,
  slope int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, code)
);

create table if not exists public.course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  hole_number int not null check (hole_number > 0),
  par int not null check (par > 0),
  handicap_index int not null check (handicap_index > 0),
  yardage_by_tee_box jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, hole_number)
);

-- Round and scoring model (manual strokes per round-player)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  default_strokes_received int,
  last_used_strokes_received int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  tee_box_id uuid references public.tee_boxes(id),
  status text not null default 'active' check (status in ('active', 'complete')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_teams (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, name)
);

create table if not exists public.round_players (
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.round_teams(id) on delete cascade,
  strokes_received int not null check (strokes_received >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (round_id, player_id)
);

create table if not exists public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int not null check (hole_number > 0),
  player_id uuid not null references public.players(id) on delete cascade,
  gross_score int not null check (gross_score > 0),
  strokes_received int not null check (strokes_received >= 0),
  net_score int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, hole_number, player_id)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int,
  entry_type text not null,
  team_id uuid references public.round_teams(id),
  player_id uuid references public.players(id),
  points numeric(8,2) not null,
  description text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
