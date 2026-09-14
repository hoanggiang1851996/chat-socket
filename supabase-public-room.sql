-- ============================================================
-- Bổ sung: PHÒNG CHAT CHUNG (public room)
-- Quy ước: tin nhắn có receiver = NULL là tin của kênh chung.
-- Chạy file này trong Supabase SQL Editor (sau supabase-schema.sql).
-- ============================================================

-- Cho phép receiver rỗng (tin phòng chung)
alter table public.messages alter column receiver drop not null;

-- SELECT: đọc được tin 1-1 của mình HOẶC mọi tin phòng chung
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (
    receiver is null
    or auth.uid() = sender
    or auth.uid() = receiver
  );

-- INSERT: gửi tin miễn là sender là chính mình (áp dụng cả phòng chung)
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (auth.uid() = sender);

-- UPDATE (thả reaction): người trong cuộc 1-1, hoặc bất kỳ ai với tin phòng chung
drop policy if exists "messages_update_participant" on public.messages;
create policy "messages_update_participant" on public.messages
  for update using (
    receiver is null
    or auth.uid() = sender
    or auth.uid() = receiver
  );
