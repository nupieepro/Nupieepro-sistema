-- ============================================================
-- Migração 018: papel "observador" — vê tudo, não altera nada
-- AINDA NÃO aplicada em produção (quwpyrdxyibcbyzwfilb). Revisar antes.
-- ============================================================
--
-- Pedido: um login neutro que consiga visualizar o sistema inteiro (pra
-- demonstração, ex.: ENEGEP) sem poder mudar nada. Nenhum papel existente
-- serve: 'conselheiro' é leitura mas só de 5 páginas; Coord. Geral vê tudo
-- mas escreve (aprova, cria evento, edita demanda).
--
-- Desenho (defesa em profundidade, no banco — não só na tela):
--  1. LEITURA: is_admin_or_geral() — que as policies *_read da migração 010
--     já usam — passa a incluir o observador. Só amplia SELECT.
--  2. ESCRITA: policy RESTRICTIVE (E lógico com as demais) em INSERT/UPDATE/
--     DELETE de toda tabela do schema public com RLS ligada: observador
--     nunca passa, não importa quão permissiva seja a policy de escrita
--     existente (inclusive as "any authenticated"). Única exceção: UPDATE
--     da própria linha em public.users, pra concluir o perfil no 1º acesso
--     (o trigger protect_self_update_users já impede mudar role/ativo/coord).
--  3. consumir_convite() e handle_new_user() são SECURITY DEFINER e não
--     passam por RLS, então o cadastro por convite continua funcionando.
--
-- Limites conhecidos: marcar notificação como lida também é bloqueado
-- (é um UPDATE); tabelas criadas depois desta migração precisam repetir o
-- bloco 4. Rollback no final do arquivo.

-- 1. Aceita o novo role em users e convites.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin','coordenador','assessor','membro','conselheiro','observador']));

ALTER TABLE public.convites DROP CONSTRAINT IF EXISTS convites_role_check;
ALTER TABLE public.convites
  ADD CONSTRAINT convites_role_check
  CHECK (role = ANY (ARRAY['admin','coordenador','assessor','membro','conselheiro','observador']));

-- 2. Helper + leitura ampliada.
CREATE OR REPLACE FUNCTION public.is_observador()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'observador');
$$;
REVOKE EXECUTE ON FUNCTION public.is_observador() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_observador() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_or_geral()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR public.is_geral() OR public.is_observador();
$$;

-- 3. Escrita: bloqueio restritivo em todas as tabelas com RLS.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS observador_sem_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS observador_sem_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS observador_sem_delete ON public.%I', t);

    EXECUTE format('CREATE POLICY observador_sem_insert ON public.%I AS RESTRICTIVE FOR INSERT WITH CHECK (NOT public.is_observador())', t);
    EXECUTE format('CREATE POLICY observador_sem_delete ON public.%I AS RESTRICTIVE FOR DELETE USING (NOT public.is_observador())', t);

    IF t = 'users' THEN
      -- exceção: o observador conclui o próprio perfil (nome, apelido, aniversário)
      EXECUTE 'CREATE POLICY observador_sem_update ON public.users AS RESTRICTIVE FOR UPDATE
               USING (NOT public.is_observador() OR id = auth.uid())
               WITH CHECK (NOT public.is_observador() OR id = auth.uid())';
    ELSE
      EXECUTE format('CREATE POLICY observador_sem_update ON public.%I AS RESTRICTIVE FOR UPDATE USING (NOT public.is_observador()) WITH CHECK (NOT public.is_observador())', t);
    END IF;
  END LOOP;
END $$;

-- ROLLBACK (manual):
--   DO $$ DECLARE t text; BEGIN
--     FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
--       EXECUTE format('DROP POLICY IF EXISTS observador_sem_insert ON public.%I', t);
--       EXECUTE format('DROP POLICY IF EXISTS observador_sem_update ON public.%I', t);
--       EXECUTE format('DROP POLICY IF EXISTS observador_sem_delete ON public.%I', t);
--     END LOOP; END $$;
--   CREATE OR REPLACE FUNCTION public.is_admin_or_geral() RETURNS boolean LANGUAGE sql STABLE
--     SECURITY DEFINER SET search_path = public AS $$ SELECT public.is_admin() OR public.is_geral(); $$;
--   DROP FUNCTION public.is_observador();
--   (e recolocar users_role_check/convites_role_check sem 'observador', após migrar quem usa o role)
