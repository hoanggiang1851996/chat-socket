-- ============================================================
-- SupaChat schema. Chạy toàn bộ file này trong Supabase SQL Editor.
--
-- QUAN TRỌNG: Bật Anonymous sign-in trong Dashboard:
--   Authentication -> Sign In / Providers -> Anonymous -> Enable
-- Vì app cho phép "nhập biệt danh là chat luôn" (không cần email).
-- ============================================================

-- 1) PROFILES: mở rộng auth.users (biệt danh, KHÔNG unique để cho phép trùng tên)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_emoji text default '🙂',
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- 2) FRIENDSHIPS: quan hệ bạn bè (2 chiều lưu 1 dòng)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted
  created_at timestamptz default now(),
  unique (requester, addressee)
);

-- 3) MESSAGES: tin nhắn 1-1
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles(id) on delete cascade,
  receiver uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  reaction text,               -- icon troll thả vào tin nhắn
  created_at timestamptz default now()
);

create index if not exists idx_messages_pair on public.messages (sender, receiver, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.messages    enable row level security;

-- PROFILES
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

-- FRIENDSHIPS
drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select using (auth.uid() = requester or auth.uid() = addressee);

drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own" on public.friendships
  for insert with check (auth.uid() = requester);

drop policy if exists "friendships_update_addressee" on public.friendships;
create policy "friendships_update_addressee" on public.friendships
  for update using (auth.uid() = requester or auth.uid() = addressee);

-- MESSAGES
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (auth.uid() = sender or auth.uid() = receiver);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (auth.uid() = sender);

drop policy if exists "messages_update_participant" on public.messages;
create policy "messages_update_participant" on public.messages
  for update using (auth.uid() = sender or auth.uid() = receiver);

-- ============================================================
-- REALTIME: bật cho messages
-- ============================================================
alter publication supabase_realtime add table public.messages;
