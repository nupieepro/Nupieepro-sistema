-- ============================================================
-- Migração 007: Fecha brechas de permissão achadas na varredura completa
-- (Kanban, Financeiro, Projetos, Operações, Pessoas, Global — 29/08/2026)
-- ============================================================
--
-- 1. CRÍTICO: "Gestão de Inscrições" (ops_inscricoes, PageOperacoes) é uma
--    página só de Operações/coordenador/admin na sidebar, mas as policies
--    de UPDATE/DELETE de eventos_inscricao e inscricoes_eventos só exigiam
--    auth.role()='authenticated' — QUALQUER usuário logado, de qualquer
--    coordenadoria, conseguia editar/apagar eventos e inscrições de outra
--    coordenadoria via chamada direta à API (não precisava nem estar na
--    página certa). Corrigido pra exigir is_coord_or_admin(), igual ao
--    resto das tabelas de gestão (eventos, parcerias, pops, etc). O
--    INSERT público de inscrição (ie_public_insert, usado pelo formulário
--    de quem se inscreve no evento) e a leitura pública do evento em si
--    (ei_public_select) continuam abertos — não são o problema.

DROP POLICY IF EXISTS "ei_auth_update" ON public.eventos_inscricao;
CREATE POLICY "ei_coord_admin_update" ON public.eventos_inscricao FOR UPDATE USING (public.is_coord_or_admin());

DROP POLICY IF EXISTS "ei_auth_delete" ON public.eventos_inscricao;
CREATE POLICY "ei_coord_admin_delete" ON public.eventos_inscricao FOR DELETE USING (public.is_coord_or_admin());

DROP POLICY IF EXISTS "ei_auth_insert" ON public.eventos_inscricao;
CREATE POLICY "ei_coord_admin_insert" ON public.eventos_inscricao FOR INSERT WITH CHECK (public.is_coord_or_admin());

DROP POLICY IF EXISTS "ie_auth_update" ON public.inscricoes_eventos;
CREATE POLICY "ie_coord_admin_update" ON public.inscricoes_eventos FOR UPDATE USING (public.is_coord_or_admin());

DROP POLICY IF EXISTS "ie_auth_delete" ON public.inscricoes_eventos;
CREATE POLICY "ie_coord_admin_delete" ON public.inscricoes_eventos FOR DELETE USING (public.is_coord_or_admin());

-- NOTA: ie_auth_select (leitura de inscritos — nome/e-mail) também só exige
-- estar logado, não is_coord_or_admin() — qualquer membro de qualquer
-- coordenadoria consegue ler a lista de inscritos de qualquer evento via
-- API direta, mesmo a tela "Ver Inscritos"/CSV sendo só de Operações.
-- NÃO apertei aqui: só a página de Operações (PageOperacoes) mostra a
-- pasta pra membro/assessor da própria coordenadoria hoje sem checar role
-- — apertar o SELECT sem antes dar um gate de página adequado deixaria
-- membro/assessor de Operações vendo lista vazia sem explicação. Fica
-- registrado pra próxima rodada, junto com a decisão de que nível de
-- acesso membro/assessor deveria ter aqui.

-- 2. "Assembleia e Votos" (global_assembleia) é visível a TODA coordenadoria
--    (é uma página Institucional), mas o botão de gerenciar votação usava
--    Permissoes.pode('podeCriarEvento') — true pra QUALQUER coordenador,
--    não só admin — enquanto votacoes_admin_all só aceita role='admin'
--    de verdade. Todo coordenador de qualquer coordenadoria via "sucesso"
--    ao tentar encerrar/excluir uma votação institucional sem nada mudar
--    no banco. Aqui a política do banco é a intenção certa (voto
--    institucional restrito a admin) — o fix é no client (js/pages.js),
--    não aqui.
