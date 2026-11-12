# HANDOVER — Sistema NUPIEEPRO

**Documentação completa em `docs/`:** [01 Visão geral](docs/01-VISAO-GERAL.md) · [02 Banco e backend](docs/02-BANCO-E-BACKEND.md) · [03 Operação e deploy](docs/03-OPERACAO-E-DEPLOY.md) · [04 Credenciais e acessos (preencher)](docs/04-CREDENCIAIS-E-ACESSOS.md)

Documento de passagem para quem assume a manutenção. Estado verificado em 12/11/2026.

## Resumo

- Site estático (sem build) com PWA: `index.html`, `dashboard.html`, `convite.html`, `reset.html`, `js/`, `css/`. `package.json` existe só para rodar os testes (`npm test`, 52 testes, todos passando).
- Hospedagem: **Cloudflare Pages**, projeto `nupieepro-sistema`. Deploy automático pelo GitHub Actions (`.github/workflows/deploy.yml`): testes primeiro, deploy só se passarem. PRs geram preview.
- Backend: **Supabase**, projeto `quwpyrdxyibcbyzwfilb` (us-east-2, Postgres 17).

## ⚠️ O projeto Supabase foi pausado por inatividade

Em 12/11/2026 o projeto estava **INACTIVE** (app fora do ar) e foi restaurado. Isso pode se repetir no plano gratuito. O sucessor deve: usar o app com frequência, ou assinar um plano pago, ou aceitar que precisa restaurar manualmente no dashboard.

## Contas e serviços (o sucessor precisa de acesso a todos)

| Serviço | Para quê | Observação |
|---|---|---|
| GitHub (org `nupieepro`) | Código, CI/CD | Transferir ownership |
| Cloudflare | Hospedagem (Pages) e domínio | Não pude auditar (sem acesso). Conferir projeto, domínio e DNS |
| Supabase (org `cyyfolwjvlhnrfadoibh`) | Banco, Auth, Storage | Conta Google `nupieeprotreinamentos@gmail.com` é a dona |
| EmailJS | E-mail de convite e de demanda | Serviço `service_4d8167g`. Plano gratuito: só 2 templates (`template_convite`, `template_demanda`). O de aniversário **não existe** |
| Web Push (VAPID) | Notificações push | Chave pública no código; **privada** só nos secrets do Supabase |

### Secrets do GitHub Actions (não consigo ler, mas o deploy depende deles)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Estado do banco (12/11/2026)

- 30 tabelas, todas com RLS ativo. 18 usuários (3 admins), 6 coordenadorias, 8 eventos, 5 assinaturas de push. Último cadastro em 21/10/2026.
- Migrations do repo (`migrations/001`–`018`) estão alinhadas com as aplicadas no projeto (a última é "observador", 21/10).
- As migrations são aplicadas manualmente (SQL Editor). Não há Supabase CLI configurado.

## ⚠️ Pendência principal: Edge Function `send-push` NÃO está deployada

O projeto não tem nenhuma Edge Function ativa, mas o código existe em `supabase/functions/send-push/index.ts`. **Notificações push não funcionam** até ela ser publicada. Para publicar:

1. `supabase functions deploy send-push --project-ref quwpyrdxyibcbyzwfilb`
2. Cadastrar o secret `VAPID_PRIVATE_KEY` (a privada correspondente à chave pública em `js/push.js`). Se a privada foi perdida, gerar novo par (`npx web-push generate-vapid-keys`), trocar a pública em `js/push.js` e em `index.ts`, e todos precisam reativar o push.
3. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase.

## Outras pendências

1. **Proteção contra senha vazada desativada** no Supabase Auth (ativar em Auth > Passwords).
2. `get_convite_by_token`, `consumir_convite` etc. são `SECURITY DEFINER` executáveis por `anon`: **intencional** (fluxo de convite), mas `is_admin_or_geral`, `is_geral`, `is_observador` e `log_historico_demanda` também aparecem executáveis por `anon`. Vale revisar e revogar `EXECUTE` de `anon` nelas.
3. CSP (`_headers`) usa `unsafe-inline` por causa de handlers inline (`onclick`) no app inteiro. Reduzir exige refatoração grande.
4. `js/config.defaults.js` tem a URL e a chave publicável do Supabase (públicas por design). Um comentário no próprio arquivo diz que o CI o sobrescreve, mas o workflow atual **não faz isso**: o arquivo versionado é o que vai para produção.
5. `supabase/gs.txt` é um resquício de Google Apps Script de outro projeto (a Lojinha). Pode ser removido.

## Primeiros passos para o sucessor

1. Ganhar acesso a GitHub, Cloudflare, Supabase e EmailJS (tabela acima).
2. Conferir que o projeto Supabase está ACTIVE e que o login funciona no site.
3. Publicar a `send-push` (seção acima).
4. Rodar localmente: `python3 -m http.server 8000` (aponta para o banco de produção!) e `npm test`.
5. **Rotacionar** token da Cloudflare, service role do Supabase e VAPID privada depois da troca de donos.
