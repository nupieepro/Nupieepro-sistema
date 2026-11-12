# 05 — Segurança (Sistema NUPIEEPRO)

Estado em 12/11/2026. Legenda: ✅ feito e ativo · 🟡 parcial · 🔧 recomendado/depende de ação externa (Cloudflare, Supabase, GitHub) · ➖ não se aplica a esta arquitetura (site estático + Supabase, sem servidor próprio).

## 1. O que está implementado

| Controle | Onde | Estado |
|---|---|---|
| **SQL injection** | Não há SQL montado por texto: o app só usa PostgREST/RPC com parâmetros. Auditado: nenhuma função do banco usa SQL dinâmico (a única `EXECUTE` é `rls_auto_enable`, interna do Supabase) e nenhum `.or()/.ilike()` recebe texto interpolado | ✅ |
| **XSS** | `sanitize()` e `jsAttr()` (`js/app.js`). Em 12/11/2026 corrigidos pontos que exibiam sem escape: título de demanda, nome em faltas, nome no modal de edição, cargo, coordenadoria no relatório, nome em campos `value=` | ✅ |
| **Headers HTTP** | `_headers`: CSP (connect-src restrito ao Supabase/EmailJS), HSTS 1 ano, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy (câmera, microfone, geolocalização, USB desativados), `Cross-Origin-Opener-Policy: same-origin` | ✅ |
| **Anti-tabnabbing** | `rel="noopener noreferrer"` em todo `target="_blank"` (22 corrigidos; teste automático impede regressão) | ✅ |
| **Controle de acesso / privilégios** | RLS em 30 tabelas (166 policies). Papel `observador` com policies RESTRICTIVE (somente leitura garantida no banco). Trigger `protect_self_update_users` impede autopromoção | ✅ |
| **Detecção de escalação de privilégio** | Migration 019: trilha `auditoria_seguranca` registra toda mudança de `role`, `ativo`, `coordenadoria_id` e e-mail em `users` (quem, antes, depois). `admin_seguranca_resumo()` lista promoções a admin | ✅ |
| **Monitoramento de alterações no banco / cofre de evidências** | Mesma trilha: somente-acréscimo (um trigger bloqueia UPDATE/DELETE até para admin e service_role), RLS só admin lê, e-mail mascarado (LGPD). Convites criados/removidos também são registrados | ✅ |
| **Fluxo de aprovação humana** | Convite só por coordenador/admin; relatórios ABJ passam pela Coordenação Geral; admin não é criado pelo app | ✅ |
| **Revogação de acesso** | Coluna `ativo` e `data_conclusao`; conselheiro expira em 1 ano (regra do Regimento) | 🟡 revogar sessão ativa exige "Sign out all" no Supabase (ver §3) |
| **Monitoramento de integridade de arquivos** | `security/integridade.sha256` + `tests/seguranca.test.js`: se alguém alterar uma lib de `js/vendor/`, o `npm test` falha e **o deploy é bloqueado** | ✅ |
| **Cofre de segredos** | Nenhum segredo no código (teste automático procura chaves privadas, `service_role`, tokens GitHub/AWS/Cloudflare). Segredos reais ficam em GitHub Secrets e Supabase Secrets | ✅ |
| **Análise de código (SAST) e dependências** | Workflow `security.yml`: CodeQL `security-extended` em PRs, `main` e toda segunda. Dependabot para as GitHub Actions. Libs JS são vendorizadas (sem `npm`): atualização manual, ver §4 | ✅ / 🟡 |
| **Scanner contínuo** | CodeQL semanal + `saude-do-site` (headers e validade do certificado do site em produção, semanalmente) | ✅ |
| **Monitoramento de certificado SSL** | Job `saude-do-site` falha se o certificado expira em < 14 dias | ✅ |
| **Divulgação responsável** | `.well-known/security.txt` | ✅ |
| **Gestão de atualizações** | Dependabot (Actions) + cache do service worker versionado | 🟡 |
| **Menor privilégio no CI** | `permissions: contents: read` no topo dos workflows; deploy só roda se os testes passarem | ✅ |
| **Validação de senha** | Mínimo 8, letras e números (`js/validacao.js`); rate limiter no login (`RateLimiter`) além do limite nativo do Supabase Auth | ✅ |

## 2. Itens da lista pedida que NÃO se aplicam (e por quê)
| Item | Motivo |
|---|---|
| Isolamento de contêiner/servidor, resposta a ransomware, quarentena de arquivos, armadilha/isca em servidor | Não há servidor, contêiner nem disco próprio: o site é estático na Cloudflare e o banco é gerenciado pelo Supabase. O equivalente é o Supabase/Cloudflare (responsabilidade do provedor) |
| Coletor central de logs, normalizador, motor de correlação, enriquecimento com inteligência de ameaças | Excesso para 18 usuários. Substituto proporcional: trilha `auditoria_seguranca` + logs do Supabase (Dashboard → Logs) |
| Bloqueio dinâmico em firewall/WAF, controle dinâmico de limite de requisições, anti-bot/anti-raspagem | Só fazem sentido na borda: ver §3 (regras de WAF/Turnstile na Cloudflare) |
| Antifraude de transações/pagamentos | O Sistema não processa pagamento (é a Lojinha). Financeiro aqui é controle interno |
| Triagem de phishing | Sem caixa de e-mail no sistema |
| Abertura automática de chamados | Substituto: GitHub Issues + alertas do Dependabot/CodeQL |

