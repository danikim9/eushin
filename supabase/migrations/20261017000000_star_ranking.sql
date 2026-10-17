-- Star ranking: children whose parent opted in are ranked by stars across every family.
-- Other families' rows stay private: star_ranking() returns only a masked name (first letter),
-- the star count and the theme. A parent's own children show their full name.
-- Until this runs the ranking says it cannot load, and each child's opt-in stays on the device.
alter table public.children add column if not exists ranked boolean not null default false;
create index if not exists children_ranked_stars_idx on public.children (stars desc) where ranked;

-- kid_id is set only for the caller's own children, so the app can find the child who is playing.
-- Top 50 plus any of the caller's own ranked children below that.
create or replace function public.star_ranking()
returns table (rank integer, name text, stars integer, theme text, mine boolean, kid_id uuid)
language sql stable security definer set search_path = '' as $$
  with r as (
    select c.id, c.name, c.stars, c.theme, c.user_id = auth.uid() as mine,
           (rank() over (order by c.stars desc))::integer as rank,
           row_number() over (order by c.stars desc, c.created_at) as pos
    from public.children c
    where c.ranked
  )
  select r.rank,
         case when r.mine then r.name else left(r.name, 1) || repeat('*', least(greatest(char_length(r.name) - 1, 1), 3)) end,
         r.stars, r.theme, r.mine, case when r.mine then r.id end
  from r
  where auth.uid() is not null and (r.pos <= 50 or r.mine)
  order by r.pos;
$$;
revoke execute on function public.star_ranking() from public, anon;
grant execute on function public.star_ranking() to authenticated;
