-- ============================================================
-- Migração 012: Adiciona colunas que faltavam pro wizard do TAP salvar tudo
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================
--
-- O wizard de TAP (PagePessoas._TAP_SECOES, js/pages.js) coleta 11 seções,
-- mas _tapSubmeter só salvava 9 — "Recursos Necessários" e "Validação e
-- Aprovação" eram digitadas, validadas como obrigatórias, e depois
-- simplesmente descartadas no insert, porque a tabela não tinha coluna
-- pra elas. Ninguém percebia porque o wizard mostrava "TAP submetido com
-- sucesso!" normalmente.
ALTER TABLE public.taps
  ADD COLUMN IF NOT EXISTS recursos_necessarios text,
  ADD COLUMN IF NOT EXISTS validacao_aprovacao text;
