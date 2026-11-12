# 04 — Credenciais e acessos (Sistema)

> **Preencher antes de enviar ao sucessor.** Não commitar preenchido em repositório. Entregar por canal seguro (gerenciador de senhas) e manter este arquivo preenchido fora do Git.

| Serviço | Endereço | Usuário / e-mail | Senha | Observações |
|---|---|---|---|---|
| GitHub (org `nupieepro`) | https://github.com/nupieepro/Nupieepro-sistema | ____________ | ____________ | 2FA? ____ |
| Cloudflare | https://dash.cloudflare.com → Workers & Pages → `nupieepro-sistema` | ____________ | ____________ | ID da conta: ____________ |
| Token da API Cloudflare (GitHub secret `CLOUDFLARE_API_TOKEN`) | Cloudflare → My Profile → API Tokens | — | ____________ | Permissão: Pages Edit |
| Domínio / DNS | Registro.br / Cloudflare DNS | ____________ | ____________ | Domínio: ____________ |
| Supabase (org `cyyfolwjvlhnrfadoibh`) | https://supabase.com/dashboard/project/quwpyrdxyibcbyzwfilb | ____________ | ____________ | Login via Google? ____ |
| Login do sistema (admin) | https://nupieepro-sistema.pages.dev | ____________ | ____________ | Há 3 admins; listar: ____________ |
| Login do observador (demo) | idem | ____________ | ____________ | Só leitura |
| EmailJS | https://dashboard.emailjs.com | ____________ | ____________ | Serviço `service_4d8167g` |
| Gmail do projeto | https://mail.google.com | nupieeprotreinamentos@gmail.com | ____________ | Dono do Supabase; contato VAPID |
| Gmail financeiro | https://mail.google.com | financeironupieepro@gmail.com | ____________ | |
| Trello (quadro Marketing) | https://trello.com/b/WrXCn9JF | ____________ | ____________ | |
| Notion (Marketing) | ____________ | ____________ | ____________ | |

## Chaves técnicas (não são senhas de login)
| Item | Onde fica | Valor/Status |
|---|---|---|
| Supabase URL | `js/config.defaults.js`, `_headers` | `https://quwpyrdxyibcbyzwfilb.supabase.co` (pública) |
| Chave publicável Supabase | `js/config.defaults.js` | Pública por design |
| Service role key | Supabase → Settings → API | **Secreta**: ____________ |
| `VAPID_PRIVATE_KEY` | Secret da Edge Function `send-push` (a criar) | ____________ |
| VAPID pública | `js/push.js`, `send-push/index.ts` | `BHS7GQ...Fn-o` (pública) |
| EmailJS Public Key | `js/emails.js` | `WIiLVFRJPDeqTP7Ox` (pública) |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | GitHub → Settings → Secrets → Actions | ____________ |
