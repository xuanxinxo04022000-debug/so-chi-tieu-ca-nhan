-- Chạy toàn bộ nội dung này trong Supabase Dashboard > SQL Editor > New query
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(14,0) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null default 'Khác',
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
alter table public.transactions enable row level security;

drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Bật Realtime để các thiết bị cập nhật khi có thay đổi.
alter publication supabase_realtime add table public.transactions;
