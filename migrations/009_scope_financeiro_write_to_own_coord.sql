-- ============================================================
-- Migração 009: Restringe escrita em vendas/despesas à própria coordenadoria
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================
--
-- CRÍTICO (achado em auditoria de RLS em 30/08/2026): "despesas_write" e
-- "vendas_write" eram FOR ALL USING (is_coord_or_admin()), sem checar
-- coordenadoria_id — qualquer coordenador (de QUALQUER coordenadoria, não
-- só Finanças) conseguia inserir/editar/apagar lançamentos no fluxo de
-- caixa via API direta, mesmo não tendo a página "Fluxo de Caixa" no seu
-- menu. A leitura (vendas_read/despesas_read) já era restrita a
-- coordenadoria_id = get_my_coord() ou admin — a escrita tinha ficado pra
-- trás, sem o mesmo critério.
--
-- Confirmado no código (js/pages.js, PageFinancas._salvarFinanceiro e
-- _salvarRepasse) que todo insert real de vendas/despesas sempre usa
-- coordenadoria_id = FIN (é um caixa único do núcleo) e só é alcançável a
-- partir da própria página de Finanças — nenhum uso legítimo depende de
-- outro coordenador escrever aqui.
DROP POLICY IF EXISTS "despesas_write" ON public.despesas;
CREATE POLICY "despesas_write" ON public.despesas FOR ALL
  USING (public.is_admin() OR (public.is_coord_or_admin() AND coordenadoria_id = public.get_my_coord()))
  WITH CHECK (public.is_admin() OR (public.is_coord_or_admin() AND coordenadoria_id = public.get_my_coord()));

DROP POLICY IF EXISTS "vendas_write" ON public.vendas;
CREATE POLICY "vendas_write" ON public.vendas FOR ALL
  USING (public.is_admin() OR (public.is_coord_or_admin() AND coordenadoria_id = public.get_my_coord()))
  WITH CHECK (public.is_admin() OR (public.is_coord_or_admin() AND coordenadoria_id = public.get_my_coord()));
