-- inst-tracker schema
-- Mirrors the old Firestore shape: users/{uid} -> profiles,
-- users/{uid}/insights/latest -> insights, users/{uid}/private/instagram -> instagram_tokens.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ig_user_id text unique not null,
  ig_username text,
  ig_account_type text default 'Business',
  page_id text,
  followers_count int,
  follows_count int,
  plan text not null default 'free',
  instagram_connected boolean not null default true,
  connected_at timestamptz default now()
);

create table public.insights (
  user_id uuid primary key references auth.users (id) on delete cascade,
  account_insights jsonb,
  media jsonb,
  top_commenters jsonb,
  refreshed_at timestamptz default now()
);

-- Access tokens. No RLS policies are defined for this table on purpose --
-- Postgres RLS defaults to deny-all once enabled, so only the service role
-- (used inside Edge Functions) can ever read or write it. The anon/authenticated
-- client roles have zero access, matching the old "allow read, write: if false" rule.
create table public.instagram_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  token_obtained_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.insights enable row level security;
alter table public.instagram_tokens enable row level security;

-- Users can read their own profile / insights. All writes happen from Edge
-- Functions using the service role key, which bypasses RLS entirely -- so
-- there are deliberately no insert/update/delete policies for client roles.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "insights_select_own"
  on public.insights for select
  using (auth.uid() = user_id);
