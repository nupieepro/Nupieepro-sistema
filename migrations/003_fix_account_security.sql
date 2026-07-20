-- ============================================================
-- Migração 003: Corrige escalonamento de privilégio + bug de role
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations 001/002.
-- ============================================================

-- 1. Permite role 'conselheiro' em convites (já era permitido em users,
--    mas faltava aqui — convite de Conselheiro quebrava com erro de constraint)
ALTER TABLE public.convites DROP CONSTRAINT IF EXISTS convites_role_check;
ALTER TABLE public.convites
  ADD CONSTRAINT convites_role_check
  CHECK (role = ANY (ARRAY['admin','coordenador','assessor','membro','conselheiro']));

-- 2. CRÍTICO: impede que o próprio usuário altere role/ativo/coordenadoria_id
--    de si mesmo. A policy "users_update_self" só verifica id = auth.uid(),
--    sem checar QUAIS colunas mudaram — qualquer usuário logado conseguia
--    rodar supabase.from('users').update({role:'admin'}).eq('id', meuId) e
--    virar admin. Este trigger bloqueia isso pra qualquer usuário não-admin,
--    independente de qual policy permitiu o update.
CREATE OR REPLACE FUNCTION public.protect_self_update_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.ativo IS DISTINCT FROM OLD.ativo
       OR NEW.coordenadoria_id IS DISTINCT FROM OLD.coordenadoria_id THEN
      RAISE EXCEPTION 'Não é permitido alterar role, status ativo ou coordenadoria da própria conta.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_self_update_users_trigger ON public.users;
CREATE TRIGGER protect_self_update_users_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_self_update_users();

REVOKE EXECUTE ON FUNCTION public.protect_self_update_users() FROM anon, authenticated, PUBLIC;

-- 3. CRÍTICO: impede que um Coordenador (não-admin) crie um convite com
--    role='admin'. A policy "convites_insert" só checava is_coord_or_admin(),
--    sem checar QUAL role estava sendo concedida no convite — um coordenador
--    conseguia gerar um convite de admin pra qualquer e-mail.
DROP POLICY IF EXISTS "convites_insert" ON public.convites;
CREATE POLICY "convites_insert" ON public.convites FOR INSERT WITH CHECK (
  public.is_coord_or_admin() AND (role <> 'admin' OR public.is_admin())
);

-- 4. Hardening: auto_confirm_email é função de trigger, não deveria ser
--    chamável via RPC público (mesmo padrão já aplicado a handle_new_user
--    na migração 002).
REVOKE EXECUTE ON FUNCTION public.auto_confirm_email() FROM anon, authenticated, PUBLIC;
