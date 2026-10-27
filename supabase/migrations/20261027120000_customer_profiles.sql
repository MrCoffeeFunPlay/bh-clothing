-- BH Clothing: customer profiles for real accounts (Supabase Auth with email verification).
-- Each signed-in user can read, create and update only their own profile. Visitors cannot read any profile.
-- The email address itself lives in auth.users and is not copied here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (length(first_name) <= 80),
  last_name text not null default '' check (length(last_name) <= 80),
  username text not null default '' check (length(username) <= 40),
  birthday date check (birthday is null or birthday > date '1900-01-01'),
  country text not null default '' check (length(country) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users create their own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
