-- ============================================================
-- Migração 004: Corrige exclusão de demandas (Kanban)
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================

-- BUG: public.demandas tem RLS habilitado com policies de SELECT/INSERT/UPDATE,
-- mas NENHUMA policy de DELETE. Com RLS habilitado e sem policy pro comando,
-- o Postgres bloqueia silenciosamente qualquer DELETE (0 linhas afetadas, sem
-- erro) — então o botão "Excluir" do Kanban (Dem._excluir, PageMarketing,
-- PageDemandas, etc.) sempre mostrava "Demanda excluída!" com sucesso, mas
-- nada era de fato apagado. Afetava todos os papéis, inclusive admin.
--
-- Mesmo critério já usado em demandas_update: responsável, criador ou
-- coordenador/admin podem excluir.
CREATE POLICY "demandas_delete" ON public.demandas FOR DELETE USING (
  criado_por = auth.uid() OR responsavel_id = auth.uid() OR public.is_coord_or_admin()
);
