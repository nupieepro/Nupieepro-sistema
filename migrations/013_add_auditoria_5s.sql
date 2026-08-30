-- ============================================================
-- Migração 013: Auditoria 5S vira dado real e compartilhado
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================
--
-- O card "Auditoria 5S" do Painel Central (js/app.js, Dashboard.render5S)
-- só lia e gravava em localStorage — a nota de cada senso (Seiri, Seiton,
-- Seiso, Seiketsu, Shitsuke) ficava presa no navegador de quem preencheu,
-- ninguém mais do núcleo via, sumia se limpasse os dados do navegador, e
-- todo mundo começava com nota 7 fixa mesmo sem ter avaliado nada ainda.
-- O Índice de Desempenho do Núcleo nem usava esse número no cálculo.
--
-- Essa tabela guarda cada avaliação como uma linha própria (não sobrescreve
-- a anterior), então dá pra acompanhar a evolução do 5S ao longo do tempo,
-- que é a própria ideia por trás da ferramenta.

CREATE TABLE IF NOT EXISTS public.auditoria_5s (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seiri smallint NOT NULL CHECK (seiri BETWEEN 0 AND 10),
  seiton smallint NOT NULL CHECK (seiton BETWEEN 0 AND 10),
  seiso smallint NOT NULL CHECK (seiso BETWEEN 0 AND 10),
  seiketsu smallint NOT NULL CHECK (seiketsu BETWEEN 0 AND 10),
  shitsuke smallint NOT NULL CHECK (shitsuke BETWEEN 0 AND 10),
  observacoes text,
  avaliado_por uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_5s_created_at ON public.auditoria_5s(created_at DESC);

ALTER TABLE public.auditoria_5s ENABLE ROW LEVEL SECURITY;

-- Qualquer membro autenticado vê o histórico (é uma métrica do núcleo
-- inteiro, já era mostrada pra todo mundo no Painel Central).
CREATE POLICY "5s_read" ON public.auditoria_5s
  FOR SELECT USING (true);

-- Só coordenador ou admin registra uma nova avaliação — mesma regra já
-- usada em progresso_abj/frequencia (is_coord_or_admin()).
CREATE POLICY "5s_write" ON public.auditoria_5s
  FOR INSERT WITH CHECK (is_coord_or_admin());

-- Corrigir a própria avaliação (ou qualquer coordenador/admin corrigir):
-- mesmo padrão do update de progresso_abj.
CREATE POLICY "5s_update" ON public.auditoria_5s
  FOR UPDATE USING (is_coord_or_admin() OR avaliado_por = auth.uid());
