-- ============================================================
-- Migração 015: inscrição em treinamentos/eventos pelo próprio membro
-- Feedback da Gestão de Pessoas: os treinamentos mostravam "16 vagas" sem
-- como se inscrever, e ninguém via quem de fato compareceu.
--
-- Estado anterior (inscritos_evento): membro só podia INSERIR a própria
-- linha e LER a própria linha; update só coord/admin. Faltava:
--   1. o membro cancelar / refazer a própria inscrição;
--   2. saber quantas vagas restam (sem ler a linha dos outros);
--   3. o banco impedir estourar `eventos.vagas` (checar só no cliente
--      deixaria duas pessoas furarem a última vaga ao mesmo tempo).
-- Presença continua em public.frequencia (escrita só coord/admin).
-- ============================================================

-- 1. Membro pode cancelar/reinscrever a PRÓPRIA inscrição, mas não se
--    "confirmar" sozinho: o status só pode ser inscrito ou cancelado.
DROP POLICY IF EXISTS "inscritos_self_update" ON public.inscritos_evento;
CREATE POLICY "inscritos_self_update" ON public.inscritos_evento
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('inscrito', 'cancelado'));

-- 2. Contagem de inscritos ativos por evento, sem expor quem são.
CREATE OR REPLACE FUNCTION public.inscritos_contagem(p_evento_ids uuid[])
RETURNS TABLE (evento_id uuid, total bigint)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT i.evento_id, count(*)
  FROM public.inscritos_evento i
  WHERE i.evento_id = ANY (p_evento_ids) AND i.status <> 'cancelado'
  GROUP BY i.evento_id;
$$;
REVOKE EXECUTE ON FUNCTION public.inscritos_contagem(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inscritos_contagem(uuid[]) TO authenticated;

-- 3. Trava de vagas no banco. Bloqueia a linha do evento pra serializar
--    inscrições simultâneas. Só checa quando a linha passa a ocupar vaga.
CREATE OR REPLACE FUNCTION public.inscritos_evento_checa_vagas()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_vagas integer;
  v_ocupadas bigint;
BEGIN
  IF NEW.status = 'cancelado' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status <> 'cancelado' THEN RETURN NEW; END IF;

  SELECT vagas INTO v_vagas FROM public.eventos WHERE id = NEW.evento_id FOR UPDATE;
  IF v_vagas IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_ocupadas
  FROM public.inscritos_evento
  WHERE evento_id = NEW.evento_id AND status <> 'cancelado' AND id IS DISTINCT FROM NEW.id;

  IF v_ocupadas >= v_vagas THEN
    RAISE EXCEPTION 'VAGAS_ESGOTADAS' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.inscritos_evento_checa_vagas() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS inscritos_evento_vagas_trigger ON public.inscritos_evento;
CREATE TRIGGER inscritos_evento_vagas_trigger
  BEFORE INSERT OR UPDATE ON public.inscritos_evento
  FOR EACH ROW EXECUTE FUNCTION public.inscritos_evento_checa_vagas();
