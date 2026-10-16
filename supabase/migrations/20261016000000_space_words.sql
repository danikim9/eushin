-- Space Words: one family per account (shares this week's words), several children per family.
-- Every row belongs to the signed-in user; row level security keeps families apart.

create table public.families (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  week jsonb not null default '{"words": [], "sentences": []}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  stars integer not null default 0 check (stars >= 0),
  mastery jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index children_user_id_idx on public.children (user_id);

-- Keep payloads small: the week holds ~20 words and 2 sentences.
alter table public.families add constraint families_week_size check (pg_column_size(week) < 32768);
alter table public.children add constraint children_mastery_size check (pg_column_size(mastery) < 32768);

-- At most 6 children per account.
create function public.limit_children() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.children where user_id = new.user_id) >= 6 then
    raise exception 'too many children';
  end if;
  return new;
end $$;
create trigger children_limit before insert on public.children
  for each row execute function public.limit_children();

alter table public.families enable row level security;
alter table public.children enable row level security;

create policy "own family: select" on public.families for select to authenticated using (user_id = (select auth.uid()));
create policy "own family: insert" on public.families for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own family: update" on public.families for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own family: delete" on public.families for delete to authenticated using (user_id = (select auth.uid()));

create policy "own children: select" on public.children for select to authenticated using (user_id = (select auth.uid()));
create policy "own children: insert" on public.children for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own children: update" on public.children for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own children: delete" on public.children for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.families, public.children from anon;
grant select, insert, update, delete on public.families, public.children to authenticated;

-- Lets a signed-in parent delete their own account; families and children go with it (on delete cascade).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
