-- Cofinder · valoración al final del evento (de 1 a 5 y un comentario opcional)
-- Ejecutar después de 2026-11-nota-escrita.sql. Se puede ejecutar más de una vez.
-- La organización la ve en #resum (con el PIN de Admin).

create table if not exists public.feedback (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  score          int  not null check (score between 1 and 5),
  comment        text check (length(comment) <= 1000),
  created_at     timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.submit_feedback(p_id uuid, p_score int, p_comment text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.participants where id = p_id and not removed) then
    return jsonb_build_object('error', 'not_found');
  end if;
  if p_score is null or p_score not between 1 and 5 then return jsonb_build_object('error', 'invalid'); end if;
  insert into public.feedback (participant_id, score, comment)
  values (p_id, p_score, nullif(left(btrim(coalesce(p_comment, '')), 1000), ''))
  on conflict (participant_id) do update
    set score = excluded.score, comment = excluded.comment, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mod_get_feedback(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object('feedback', coalesce((
    select jsonb_agg(jsonb_build_object('name', p.name, 'role', p.role, 'score', f.score,
                                        'comment', f.comment, 'createdAt', f.created_at) order by f.created_at desc)
    from public.feedback f join public.participants p on p.id = f.participant_id
    where not p.removed), '[]'::jsonb));
end $$;

revoke all on function public.submit_feedback(uuid, int, text) from public;
grant execute on function public.submit_feedback(uuid, int, text) to anon, authenticated;
revoke all on function public.mod_get_feedback(text) from public;
grant execute on function public.mod_get_feedback(text) to anon, authenticated;
