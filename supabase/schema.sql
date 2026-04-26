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
  external_player_ref text,
  first_name text,
  last_name text,
  display_name text not null,
  default_strokes_received int,
  last_used_strokes_received int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table if exists public.players add column if not exists external_player_ref text;
alter table if exists public.players add column if not exists first_name text;
alter table if exists public.players add column if not exists last_name text;
create unique index if not exists players_external_player_ref_idx
  on public.players(external_player_ref);
create unique index if not exists players_first_last_name_idx
  on public.players(first_name, last_name);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id),
  external_round_ref text,
  course_external_ref text,
  course_name text,
  tee_box_external_ref text,
  tee_box_id uuid references public.tee_boxes(id),
  status text not null default 'active' check (status in ('active', 'complete')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table if exists public.rounds add column if not exists external_round_ref text;
alter table if exists public.rounds add column if not exists course_external_ref text;
alter table if exists public.rounds add column if not exists course_name text;
alter table if exists public.rounds add column if not exists tee_box_external_ref text;
alter table if exists public.rounds alter column course_id drop not null;
create unique index if not exists rounds_external_round_ref_idx
  on public.rounds(external_round_ref);

create table if not exists public.round_teams (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  external_team_ref text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, name)
);
alter table if exists public.round_teams add column if not exists external_team_ref text;
create unique index if not exists round_teams_round_external_team_ref_idx
  on public.round_teams(round_id, external_team_ref);

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

create table if not exists public.round_junk_events (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int not null check (hole_number > 0),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.round_teams(id) on delete cascade,
  event_type text not null,
  points numeric(8,2),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.round_closest_events (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number int not null check (hole_number > 0),
  track text not null check (track in ('par3', 'par5')),
  winner_player_id uuid references public.players(id) on delete set null,
  winner_team_id uuid references public.round_teams(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, track, hole_number)
);

create table if not exists public.round_presses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  external_press_ref text not null,
  side text not null check (side in ('front', 'back')),
  starting_hole int not null check (starting_hole > 0),
  ending_hole int not null check (ending_hole > 0),
  team_that_was_down_id uuid not null references public.round_teams(id) on delete cascade,
  value_points numeric(8,2) not null,
  created_by text not null,
  trigger_hole int not null check (trigger_hole > 0),
  source_match_id text,
  status text not null check (status in ('active', 'settled')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, external_press_ref)
);

-- Round snapshot persistence (web harness / integration layer)
create table if not exists public.round_snapshots (
  id uuid primary key default gen_random_uuid(),
  round_id text not null unique,
  status text not null default 'active' check (status in ('active', 'complete')),
  round_metadata jsonb not null default '{}'::jsonb,
  players jsonb not null default '[]'::jsonb,
  teams jsonb not null default '[]'::jsonb,
  hole_scores jsonb not null default '[]'::jsonb,
  junk_events jsonb not null default '[]'::jsonb,
  closest_events_par3 jsonb not null default '[]'::jsonb,
  closest_events_par5 jsonb not null default '[]'::jsonb,
  presses jsonb not null default '[]'::jsonb,
  final_ledger jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill-safe alters for existing projects that already ran older schema versions.
alter table if exists public.players add column if not exists external_player_ref text;
alter table if exists public.rounds add column if not exists external_round_ref text;
alter table if exists public.rounds add column if not exists course_external_ref text;
alter table if exists public.rounds add column if not exists course_name text;
alter table if exists public.rounds add column if not exists tee_box_external_ref text;
alter table if exists public.round_teams add column if not exists external_team_ref text;
alter table if exists public.round_closest_events add column if not exists winner_player_id uuid;
alter table if exists public.rounds alter column course_id drop not null;
