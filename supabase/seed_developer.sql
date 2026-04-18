-- ============================================================
-- NUPIEEPRO — Seed: Conta de desenvolvedor
-- Execute DEPOIS de criar o usuário no Supabase Auth:
--   1. Painel Supabase → Authentication → Users → Invite user
--      Email: jjoserrayan2711@gmail.com
--   2. O usuário define a senha via link de convite
--   3. Rode este SQL para elevar o perfil a developer/admin
-- ============================================================

-- Atualiza o perfil criado automaticamente pelo trigger handle_new_user
UPDATE public.users
SET
  nome            = 'Rayan Bezerra',
  role            = 'admin',
  cargo           = 'Desenvolvedor Chefe',
  iniciais        = 'RB',
  coordenadoria_id = (SELECT id FROM public.coordenadorias WHERE sigla = 'GER' LIMIT 1)
WHERE email = 'jjoserrayan2711@gmail.com';

-- Se o registro ainda não existir (caso o trigger não tenha rodado),
-- insere manualmente (substitua o UUID pelo id real do auth.users):
-- INSERT INTO public.users (id, nome, email, role, cargo, iniciais, coordenadoria_id)
-- VALUES (
--   'COLE-AQUI-O-UUID-DO-AUTH-USERS',
--   'Rayan Bezerra',
--   'jjoserrayan2711@gmail.com',
--   'admin',
--   'Desenvolvedor Chefe',
--   'RB',
--   (SELECT id FROM public.coordenadorias WHERE sigla = 'GER' LIMIT 1)
-- );

-- Confirma
SELECT id, nome, email, role, cargo FROM public.users WHERE email = 'jjoserrayan2711@gmail.com';
