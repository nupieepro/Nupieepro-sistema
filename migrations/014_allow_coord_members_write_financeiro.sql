-- ============================================================
-- Migração 014: Libera escrita em vendas/despesas/importacoes pra
-- qualquer membro da própria coordenadoria, não só coordenador/admin
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================
--
-- Achado ao investigar um relato real: assessor da coordenadoria de
-- Finanças (mesmo perfil de quem já usa o sistema no dia a dia) recebia
-- "new row violates row-level security policy for table importacoes" ao
-- tentar confirmar uma importação de planilha.
--
-- Causa: "vendas_write"/"despesas_write" (migration 009) e
-- "importacoes_write" exigiam is_coord_or_admin() — só role 'admin' ou
-- 'coordenador'. Mas a tela (js/pages.js, PageFinancas._podeLancar())
-- sempre liberou os botões "Registrar venda/despesa" e "Importar
-- planilha" pra QUALQUER pessoa da coordenadoria de Finanças, sem checar
-- cargo. Assessor via o botão mas a escrita real caía na RLS — a tela
-- prometia uma permissão que o banco não dava.
--
-- Decisão (confirmada com o responsável do sistema): alinhar o banco com
-- o que a tela já permite — qualquer membro da própria coordenadoria (ou
-- admin) pode gravar, não só coordenador. O escopo por coordenadoria_id
-- (introduzido na 009) continua intacto — isso não abre escrita entre
-- coordenadorias diferentes, só remove a distinção de cargo dentro da
-- mesma coordenadoria.
DROP POLICY IF EXISTS "vendas_write" ON public.vendas;
CREATE POLICY "vendas_write" ON public.vendas FOR ALL
  USING (public.is_admin() OR coordenadoria_id = public.get_my_coord())
  WITH CHECK (public.is_admin() OR coordenadoria_id = public.get_my_coord());

DROP POLICY IF EXISTS "despesas_write" ON public.despesas;
CREATE POLICY "despesas_write" ON public.despesas FOR ALL
  USING (public.is_admin() OR coordenadoria_id = public.get_my_coord())
  WITH CHECK (public.is_admin() OR coordenadoria_id = public.get_my_coord());

DROP POLICY IF EXISTS "importacoes_write" ON public.importacoes;
CREATE POLICY "importacoes_write" ON public.importacoes FOR ALL
  USING (public.is_admin() OR coordenadoria_id = public.get_my_coord())
  WITH CHECK (public.is_admin() OR coordenadoria_id = public.get_my_coord());
