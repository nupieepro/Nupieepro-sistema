-- ============================================================
-- Migração 017: financeiro — solicitante, evento e importação de despesas
-- Feedback do Financeiro:
--  * despesa só pedia descrição/valor/data/categoria livre; faltava dizer
--    QUAL coordenadoria solicitou o dinheiro;
--  * "categoria" virou campo de lista fixa (Lojinha, Eventos, Premiações…),
--    então o nome do evento (ex: Bottom Up 7.0) ganha coluna própria;
--  * a importação de planilha só gravava em `vendas`, então uma planilha de
--    despesas virava venda. Agora pode gravar em `despesas`.
--
-- Só adiciona colunas (nada é alterado/apagado). `coordenadoria_id` continua
-- sendo a coordenadoria DONA do lançamento (Finanças) — é ela que as
-- policies de RLS usam; o solicitante é outra coluna, só informativa.
-- ============================================================
ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS solicitante_coord_id uuid REFERENCES public.coordenadorias(id),
  ADD COLUMN IF NOT EXISTS evento text,
  ADD COLUMN IF NOT EXISTS importacao_id uuid REFERENCES public.importacoes(id) ON DELETE CASCADE;

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS evento text;

CREATE INDEX IF NOT EXISTS idx_despesas_importacao ON public.despesas(importacao_id);
CREATE INDEX IF NOT EXISTS idx_despesas_solicitante ON public.despesas(solicitante_coord_id);
