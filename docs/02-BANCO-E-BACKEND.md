# 02 — Banco de dados e backend (Sistema)

Projeto Supabase **`quwpyrdxyibcbyzwfilb`** (nome padrão "nupieeprotreinamentos@gmail.com's Project"), organização `cyyfolwjvlhnrfadoibh`, us-east-2, Postgres 17. Estado em 12/11/2026: 18 usuários (3 admin, 7 coordenador, 6 membro, 1 assessor, 1 observador), 8 eventos, 5 assinaturas push, 166 policies RLS.

## Tabelas (30, todas com RLS)
| Grupo | Tabelas |
|---|---|
| Estrutura | `coordenadorias` (6: GER, OPS, GP, MKT, PRJ, FIN), `users` (perfil ligado a `auth.users`), `convites` |
| Selo ABJ | `atividades_abj` (18), `progresso_abj`, `evidencias_abj`, `relatorios_mensais` |
| Eventos / treinamentos | `eventos`, `inscritos_evento`, `eventos_inscricao`, `inscricoes_eventos`, `frequencia` |
| Financeiro | `vendas`, `despesas`, `importacoes` (planilha de vendas) |
| Trabalho | `demandas`, `historico_demandas`, `calendario`, `notificacoes`, `pops`, `tracker_social`, `parcerias`, `auditoria_5s` |
| Pessoas | `talentos`, `pesquisas_clima`, `respostas_clima`, `taps` |
| Governança | `votacoes`, `votos` |
| Push | `push_subscriptions` |

## Funções (RPC) relevantes
`get_convite_by_token`, `consumir_convite` (fluxo de cadastro por convite, públicas por design), `get_my_role`, `get_my_coord`, `is_admin`, `is_admin_or_geral`, `is_geral`, `is_coord_or_admin`, `is_observador`, `inscritos_contagem`, `membros_ativos_basico`, `treinamento_presenca_lista`, `log_historico_demanda` (trigger).

## Triggers
`on_auth_user_created` (cria o perfil em `users` quando nasce um usuário no Auth, lendo o metadata do convite), `auto_confirm_email_trigger` (confirma e-mail automaticamente no cadastro), `protect_self_update_users_trigger` (impede o usuário de se promover), `set_*_updated`, `log_historico_demanda_trigger`, controle de vagas (`trg_vagas_ocupadas`, `inscritos_evento_vagas_trigger`).

## Storage
Bucket `evidencias` (público, mas sem listagem anônima; escrita/leitura por policies autenticadas) para evidências do Selo ABJ.

## Fluxo de cadastro (importante)
1. Coordenador/admin gera convite (tabela `convites`, token). O link é `${origem}/convite.html?token=...` (origem = domínio de onde o convite foi gerado).
2. Convidado abre o link; `get_convite_by_token` devolve e-mail/papel/coordenadoria/cargo.
3. `auth.signUp` com esses dados no metadata; trigger cria o perfil; `consumir_convite` invalida o token.
4. Perfil só libera o dashboard após preencher nome, apelido e aniversário (`camposPerfilFaltando`).
5. Reset de senha: `reset.html`, e-mail do Supabase Auth com `redirectTo` para a mesma origem.
> **Supabase Auth → URL Configuration** (Site URL e Redirect URLs) deve conter o domínio de produção, senão o link de reset não funciona. Verificar no dashboard: ____________.

## Edge Function `send-push` — NÃO DEPLOYADA
Código em `supabase/functions/send-push/index.ts`. Recebe `{userId,title,body,url}`, lê `push_subscriptions` do usuário e envia via `web-push`. Secrets necessários: `VAPID_PRIVATE_KEY` (SUPABASE_URL e SERVICE_ROLE_KEY o Supabase injeta). Contato VAPID: `mailto:nupieeprotreinamentos@gmail.com`. Hoje o projeto não tem nenhuma Edge Function ativa, então **push não funciona**.
Publicar: `supabase functions deploy send-push --project-ref quwpyrdxyibcbyzwfilb` + `supabase secrets set VAPID_PRIVATE_KEY=...`. Se a privada se perdeu: `npx web-push generate-vapid-keys`, trocar a pública em `js/push.js` e `index.ts`, e todos os usuários reativam o push.
Quem dispara o push hoje (webhook/trigger/frontend) precisa ser conferido após o deploy: ____________.

## Migrations
`migrations/001`…`018` do repo = espelho do que foi aplicado (aplicadas manualmente no SQL Editor; o Supabase registra com nomes próprios, a última é `observador_parte2_aceitar_role`, 21/10/2026). `supabase/schema.sql` é o **schema base** (16 tabelas + seed de coordenadorias e atividades ABJ); as migrations 001+ vêm depois. `supabase/seed_developer.sql` cria o admin inicial (conferir antes de usar). Para recriar o banco do zero: `schema.sql` → migrations em ordem → seed.

## Advisors (12/11/2026)
Sem críticos. Avisos: funções `is_admin_or_geral`, `is_geral`, `is_observador`, `log_historico_demanda` executáveis por `anon` (revisar e revogar `EXECUTE`), demais `SECURITY DEFINER` para `authenticated` (esperado), proteção de senha vazada desligada.