## 3. O que exige ação sua no painel (não dá para fazer pelo repositório)
1. **Supabase → Auth → Passwords:** ligar *Leaked password protection* e subir o tamanho mínimo de senha. Ligar **MFA** para contas admin.
2. **Supabase → Auth → URL Configuration:** Site URL e Redirect URLs só com o domínio de produção.
3. **Supabase → Auth → Rate Limits:** conferir limites de login/signup/recuperação (força bruta e *credential stuffing* são contidos aqui).
4. **Revogar sessões** de quem saiu: Authentication → Users → *Sign out* no usuário (e `ativo = false`).
5. **Backup:** o plano gratuito do Supabase **não tem backup diário nem PITR**. Opções: plano Pro (backups diários, PITR opcional) ou um `pg_dump` agendado (ver `docs/03`). Faça um teste de restauração em projeto novo pelo menos 1× por semestre.
6. **Cloudflare (dono da conta):**
   - SSL/TLS em *Full (strict)*, *Always Use HTTPS*, *Min TLS 1.2*, DNSSEC ligado.
   - WAF → *Managed rules* e *Rate limiting* (ex.: 20 req/min por IP em `/` e bloqueio de User-Agents vazios).
   - **Turnstile** (CAPTCHA gratuito) na tela de login se houver ataque.
   - *Bot Fight Mode*; *Security → Events* para ver bloqueios.
   - Token de API do GitHub Actions com permissão **somente Pages: Edit**, expiração e restrito ao IP/conta.
7. **GitHub:** ativar *Secret scanning + Push protection*, *Dependabot alerts*, proteção da branch `main` (PR obrigatório + status checks `test`, `testes-seguranca`) e 2FA obrigatório na organização.
8. **Enviar e-mail de aviso a cada novo admin:** hoje só a trilha registra (consulta via `select * from admin_seguranca_resumo()` logado como admin).

## 4. Rotinas recorrentes
| Frequência | Ação |
|---|---|
| Semanal | Ler o resultado do workflow *Segurança* (aba Actions) e os alertas do Dependabot |
| Mensal | Rodar `select public.admin_seguranca_resumo();` e conferir promoções a admin e mudanças de papel; revisar usuários `ativo` que já saíram do núcleo |
| Trimestral | Atualizar as libs de `js/vendor/` (supabase-js, jsPDF, xlsx, chart.js, docx, lucide, emailjs): baixar a versão nova, **ler o changelog de segurança**, rodar `sha256sum js/vendor/*.js > security/integridade.sha256`, `npm test`, e subir o `?v=` e o `CACHE_NAME` |
| Semestral | Teste de restauração de backup; rotacionar service role, VAPID e token Cloudflare; revisar `admin`s |

## 5. Resposta a incidente (resumo)
1. **Conter:** Supabase → Authentication → desativar o usuário e *Sign out*; se houver suspeita de vazamento de chave, rotacionar a service role (Settings → API) e o token Cloudflare.
2. **Investigar:** `select * from public.auditoria_seguranca order by id desc limit 200;` (quem mudou papel/convites) e Dashboard → Logs (Auth/API/Postgres).
3. **Erradicar:** corrigir a causa (policy, código); `git revert` e redeploy se for código.
4. **Comunicar (LGPD):** havendo dado pessoal exposto, avisar os titulares e a ANPD em prazo razoável; registrar o ocorrido.
5. **Aprender:** abrir issue com a linha do tempo e a correção.

## 6. Riscos aceitos / pendências
- `is_admin_or_geral`, `is_geral`, `is_observador`, `log_historico_demanda` executáveis por `anon`: usadas dentro de policies `TO public`; revogar `EXECUTE` do `anon` poderia transformar consultas anônimas em erro. Retornam só booleano sobre o próprio chamador. Revisar com cuidado antes de mexer.
- CSP precisa de `'unsafe-inline'` (handlers `onclick`). A defesa real contra XSS é o escape (`sanitize`/`jsAttr`) e a revisão dos pontos de `innerHTML` (~250 no código). Ao criar tela nova, **escape todo dado vindo do banco**.
- Cadastro por convite confirma e-mail automaticamente (`auto_confirm_email_trigger`): a segurança depende do segredo do link de convite. Convites devem ter validade curta.
- Push (VAPID) não está publicado ainda.
