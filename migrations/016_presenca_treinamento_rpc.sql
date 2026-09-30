-- ============================================================
-- Migração 016: lista de presença de treinamentos sem depender de users_read
-- Bug achado ao testar a 015 com RLS real: users_read só deixa cada pessoa
-- ver a própria coordenadoria (ou tudo, se admin/geral). Então o
-- coordenador da GP, ao registrar presença, via "—" no nome de quem é de
-- outra coordenadoria. Estas funções devolvem só nome/apelido, e só pra
-- coord/admin (mesmo critério de escrita em `frequencia`).
-- ============================================================
CREATE OR REPLACE FUNCTION public.treinamento_presenca_lista(p_evento_id uuid)
RETURNS TABLE (user_id uuid, nome text, apelido text, inscrito boolean, presente boolean)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT public.is_coord_or_admin() THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.nome, u.apelido,
         EXISTS (SELECT 1 FROM public.inscritos_evento i
                 WHERE i.evento_id = p_evento_id AND i.user_id = u.id AND i.status <> 'cancelado'),
         COALESCE((SELECT f.presente FROM public.frequencia f
                   WHERE f.evento_id = p_evento_id AND f.user_id = u.id), false)
  FROM public.users u
  WHERE EXISTS (SELECT 1 FROM public.inscritos_evento i
                WHERE i.evento_id = p_evento_id AND i.user_id = u.id AND i.status <> 'cancelado')
     OR EXISTS (SELECT 1 FROM public.frequencia f
                WHERE f.evento_id = p_evento_id AND f.user_id = u.id)
  ORDER BY u.nome;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.treinamento_presenca_lista(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treinamento_presenca_lista(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.membros_ativos_basico()
RETURNS TABLE (id uuid, nome text, apelido text)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT public.is_coord_or_admin() THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT u.id, u.nome, u.apelido FROM public.users u WHERE u.ativo ORDER BY u.nome;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.membros_ativos_basico() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.membros_ativos_basico() TO authenticated;
