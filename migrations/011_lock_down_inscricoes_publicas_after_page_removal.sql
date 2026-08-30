-- ============================================================
-- Migração 011: Fecha o acesso público de inscricoes_eventos/eventos_inscricao
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================
--
-- operacoes-site-inscricoes.html (o único código do projeto que lia
-- eventos_inscricao ou escrevia em inscricoes_eventos, confirmado por
-- grep no repositório inteiro) foi apagado — o núcleo passou a usar
-- ferramenta própria de inscrição de eventos, fora deste sistema. Sem
-- nenhuma página consumindo essas tabelas, as duas policies que ainda
-- liberavam acesso a anon (ei_public_select — listagem pública de
-- eventos; ie_public_insert — inscrição pública sem login) viraram só
-- superfície de ataque: qualquer um conseguia poluir a tabela com
-- inserts arbitrários via API direta, sem nenhum uso legítimo restando.
-- Fecha as duas pra coordenador/admin, igual ao resto das policies
-- dessas tabelas (migration 007).
DROP POLICY IF EXISTS "ei_public_select" ON public.eventos_inscricao;
CREATE POLICY "ei_coord_admin_select" ON public.eventos_inscricao FOR SELECT USING (public.is_coord_or_admin());

DROP POLICY IF EXISTS "ie_public_insert" ON public.inscricoes_eventos;
CREATE POLICY "ie_coord_admin_insert" ON public.inscricoes_eventos FOR INSERT WITH CHECK (public.is_coord_or_admin());
