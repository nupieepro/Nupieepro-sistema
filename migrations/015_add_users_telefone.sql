-- ============================================================
-- Migração 015: telefone no perfil do usuário
-- Feedback da Gestão de Pessoas: o membro não tinha como atualizar o
-- próprio telefone (nem qualquer outro dado) em Configurações. A tela
-- "Meu Perfil" passa a editar nome, apelido, telefone e aniversário.
--
-- Sem mudança de RLS: "users_update_self" (id = auth.uid()) já permite o
-- update, e o trigger protect_self_update_users (migração 003) continua
-- barrando role/ativo/coordenadoria_id. `apelido` já é lido pelo app
-- (pages.js) — garantimos a coluna aqui pra o ambiente novo também.
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS apelido text;
