create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.frequency_color(p_primary text)
returns text
language sql
immutable
as $$
  select case p_primary
    when 'philosophy' then '#6d5a8d'
    when 'music' then '#9ab9db'
    when 'literature' then '#92bcc4'
    when 'cinema' then '#6c4350'
    when 'writing' then '#d6e3f0'
    when 'cosmos' then '#49679f'
    when 'walking' then '#6ca89a'
    when 'mind' then '#847c96'
    else '#8b96aa'
  end;
$$;

create table if not exists public.stars (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  primary_frequency text not null check (
    primary_frequency in (
      'philosophy',
      'music',
      'literature',
      'cinema',
      'writing',
      'cosmos',
      'walking',
      'mind'
    )
  ),
  secondary_frequencies text[] not null default '{}'::text[] check (
    secondary_frequencies <@ array[
      'philosophy',
      'music',
      'literature',
      'cinema',
      'writing',
      'cosmos',
      'walking',
      'mind'
    ]::text[]
  ),
  current_state text not null check (
    current_state in (
      'solo',
      'understood',
      'silent',
      'recovering',
      'present',
      'gentle-link'
    )
  ),
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(secondary_frequencies) <= 3),
  check (not (primary_frequency = any(secondary_frequencies)))
);

create table if not exists public.star_secrets (
  star_id uuid primary key references public.stars(id) on delete cascade,
  edit_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.presence (
  star_id uuid primary key references public.stars(id) on delete cascade,
  is_online boolean not null default true,
  last_seen timestamptz not null default now(),
  world_x double precision not null default 0,
  world_y double precision not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.presence
add column if not exists world_x double precision not null default 0;

alter table public.presence
add column if not exists world_y double precision not null default 0;

create table if not exists public.resonance (
  id uuid primary key default gen_random_uuid(),
  from_star_id uuid not null references public.stars(id) on delete cascade,
  to_star_id uuid not null references public.stars(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_star_id <> to_star_id)
);

create index if not exists stars_created_at_idx on public.stars (created_at desc);
create index if not exists presence_last_seen_idx on public.presence (last_seen desc);
create index if not exists resonance_created_at_idx on public.resonance (created_at desc);
create index if not exists resonance_from_star_id_idx on public.resonance (from_star_id);
create index if not exists resonance_to_star_id_idx on public.resonance (to_star_id);

drop trigger if exists stars_touch_updated_at on public.stars;
create trigger stars_touch_updated_at
before update on public.stars
for each row
execute function public.touch_updated_at();

drop trigger if exists presence_touch_updated_at on public.presence;
create trigger presence_touch_updated_at
before update on public.presence
for each row
execute function public.touch_updated_at();

create or replace view public.stars_live as
select
  s.id,
  s.nickname,
  s.primary_frequency,
  s.secondary_frequencies,
  s.current_state,
  s.color,
  s.created_at,
  s.updated_at,
  p.last_seen,
  p.world_x,
  p.world_y,
  coalesce(p.is_online, false) and p.last_seen > now() - interval '60 seconds' as is_online
from public.stars s
left join public.presence p on p.star_id = s.id;

alter table public.stars enable row level security;
alter table public.star_secrets enable row level security;
alter table public.presence enable row level security;
alter table public.resonance enable row level security;

revoke all on public.star_secrets from anon, authenticated;
grant select on public.stars to anon, authenticated;
grant select on public.presence to anon, authenticated;
grant select on public.resonance to anon, authenticated;
grant select on public.stars_live to anon, authenticated;

drop policy if exists "stars are readable" on public.stars;
create policy "stars are readable"
on public.stars
for select
to anon, authenticated
using (true);

drop policy if exists "presence is readable" on public.presence;
create policy "presence is readable"
on public.presence
for select
to anon, authenticated
using (true);

drop policy if exists "resonance is readable" on public.resonance;
create policy "resonance is readable"
on public.resonance
for select
to anon, authenticated
using (true);

create or replace function public.create_star(
  p_primary text,
  p_secondary text[] default '{}'::text[],
  p_state text default 'present',
  p_nickname text default null
)
returns table (
  star_id uuid,
  edit_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_star_id uuid;
  v_edit_token uuid;
begin
  insert into public.stars (
    nickname,
    primary_frequency,
    secondary_frequencies,
    current_state,
    color
  )
  values (
    nullif(trim(p_nickname), ''),
    p_primary,
    coalesce(p_secondary, '{}'::text[]),
    p_state,
    public.frequency_color(p_primary)
  )
  returning id into v_star_id;

  insert into public.star_secrets (star_id)
  values (v_star_id)
  returning public.star_secrets.edit_token into v_edit_token;

  insert into public.presence (star_id, is_online, last_seen, world_x, world_y)
  values (v_star_id, true, now(), 0, 0);

  return query
  select v_star_id, v_edit_token;
end;
$$;

create or replace function public.update_star_profile(
  p_star_id uuid,
  p_edit_token uuid,
  p_primary text,
  p_secondary text[] default '{}'::text[],
  p_state text default 'present',
  p_nickname text default null
)
returns public.stars_live
language plpgsql
security definer
set search_path = public
as $$
declare
  v_star public.stars_live;
begin
  perform 1
  from public.star_secrets
  where star_id = p_star_id
    and edit_token = p_edit_token;

  if not found then
    raise exception 'invalid star token';
  end if;

  update public.stars
  set
    nickname = nullif(trim(p_nickname), ''),
    primary_frequency = p_primary,
    secondary_frequencies = coalesce(p_secondary, '{}'::text[]),
    current_state = p_state,
    color = public.frequency_color(p_primary)
  where id = p_star_id;

  insert into public.presence (star_id, is_online, last_seen, world_x, world_y)
  values (p_star_id, true, now(), 0, 0)
  on conflict (star_id)
  do update set
    is_online = true,
    last_seen = now();

  select *
  into v_star
  from public.stars_live
  where id = p_star_id;

  return v_star;
end;
$$;

create or replace function public.touch_presence(
  p_star_id uuid,
  p_edit_token uuid,
  p_world_x double precision default null,
  p_world_y double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
  from public.star_secrets
  where star_id = p_star_id
    and edit_token = p_edit_token;

  if not found then
    raise exception 'invalid star token';
  end if;

  insert into public.presence (star_id, is_online, last_seen, world_x, world_y)
  values (
    p_star_id,
    true,
    now(),
    coalesce(p_world_x, 0),
    coalesce(p_world_y, 0)
  )
  on conflict (star_id)
  do update set
    is_online = true,
    last_seen = now(),
    world_x = coalesce(p_world_x, public.presence.world_x, 0),
    world_y = coalesce(p_world_y, public.presence.world_y, 0);
end;
$$;

create or replace function public.leave_presence(
  p_star_id uuid,
  p_edit_token uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
  from public.star_secrets
  where star_id = p_star_id
    and edit_token = p_edit_token;

  if not found then
    raise exception 'invalid star token';
  end if;

  update public.presence
  set
    is_online = false,
    last_seen = now()
  where star_id = p_star_id;
end;
$$;

create or replace function public.send_resonance(
  p_from_star_id uuid,
  p_edit_token uuid,
  p_to_star_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resonance_id uuid;
begin
  perform 1
  from public.star_secrets
  where star_id = p_from_star_id
    and edit_token = p_edit_token;

  if not found then
    raise exception 'invalid star token';
  end if;

  insert into public.resonance (from_star_id, to_star_id)
  values (p_from_star_id, p_to_star_id)
  returning id into v_resonance_id;

  return v_resonance_id;
end;
$$;

grant execute on function public.create_star(text, text[], text, text) to anon, authenticated;
grant execute on function public.update_star_profile(uuid, uuid, text, text[], text, text) to anon, authenticated;
grant execute on function public.touch_presence(uuid, uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.leave_presence(uuid, uuid) to anon, authenticated;
grant execute on function public.send_resonance(uuid, uuid, uuid) to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.stars;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.presence;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.resonance;
  exception
    when duplicate_object then null;
  end;
end;
$$;
