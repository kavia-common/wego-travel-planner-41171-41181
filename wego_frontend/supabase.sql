-- Optional public user profiles table for the WEGO frontend.
-- Run this in Supabase Dashboard -> SQL Editor if you want a visible table for user profile data.
-- NOTE: Supabase Auth users are managed in auth.users and appear under Auth -> Users (not as a public table).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow users to view their own profile row
create policy "Profiles are viewable by the owner"
on public.profiles
for select
using (auth.uid() = id);

-- Allow users to create their own profile row (insert)
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Allow users to update their own profile row (update)
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
