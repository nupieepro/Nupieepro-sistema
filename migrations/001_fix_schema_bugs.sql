-- ============================================================
-- Migração 001: Correções de schema e segurança
-- Executar em: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Adiciona coluna `tipo` em demandas (usada pelo Kanban MKT, ABEPRO, etc.)
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'geral'
    CHECK (tipo IN ('geral','melhoria','parceria','abepro','lojinha','conteudo','divulgacao'));

-- 2. Estende check constraint de eventos.tipo para incluir enegep e tap
ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_tipo_check;
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_tipo_check CHECK (
    tipo = ANY (ARRAY[
      'evento','reuniao','visita','treinamento','podcast',
      'apresentacao','producao_cientifica','pesquisa_clima',
      'enegep','tap'
    ])
  );

-- 3. RLS policies para magic_links (atualmente sem nenhuma → bloqueado para todos)
CREATE POLICY "magic_links_select_anon" ON public.magic_links
  FOR SELECT USING (used = false AND expires_at > now());

CREATE POLICY "magic_links_insert_anon" ON public.magic_links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "magic_links_update_anon" ON public.magic_links
  FOR UPDATE USING (true);

-- 4. RLS policies para votacoes (atualmente sem nenhuma → bloqueado para todos)
CREATE POLICY "votacoes_select_authenticated" ON public.votacoes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "votacoes_admin_all" ON public.votacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Corrige search_path mutável nas funções (segurança WARN do advisor)
ALTER FUNCTION public.handle_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.get_my_role() SET search_path = public, extensions;
ALTER FUNCTION public.get_my_coord() SET search_path = public, extensions;
ALTER FUNCTION public.is_admin() SET search_path = public, extensions;
ALTER FUNCTION public.is_coord_or_admin() SET search_path = public, extensions;
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions;

-- 6. Revoga EXECUTE da função rls_auto_enable para anon/authenticated
-- (não deve ser chamada por usuários finais)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- 7. Índices para foreign keys sem índice (performance)
CREATE INDEX IF NOT EXISTS idx_calendario_coordenadoria_id ON public.calendario(coordenadoria_id);
CREATE INDEX IF NOT EXISTS idx_calendario_criado_por ON public.calendario(criado_por);
CREATE INDEX IF NOT EXISTS idx_convites_criado_por ON public.convites(criado_por);
CREATE INDEX IF NOT EXISTS idx_demandas_responsavel_id ON public.demandas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_demandas_criado_por ON public.demandas(criado_por);
CREATE INDEX IF NOT EXISTS idx_demandas_coordenadoria_id ON public.demandas(coordenadoria_id);
CREATE INDEX IF NOT EXISTS idx_demandas_atividade_abj_id ON public.demandas(atividade_abj_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_user_id ON public.frequencia(user_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_evento_id ON public.frequencia(evento_id);
CREATE INDEX IF NOT EXISTS idx_inscritos_evento_evento_id ON public.inscritos_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_inscritos_evento_user_id ON public.inscritos_evento(user_id);
CREATE INDEX IF NOT EXISTS idx_progresso_abj_atividade_id ON public.progresso_abj(atividade_id);
CREATE INDEX IF NOT EXISTS idx_progresso_abj_registrado_por ON public.progresso_abj(registrado_por);
CREATE INDEX IF NOT EXISTS idx_evidencias_abj_progresso_id ON public.evidencias_abj(progresso_id);
CREATE INDEX IF NOT EXISTS idx_vendas_coordenadoria_id ON public.vendas(coordenadoria_id);
CREATE INDEX IF NOT EXISTS idx_despesas_coordenadoria_id ON public.despesas(coordenadoria_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_mensais_coordenadoria_id ON public.relatorios_mensais(coordenadoria_id);
CREATE INDEX IF NOT EXISTS idx_historico_demandas_demanda_id ON public.historico_demandas(demanda_id);
CREATE INDEX IF NOT EXISTS idx_historico_demandas_user_id ON public.historico_demandas(user_id);
