-- ============================================================
-- Migração 010: Coordenação Geral passa a enxergar tudo de verdade no banco
-- Já aplicada em produção (quwpyrdxyibcbyzwfilb) via Supabase MCP.
-- Mantida aqui para histórico, igual ao padrão das migrations anteriores.
-- ============================================================
--
-- "coordenador_geral" não é um valor de role separado (users_role_check
-- continua só admin/coordenador/assessor/membro/conselheiro) — é derivado
-- no front-end (js/permissoes.js, getMatriz): um usuário com role='coordenador'
-- cuja coordenadoria_id aponta pra coordenadoria de sigla 'GER' ("Geral")
-- recebe a matriz coordenador_geral, com pagesVisible:'*' e leitura ampliada
-- (podeVerFinanceiro:true, vê demandas/relatórios de todas as coordenadorias).
--
-- Só que essa "elevação" só existia no client. As policies de RLS não
-- sabiam disso — um coordenador da Geral navegava até Fluxo de Caixa ou até
-- o Kanban de outra coordenadoria e via a tela vazia, porque vendas_read/
-- despesas_read/demandas_read/hist_read/rel_read só liberavam tudo pra
-- role='admin' de verdade (is_admin()), não pra quem o front-end já tratava
-- como "vê tudo". Cria os helpers e estende essas policies pra reconhecer
-- coordenador da Geral como equivalente a admin PRA LEITURA (a escrita
-- continua igual — coordenador_geral não tem podeGerenciarUsuarios nem
-- podeLancarlancamento no MATRIZ, então write fica restrito como já estava).
CREATE OR REPLACE FUNCTION public.is_geral()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users u
    JOIN public.coordenadorias c ON c.id = u.coordenadoria_id
    WHERE u.id = auth.uid() AND u.role = 'coordenador' AND c.sigla = 'GER'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_geral() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_geral() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_or_geral()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR public.is_geral();
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_geral() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_geral() TO authenticated;

-- users: Coord. Geral passa a ler o cadastro de todo mundo (só leitura —
-- users_admin, que permite escrita geral, continua exclusivo de is_admin()).
DROP POLICY IF EXISTS "users_read" ON public.users;
CREATE POLICY "users_read" ON public.users FOR SELECT USING (
  id = auth.uid() OR coordenadoria_id = public.get_my_coord() OR public.is_admin_or_geral()
);

-- vendas/despesas: leitura do fluxo de caixa (podeVerFinanceiro:true).
DROP POLICY IF EXISTS "vendas_read" ON public.vendas;
CREATE POLICY "vendas_read" ON public.vendas FOR SELECT USING (
  coordenadoria_id = public.get_my_coord() OR public.is_admin_or_geral()
);
DROP POLICY IF EXISTS "despesas_read" ON public.despesas;
CREATE POLICY "despesas_read" ON public.despesas FOR SELECT USING (
  coordenadoria_id = public.get_my_coord() OR public.is_admin_or_geral()
);

-- demandas: Coord. Geral vê o kanban de todas as coordenadorias.
DROP POLICY IF EXISTS "demandas_read" ON public.demandas;
CREATE POLICY "demandas_read" ON public.demandas FOR SELECT USING (
  coordenadoria_id = public.get_my_coord() OR responsavel_id = auth.uid() OR public.is_admin_or_geral()
);

-- historico_demandas: segue o mesmo acesso da demanda referenciada.
DROP POLICY IF EXISTS "hist_read" ON public.historico_demandas;
CREATE POLICY "hist_read" ON public.historico_demandas FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.demandas d WHERE d.id = demanda_id
    AND (d.coordenadoria_id = public.get_my_coord() OR public.is_admin_or_geral()))
);

-- relatorios_mensais: podeAprovarRelatorio:true — precisa ler relatório de
-- toda coordenadoria pra aprovar antes do envio ABJ.
DROP POLICY IF EXISTS "rel_read" ON public.relatorios_mensais;
CREATE POLICY "rel_read" ON public.relatorios_mensais FOR SELECT USING (
  coordenadoria_id = public.get_my_coord() OR public.is_admin_or_geral()
);
