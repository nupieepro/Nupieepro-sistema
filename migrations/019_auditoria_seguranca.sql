-- ============================================================================
-- 019 — Trilha de auditoria de segurança (somente-acréscimo / append-only)
--
-- O que faz:
--   1. Cria public.auditoria_seguranca: registro imutável de mudanças sensíveis.
--   2. Triggers em public.users (papel, ativo, coordenadoria, e-mail) e
--      public.convites registram QUEM fez, O QUE mudou, ANTES e DEPOIS.
--      => detecção de escalação de privilégio e base para auditoria (LGPD).
--   3. Ninguém (nem admin, nem service_role) consegue editar/apagar linhas:
--      um trigger BEFORE UPDATE/DELETE bloqueia. Só leitura para admin.
--   4. RPC admin_seguranca_resumo(): painel para o admin (promoções a admin,
--      eventos por tipo, últimos eventos).
--
-- Segurança do próprio mecanismo:
--   * As funções de log são SECURITY DEFINER com search_path fixo.
--   * Têm bloco EXCEPTION: uma falha de log NUNCA bloqueia a operação de negócio.
--   * Não grava e-mail completo (mascarado) nem senha/token.
--
-- Reverter: DROP TRIGGER ... ; DROP FUNCTION ...; DROP TABLE public.auditoria_seguranca;
-- ============================================================================

create table if not exists public.auditoria_seguranca (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz not null default now(),
  ator        uuid,                       -- auth.uid(); NULL = SQL Editor / service_role
  tabela      text not null,
  operacao    text not null,              -- INSERT | UPDATE | DELETE
  registro_id text,
  campo       text,
  antes       text,
  depois      text
);
create index if not exists auditoria_seguranca_criado_em_idx on public.auditoria_seguranca (criado_em desc);
create index if not exists auditoria_seguranca_tabela_idx    on public.auditoria_seguranca (tabela, operacao);

alter table public.auditoria_seguranca enable row level security;

drop policy if exists auditoria_seguranca_admin_select on public.auditoria_seguranca;
create policy auditoria_seguranca_admin_select on public.auditoria_seguranca
  for select to authenticated using (public.is_admin());

revoke all on table public.auditoria_seguranca from anon, authenticated;
grant select on table public.auditoria_seguranca to authenticated;

-- Imutabilidade: bloqueia UPDATE e DELETE para qualquer papel.
create or replace function public.auditoria_seguranca_imutavel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'auditoria_seguranca é somente-acréscimo (append-only)';
end $$;
revoke all on function public.auditoria_seguranca_imutavel() from public, anon, authenticated;

drop trigger if exists auditoria_seguranca_no_update on public.auditoria_seguranca;
create trigger auditoria_seguranca_no_update before update or delete on public.auditoria_seguranca
  for each row execute function public.auditoria_seguranca_imutavel();

-- Mascara e-mail: "maria@x.com" -> "m***@x.com" (LGPD: minimização).
create or replace function public._mascara_email(p text)
returns text language sql immutable set search_path = public as $$
  select case when p is null or position('@' in p) = 0 then null
              else left(p, 1) || '***' || substr(p, position('@' in p)) end
$$;
revoke all on function public._mascara_email(text) from public, anon, authenticated;

-- Log de mudanças sensíveis em users
create or replace function public.audit_users_sensivel()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ator uuid := auth.uid();
begin
  begin
    if tg_op = 'INSERT' then
      insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, depois)
      values (v_ator, 'users', 'INSERT', new.id::text, 'role', new.role);
    elsif tg_op = 'DELETE' then
      insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, antes)
      values (v_ator, 'users', 'DELETE', old.id::text, 'role', old.role);
    else
      if new.role is distinct from old.role then
        insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, antes, depois)
        values (v_ator, 'users', 'UPDATE', new.id::text, 'role', old.role, new.role);
      end if;
      if new.ativo is distinct from old.ativo then
        insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, antes, depois)
        values (v_ator, 'users', 'UPDATE', new.id::text, 'ativo', old.ativo::text, new.ativo::text);
      end if;
      if new.coordenadoria_id is distinct from old.coordenadoria_id then
        insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, antes, depois)
        values (v_ator, 'users', 'UPDATE', new.id::text, 'coordenadoria_id', old.coordenadoria_id::text, new.coordenadoria_id::text);
      end if;
      if new.email is distinct from old.email then
        insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, antes, depois)
        values (v_ator, 'users', 'UPDATE', new.id::text, 'email', public._mascara_email(old.email), public._mascara_email(new.email));
      end if;
    end if;
  exception when others then
    raise warning 'audit_users_sensivel falhou: %', sqlerrm;  -- nunca bloqueia a operação
  end;
  return null;
end $$;
revoke all on function public.audit_users_sensivel() from public, anon, authenticated;

drop trigger if exists audit_users_sensivel_trg on public.users;
create trigger audit_users_sensivel_trg after insert or update or delete on public.users
  for each row execute function public.audit_users_sensivel();

-- Log de criação/remoção de convites (quem convidou para qual papel)
create or replace function public.audit_convites()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ator uuid := auth.uid();
begin
  begin
    if tg_op = 'INSERT' then
      insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, depois)
      values (v_ator, 'convites', 'INSERT', new.id::text, 'role:' || coalesce(new.role,'?'), public._mascara_email(new.email));
    elsif tg_op = 'DELETE' then
      insert into public.auditoria_seguranca(ator, tabela, operacao, registro_id, campo, antes)
      values (v_ator, 'convites', 'DELETE', old.id::text, 'role:' || coalesce(old.role,'?'), public._mascara_email(old.email));
    end if;
  exception when others then
    raise warning 'audit_convites falhou: %', sqlerrm;
  end;
  return null;
end $$;
revoke all on function public.audit_convites() from public, anon, authenticated;

drop trigger if exists audit_convites_trg on public.convites;
create trigger audit_convites_trg after insert or delete on public.convites
  for each row execute function public.audit_convites();

-- Resumo para o painel do admin
create or replace function public.admin_seguranca_resumo()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'gerado_em', now(),
    'eventos_30d', coalesce((select jsonb_object_agg(k, n) from (
        select tabela || ':' || operacao || ':' || coalesce(campo,'-') as k, count(*) n
        from public.auditoria_seguranca where criado_em > now() - interval '30 days' group by 1) s), '{}'::jsonb),
    'promocoes_para_admin_90d', coalesce((select jsonb_agg(to_jsonb(p)) from (
        select criado_em, ator, registro_id, antes, depois from public.auditoria_seguranca
        where tabela = 'users' and campo = 'role' and depois = 'admin' and criado_em > now() - interval '90 days'
        order by criado_em desc) p), '[]'::jsonb),
    'ultimos_eventos', coalesce((select jsonb_agg(to_jsonb(e)) from (
        select criado_em, ator, tabela, operacao, registro_id, campo, antes, depois
        from public.auditoria_seguranca order by id desc limit 50) e), '[]'::jsonb),
    'admins_ativos', (select count(*) from public.users where role = 'admin' and coalesce(ativo, true))
  );
end $$;
revoke all on function public.admin_seguranca_resumo() from public, anon;
grant execute on function public.admin_seguranca_resumo() to authenticated;
