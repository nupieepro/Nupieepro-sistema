-- ============================================================
-- Migração 005: Corrige policies de RLS liberadas demais + hardening
-- Aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
--
-- Achado pelo linter de segurança do Supabase (advisors): várias tabelas
-- tinham policies de INSERT/UPDATE/DELETE com `USING (true)`/`WITH CHECK (true)`,
-- ou seja, qualquer usuário autenticado conseguia criar, editar ou apagar
-- QUALQUER linha da tabela — não só as da própria coordenadoria/autoria.
-- O app nunca checava isso no client (confirmado via auditoria do código:
-- nenhuma chamada a essas tabelas em js/pages.js passa por Permissoes.pode()
-- antes de disparar o INSERT/UPDATE/DELETE), então o RLS era a ÚNICA
-- proteção real — e estava, na prática, desligado pra escrita.
--
-- Critério usado: o mesmo já aplicado em eventos/demandas/vendas/despesas
-- (leitura liberada pra quem está logado, escrita restrita a
-- coordenador/admin via public.is_coord_or_admin()), EXCETO onde a tabela
-- tem dono claro (votos) ou é genuinamente pública por design
-- (inscricoes_eventos — NÃO mexido aqui, ver nota no final).
-- ============================================================

-- 1. parcerias (Parcerias e Patrocínios): leitura ok, escrita liberada demais.
DROP POLICY IF EXISTS "parcerias_insert" ON public.parcerias;
DROP POLICY IF EXISTS "parcerias_update" ON public.parcerias;
DROP POLICY IF EXISTS "parcerias_delete" ON public.parcerias;
CREATE POLICY "parcerias_write" ON public.parcerias FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

-- 2. pops (Cofre de POPs): mesmo problema.
DROP POLICY IF EXISTS "pops_insert" ON public.pops;
DROP POLICY IF EXISTS "pops_update" ON public.pops;
DROP POLICY IF EXISTS "pops_delete" ON public.pops;
CREATE POLICY "pops_write" ON public.pops FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

-- 3. tracker_social (Social Media Tracker): insert/update liberados demais.
DROP POLICY IF EXISTS "tracker_insert" ON public.tracker_social;
DROP POLICY IF EXISTS "tracker_update" ON public.tracker_social;
CREATE POLICY "tracker_write" ON public.tracker_social FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

-- 4. talentos (Banco de Talentos): tinha uma única policy ALL/true cobrindo
--    leitura e escrita. Como guarda PII de candidatos externos (e-mail,
--    telefone, links, observações privadas) e só é usado pela página
--    gp_talentos (G. Pessoas + admin), restringe leitura E escrita —
--    diferente das demais tabelas acima, que mantêm leitura aberta.
DROP POLICY IF EXISTS "talentos_admin_all" ON public.talentos;
CREATE POLICY "talentos_all" ON public.talentos FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

-- 5. taps (TAP Inovação): mesma situação de ALL/true único; aqui o conteúdo
--    (termo de abertura de projeto) não é PII de terceiros, então mantém
--    leitura aberta pra quem está logado, só restringe escrita.
DROP POLICY IF EXISTS "taps_authenticated_all" ON public.taps;
CREATE POLICY "taps_select" ON public.taps FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "taps_write" ON public.taps FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

-- 6. pesquisas_clima / respostas_clima: existem no banco mas não são usadas
--    em nenhum lugar do código hoje (a feature "Pesquisa de Clima" na verdade
--    usa a tabela `eventos` com tipo='pesquisa_clima', e as respostas vão pra
--    um Google Forms externo) — zero risco de quebrar algo em uso, mas fecha
--    o buraco caso/quando alguém ligue essas tabelas no futuro.
DROP POLICY IF EXISTS "clima_authenticated_all" ON public.pesquisas_clima;
CREATE POLICY "pesquisas_clima_select" ON public.pesquisas_clima FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pesquisas_clima_write" ON public.pesquisas_clima FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

DROP POLICY IF EXISTS "clima_resp_authenticated_all" ON public.respostas_clima;
CREATE POLICY "respostas_clima_insert" ON public.respostas_clima FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "respostas_clima_manage" ON public.respostas_clima FOR ALL
  USING (public.is_coord_or_admin())
  WITH CHECK (public.is_coord_or_admin());

-- 7. votos: o INSERT não checava user_id = auth.uid() (só o DELETE checava),
--    então um usuário autenticado conseguia votar se passando por outra
--    pessoa (`insert({user_id: <id de outra pessoa>, ...})`).
DROP POLICY IF EXISTS "votos_insert" ON public.votos;
CREATE POLICY "votos_insert" ON public.votos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Bucket de storage "evidencias" (fotos/documentos do selo ABJ): tinha
--    policies de SELECT duplicadas liberando LISTAGEM pra role "public"
--    (anon incluso). O bucket já é public=true, então acessar um arquivo
--    por URL direta não depende de RLS — o problema era só permitir
--    ENUMERAR todos os arquivos do bucket sem estar logado. Também havia
--    policies de insert/update duplicadas (criadas com nomes diferentes,
--    mesma checagem). Consolida em uma policy por operação, todas exigindo
--    autenticação — leitura por URL direta continua igual pra quem já tem
--    o link.
DROP POLICY IF EXISTS "evidencias_public_read" ON storage.objects;
DROP POLICY IF EXISTS "evidencias_read_public" ON storage.objects;
DROP POLICY IF EXISTS "evidencias_update_auth" ON storage.objects;
DROP POLICY IF EXISTS "evidencias_upload_auth" ON storage.objects;
CREATE POLICY "evidencias_auth_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'evidencias' AND auth.role() = 'authenticated');

-- 9. Funções SECURITY DEFINER chamáveis via RPC público sem necessidade.
--    handle_new_user é trigger-only (referencia NEW, só existe em contexto de
--    trigger) — já tinha sido revogada na migração 002, mas um
--    CREATE OR REPLACE FUNCTION depois disso reconcedeu EXECUTE a PUBLIC por
--    padrão (comportamento do Postgres), silenciosamente desfazendo o fix.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- get_my_coord/get_my_role/is_admin/is_coord_or_admin: o grant original
-- vinha de PUBLIC (não de "anon" diretamente), então revogar só de "anon"
-- não bastava — precisa revogar de PUBLIC e reconceder pra "authenticated".
-- IMPORTANTE: essas 4 funções são chamadas de DENTRO de várias RLS policies
-- (parcerias_write, pops_write, etc.) — mesmo sendo SECURITY DEFINER, quem
-- está rodando a query (role "authenticated") ainda precisa de EXECUTE pra
-- sequer invocar a função ao avaliar a policy. Revogar de "authenticated"
-- também (cheguei a tentar) quebra toda escrita nessas tabelas com
-- "permission denied for function is_coord_or_admin" — não faça isso.
REVOKE EXECUTE ON FUNCTION public.get_my_coord() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_coord_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_coord() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coord_or_admin() TO authenticated;

-- 10. search_path mutável (mesmo WARN já corrigido nas outras funções na
--     migração 001, faltou essa que foi criada depois).
ALTER FUNCTION public.sync_vagas_ocupadas() SET search_path = public, extensions;

-- ------------------------------------------------------------
-- NÃO MEXIDO DE PROPÓSITO: inscricoes_eventos.ie_public_insert
-- (WITH CHECK true, role public). Confirmado com o código real
-- (operacoes-site-inscricoes.html) que essa tabela recebe inscrição
-- pública anônima de gente que nem tem conta no sistema — apertar essa
-- policy quebraria a inscrição em eventos de quem não é membro.
-- ------------------------------------------------------------
