-- ============================================================
-- Migração 006: Corrige exposição de convites + convite nunca marcado como usado
-- ============================================================
--
-- Dois bugs achados numa auditoria de segurança em 29/08/2026, confirmados
-- ao vivo no projeto quwpyrdxyibcbyzwfilb: dos 41 convites já emitidos,
-- os 41 continuavam com usado=false — nenhum jamais foi consumido.
--
-- 1. CRÍTICO: "convites_anon_read" (schema.sql) dava SELECT USING (true)
--    pra role anon na tabela inteira. Qualquer visitante do site, sem
--    login nenhum, conseguia rodar supabase.from('convites').select('*')
--    e listar e-mail + token + role + cargo + coordenadoria de TODO
--    convite pendente — inclusive roubar o convite de outra pessoa antes
--    dela se cadastrar. Substituída por uma function SECURITY DEFINER que
--    devolve só os campos necessários de UM convite, e só pra quem já
--    sabe o token exato (o mesmo nível de acesso que o fluxo precisa,
--    sem dar leitura da tabela inteira).
--
-- 2. CRÍTICO: nunca existiu nenhuma policy de UPDATE em "convites" — nem
--    pra anon, nem pra coordenador/admin. Duas consequências:
--    a) js/auth.js:63 tenta marcar usado=true depois do cadastro, e essa
--       call falha em silêncio (Supabase JS não lança erro em update com
--       0 linhas afetadas) — o convite nunca "gasta", continua válido
--       (e continua exposto pelo bug #1) até expirar só por data.
--    b) js/pages.js "_revogarConvite" (botão de revogar convite no painel
--       Dev/Admin) também falhava em silêncio, mostrando "Convite
--       revogado" sem revogar nada de fato.
--    Corrigido com uma policy de UPDATE pra coordenador/admin (cobre o
--    revogar) + uma function SECURITY DEFINER estreita, chamável só pelo
--    dono exato do e-mail convidado, que marca usado=true (cobre o
--    consumo no self-registro, sem abrir UPDATE geral pra usuário comum).

-- 1. Remove o SELECT anônimo de tabela inteira.
DROP POLICY IF EXISTS "convites_anon_read" ON public.convites;

-- 2. UPDATE pra coordenador/admin (corrige "revogar convite", e cobre
--    qualquer gestão futura da lista de convites pelo painel).
CREATE POLICY "convites_update" ON public.convites FOR UPDATE USING (public.is_coord_or_admin());

-- 3. Lookup de UM convite por token, sem expor a tabela. Só devolve o
--    convite se ele existir, não tiver sido usado e não estiver expirado
--    — mesmas condições que convite.html e js/auth.js já aplicavam no
--    client, agora garantidas no servidor.
CREATE OR REPLACE FUNCTION public.get_convite_by_token(p_token text)
RETURNS TABLE (
  email text,
  role text,
  cargo text,
  coordenadoria_id uuid,
  coord_nome text,
  coord_sigla text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.email, c.role, c.cargo, c.coordenadoria_id, co.nome, co.sigla
  FROM public.convites c
  LEFT JOIN public.coordenadorias co ON co.id = c.coordenadoria_id
  WHERE c.token = p_token
    AND c.usado = false
    AND c.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_convite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_convite_by_token(text) TO anon, authenticated;

-- 4. Marca o convite como usado — só funciona se quem está chamando (já
--    autenticado, logo após o signUp) tiver exatamente o e-mail pro qual
--    o convite foi emitido. Não dá pra um usuário qualquer "usar" o
--    convite de outra pessoa.
CREATE OR REPLACE FUNCTION public.consumir_convite(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  UPDATE public.convites
  SET usado = true
  WHERE token = p_token
    AND usado = false
    AND expires_at > now()
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  RETURNING true INTO v_ok;

  RETURN coalesce(v_ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.consumir_convite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consumir_convite(text) TO authenticated;
