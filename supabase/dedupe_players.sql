begin;

-- Allow cleanup/backfill before uniqueness enforcement.
drop index if exists public.players_first_last_name_idx;

-- Backfill missing first/last names from display_name when possible.
update public.players
set
  first_name = coalesce(
    nullif(trim(first_name), ''),
    lower(split_part(regexp_replace(trim(display_name), '\\s+', ' ', 'g'), ' ', 1))
  ),
  last_name = coalesce(
    nullif(trim(last_name), ''),
    nullif(
      lower(
        trim(
          substr(
            regexp_replace(trim(display_name), '\\s+', ' ', 'g'),
            length(split_part(regexp_replace(trim(display_name), '\\s+', ' ', 'g'), ' ', 1)) + 2
          )
        )
      ),
      ''
    )
  )
where coalesce(trim(display_name), '') <> '';

with ranked as (
  select
    id,
    first_value(id) over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as rn
  from public.players
  where coalesce(trim(first_name), '') <> ''
    and coalesce(trim(last_name), '') <> ''
),
replacements as (
  select id as duplicate_id, canonical_id
  from ranked
  where rn > 1
)
update public.round_players rp
set player_id = r.canonical_id
from replacements r
where rp.player_id = r.duplicate_id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as rn
  from public.players
  where coalesce(trim(first_name), '') <> ''
    and coalesce(trim(last_name), '') <> ''
),
replacements as (
  select id as duplicate_id, canonical_id
  from ranked
  where rn > 1
)
update public.hole_scores hs
set player_id = r.canonical_id
from replacements r
where hs.player_id = r.duplicate_id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as rn
  from public.players
  where coalesce(trim(first_name), '') <> ''
    and coalesce(trim(last_name), '') <> ''
),
replacements as (
  select id as duplicate_id, canonical_id
  from ranked
  where rn > 1
)
update public.ledger_entries le
set player_id = r.canonical_id
from replacements r
where le.player_id = r.duplicate_id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as rn
  from public.players
  where coalesce(trim(first_name), '') <> ''
    and coalesce(trim(last_name), '') <> ''
),
replacements as (
  select id as duplicate_id, canonical_id
  from ranked
  where rn > 1
)
update public.round_junk_events je
set player_id = r.canonical_id
from replacements r
where je.player_id = r.duplicate_id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as rn
  from public.players
  where coalesce(trim(first_name), '') <> ''
    and coalesce(trim(last_name), '') <> ''
),
replacements as (
  select id as duplicate_id, canonical_id
  from ranked
  where rn > 1
)
update public.round_closest_events ce
set winner_player_id = r.canonical_id
from replacements r
where ce.winner_player_id = r.duplicate_id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by lower(trim(first_name)), lower(trim(last_name))
      order by created_at nulls last, id
    ) as rn
  from public.players
  where coalesce(trim(first_name), '') <> ''
    and coalesce(trim(last_name), '') <> ''
),
replacements as (
  select id as duplicate_id, canonical_id
  from ranked
  where rn > 1
)
delete from public.players p
using replacements r
where p.id = r.duplicate_id;

create unique index if not exists players_first_last_name_idx
  on public.players(first_name, last_name);

commit;
