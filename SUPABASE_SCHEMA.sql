-- DE.Fit Admin Analytics Schema
-- Run this in Supabase > SQL Editor

create table if not exists public.users (
  id         text primary key,
  username   text not null,
  admin      boolean default false,
  created_at timestamptz default now(),
  last_seen  timestamptz default now()
);

create table if not exists public.events (
  id         bigserial primary key,
  user_id    text not null,
  username   text,
  event_type text not null,   -- login | tab_view | scan_ai | health_imported
  payload    jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.food_logs (
  id         bigserial primary key,
  user_id    text not null,
  username   text,
  food_name  text,
  calories   int,
  protein    numeric(6,2),
  carbs      numeric(6,2),
  fat        numeric(6,2),
  logged_at  timestamptz default now()
);

-- Indexes for common queries
create index if not exists events_created_at_idx  on public.events(created_at desc);
create index if not exists events_user_id_idx     on public.events(user_id);
create index if not exists events_type_idx        on public.events(event_type);
create index if not exists food_logs_logged_at_idx on public.food_logs(logged_at desc);
create index if not exists food_logs_user_id_idx  on public.food_logs(user_id);

-- Disable RLS (personal app — anon key has full access)
alter table public.users     disable row level security;
alter table public.events    disable row level security;
alter table public.food_logs disable row level security;
