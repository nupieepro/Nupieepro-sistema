# 03 — Operação, deploy e manutenção (Sistema)

## Deploy
- Arquivo `.github/workflows/deploy.yml`: em push na `main` e em PRs roda `npm test` (Node 20, 52 testes) e, **só se passar**, `wrangler pages deploy . --project-name nupieepro-sistema`. PR gera preview e comenta o link. Push em `main` = produção.
- Secrets do GitHub Actions: `CLOUDFLARE_API_TOKEN` (permissão: Cloudflare Pages Edit) e `CLOUDFLARE_ACCOUNT_ID`.
- `_headers` (Cloudflare Pages) aplica CSP, HSTS, X-Frame-Options DENY etc. e `no-cache` em `sw.js`, `manifest.json`, `index.html`, `dashboard.html`. **O `connect-src` do CSP lista o projeto Supabase e o EmailJS.** Se trocar de Supabase ou de serviço de e-mail, atualizar o `_headers`, senão o navegador bloqueia as chamadas.
- Verificado em 12/11/2026: https://nupieepro-sistema.pages.dev responde 200 com os headers do `_headers` aplicados.

## Cloudflare: o que foi e não foi auditado
O conector da Cloudflare usado na auditoria (Workers Bindings, depreciado) só enxerga Workers, KV, D1, R2 e Hyperdrive: a conta tem **0 Workers, 0 KV, 0 D1** e o R2 está desativado. Ele **não lê Pages, domínios nem DNS**, então domínio próprio, registros DNS e variáveis do projeto Pages precisam ser conferidos no painel (Workers & Pages → `nupieepro-sistema`). O deploy funciona (CI e preview verificados), logo o token e o projeto existem.

## Rodar localmente
```
python3 -m http.server 8000   # abrir http://localhost:8000/
npm test                      # 52 testes (node --test), sem dependências
```
> Aponta para o banco de produção (`js/config.defaults.js`). Para testar isolado, criar um projeto Supabase novo e trocar URL/chave.

## Cache e versão (importante em cada release)
Os assets usam `?v=131` e o service worker usa `CACHE_NAME = 'nupieepro-v131'`. **Ao publicar mudança em JS/CSS: incrementar o número em todos os `?v=` (`dashboard.html`, `sw.js`, etc.) e em `CACHE_NAME`**, senão usuários continuam com a versão antiga. O app detecta nova versão e recarrega (listener de `controllerchange` em `dashboard.html`).

## Mudanças comuns
| Quero... | Onde |
|---|---|
| Adicionar uma página | Registrar em `ROLE_PAGES`/`GLOBAL_PAGES` (`js/app.js`), criar o render em `js/pages.js` e mapear o id no objeto de rotas (~linha 5844), liberar em `permissoes.js` e criar a RLS da tabela nova |
| Mudar quem vê o quê | `ROLE_PAGES` + `MATRIZ` em `permissoes.js` **e** as policies RLS (o banco é quem protege de verdade) |
| Novo papel | Constraint de `users.role`, `MATRIZ`, trigger de aceite de convite, policies. Veja migrações 010 e 018 como exemplo |
| Novo ciclo ABJ | `ABJ_ESTRELAS` (`js/abj.js`), seed de `atividades_abj`, regras em `relatorio.js` |
| Trocar texto/templates de e-mail | `js/emails.js` + templates no painel do EmailJS (`template_convite`, `template_demanda`) |
| Mudar domínio | Cloudflare Pages → Custom domains; Supabase Auth → URL Configuration; (os links de convite usam a origem atual) |

## Criar o primeiro admin / acesso de emergência
Usuário criado em Supabase → Authentication → Users; depois `update public.users set role='admin' where email='...'` (o trigger `protect_self_update_users` impede autopromoção por usuário comum, mas o SQL Editor tem privilégio). Ver `supabase/seed_developer.sql`.

## Problemas conhecidos / armadilhas
- **Supabase pausa por inatividade** (plano gratuito). Foi o que aconteceu em 2026; restaurar em Dashboard → Restore. O app inteiro fica fora do ar até lá.
- **Push desligado** até publicar `send-push`.
- **EmailJS plano gratuito:** só 2 templates; o aviso de aniversário por e-mail não existe (o código trata a falha).
- CSP com `'unsafe-inline'` por causa dos handlers `onclick=""` espalhados. Qualquer dado de usuário exibido deve passar por `sanitize()`/`jsAttr()` (`js/app.js`), nunca `innerHTML` cru.
- `js/config.defaults.js` comenta que o CI sobrescreve o arquivo; o workflow atual não faz isso.
- `supabase/gs.txt`: resquício de Google Apps Script da Lojinha, pode apagar.

## Checklist de transferência
- [ ] Owner na org GitHub `nupieepro`
- [ ] Acesso à conta Cloudflare (Pages, domínio, DNS) e novo `CLOUDFLARE_API_TOKEN` nos secrets do repo
- [ ] Owner na org Supabase
- [ ] Conta EmailJS transferida (ou recriada com os 2 templates)
- [ ] Gmail `nupieeprotreinamentos@gmail.com` (dono do Supabase e contato VAPID) transferido ou trocado
- [ ] Rotacionar: service role do Supabase, VAPID privada, token Cloudflare
- [ ] Criar admin novo; remover/rebaixar o antigo (3 admins hoje: conferir quem são)
- [ ] Publicar `send-push`
