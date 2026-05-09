-- ============================================================
-- Migração 002: Tighten RLS policies + revogar funções trigger
-- Executar em: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Remove policies permissivas demais de magic_links
DROP POLICY IF EXISTS "magic_links_insert_anon" ON public.magic_links;
DROP POLICY IF EXISTS "magic_links_update_anon" ON public.magic_links;

-- Substitui: UPDATE só permite marcar como usado se token ainda é válido
CREATE POLICY "magic_links_update_mark_used" ON public.magic_links
  FOR UPDATE
  USING (used = false AND expires_at > now())
  WITH CHECK (used = true);

-- INSERT de magic_links deve ser feito apenas pelo service_role (Edge Function)
-- Nenhuma policy de INSERT para anon/authenticated = bloqueado por padrão com RLS

-- 2. Revoga handle_new_user de anon/authenticated (é trigger, não API pública)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 3. Revoga rls_auto_enable de PUBLIC também (garante o bloqueio total)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
