# 01 — Visão geral e arquitetura (Sistema NUPIEEPRO)

## O que é
Sistema interno de gestão do **NUPIEEPRO** (Núcleo Piauiense de Estudantes de Engenharia de Produção, UFPI). Centraliza o trabalho das 6 coordenadorias, a pontuação do **Selo ABJ 2026** (Associação Brasileira de Engenharia de Produção Júnior), financeiro, eventos/treinamentos, pessoas e comunicação. É uma **PWA** (instalável no celular) em site estático, sem build, que fala direto com o Supabase.

- Produção: Cloudflare Pages, projeto `nupieepro-sistema` (https://nupieepro-sistema.pages.dev; domínio próprio: ____________ a preencher)
- Backend: Supabase `quwpyrdxyibcbyzwfilb` (us-east-2)
- Tema: 100% HTML/CSS/JS "vanilla". Nenhum framework.

## Telas (arquivos HTML)
| Arquivo | Para quê |
|---|---|
| `index.html` | Login (e-mail/senha), link "esqueci a senha" |
| `convite.html` | Cadastro via **link de convite** (`?token=...`). Ninguém se cadastra sozinho: um coordenador/admin gera o convite |
| `reset.html` | Redefinir senha (link enviado por e-mail pelo Supabase) |
| `dashboard.html` | O app em si (sidebar + todas as páginas). Single-page: o JS troca o conteúdo conforme a página |
| `privacidade.html` | Política de privacidade (LGPD) |

## JavaScript (`js/`)
| Arquivo | Responsabilidade |
|---|---|
| `config.defaults.js` | **URL e chave publicável do Supabase.** É daqui que o app sabe em qual projeto conecta. Trocar de projeto = editar este arquivo (e o CSP em `_headers`) |
| `app.js` (~4.000 linhas) | Núcleo: sidebar (`ROLE_PAGES`, `GLOBAL_PAGES`), navegação (`goTo`), `App`, calendário (`Cal`, `NovoCal` com feriados BR), kanban de demandas (`Dem`), `Projetos`, `Marketing`, `GP`, notificações, modais/toasts, `sanitize()`/`jsAttr()` (anti-XSS) |
| `pages.js` (~5.900 linhas) | Uma "página" por objeto: `PageGeral`, `PageMarketing`, `PageFinancas`, `PageProjetos`, `PageOperacoes`, `PagePessoas`, `PageDev` (admin), `PageGlobal`, `PageNotificacoes`. Mapa id→render no final do arquivo (~linha 5844) |
| `auth.js` | Login, logout, cadastro por convite (`registerWithToken`), reset de senha |
| `permissoes.js` | **Matriz de papéis e regras de negócio do Regimento** (ver abaixo) |
| `abj.js` | Módulo Selo ABJ: 18 atividades, estrelas, progresso, evidências com upload |
| `relatorio.js` | Relatórios mensais ABJ em PDF (jsPDF) e pontuação por prazo |
| `documentos.js` | Gera documentos formais em PDF/Word (layout oficial) |
| `emails.js` | Envio de e-mails via **EmailJS** (convite, demanda, aniversário) |
| `push.js` | Notificações push (Web Push/VAPID) e registro do service worker |
| `validacao.js` | Regras de senha (mín. 8, letras+números), iniciais, perfil completo |
| `js/vendor/` | Libs locais (sem CDN): supabase-js, chart.js, jsPDF, docx, xlsx, lucide, emailjs |
| `sw.js` | Service worker (cache `nupieepro-v131`, rede primeiro, offline como fallback) |

## Papéis (roles) e o que cada um vê
No banco, `users.role` ∈ `admin`, `coordenador`, `assessor`, `membro`, `observador` (+ `conselheiro`/`coordenador_geral` tratados no código). Matriz completa em `js/permissoes.js`.

| Papel | Acesso |
|---|---|
| **admin** | Tudo, inclusive usuários, papéis, logs, convites; ignora regras de negócio (para testes). É o "desenvolvedor". |
| **coordenador da Geral (GER)** → `coordenador_geral` | Lê tudo; cria convites/eventos, aprova relatórios ABJ; **não** gerencia usuários |
| **coordenador** | Sua coordenadoria + páginas institucionais; convida para a própria coord |
| **assessor** | Sua coordenadoria, só leitura de gestão |
| **membro** | Sua coordenadoria + institucionais |
| **conselheiro** | Ex-Coordenadoria Geral; auditoria por **1 ano, sem renovação**; só dashboard, ABJ, notificações, reuniões e assembleia |
| **observador** | Login neutro de demonstração: vê tudo, **não escreve nada** (garantido por policies RESTRICTIVE no banco, migração 018) |

> A segurança real está no banco (RLS). As flags de `permissoes.js` só escondem botões. Não confiar nelas como proteção.

## Mapa de páginas (sidebar) — o que cada uma faz
**Geral (GER):** Painel Central (`dashboard`), Reuniões e Check-in (`geral_reunioes`), Planejamento Semanal (`geral_planejamento`), Caixa de Melhorias (`geral_melhorias`), Gestão de Membros (`pessoas`), Kanban Geral (`tarefas`).
**Operações (OPS):** Relatórios ABJ (`ops_relatorios`), Cofre de POPs (`ops_pops`), Arquivo Digital (`ops_arquivo`), Módulo TAP/Inovação (`gp_tap`, termo de abertura de projeto em seções).
**G. Pessoas (GP):** Banco de Talentos (`gp_talentos`), Pesquisa de Clima (`gp_clima`), Aniversários (`gp_aniversarios`), CRM de membros (`gp_crm`), Treinamentos Internos (`gp_treinamentos`).
**Marketing (MKT):** Social Media Tracker (`mkt_tracker`), Trello (`mkt_trello`, link ao quadro externo), Notion (`mkt_notion`).
**Projetos (PRJ):** Eventos Estaduais (`prj_eventos`), Momento ENEGEP (`prj_enegep`), Treinamentos Externos (`prj_treinamentos`), NUPICAST Tracker (`prj_nupicast`), Parcerias e Patrocínios (`prj_parcerias`, `geral_parcerias`).
**Finanças (FIN):** Fluxo de Caixa (`fin_fluxo`: vendas e despesas), Associações ABJ (`fin_abepro`), Calendário Comercial (`fin_comercial`), Kanban da Lojinha (`mkt_kanban`), Lojinha (App) (`mkt_lojinha_admin`: abre a **Lojinha**, repositório irmão).
**Institucional (todos):** Visitas Técnicas, Apresentações Institucionais, Produção Científica, Assembleia e Votos (`votacoes`/`votos`), Check-in Digital, Treinamentos Internos.
**Admin (`dev_usuarios`):** usuários, convites, permissões, logs, sistema.
**Comuns:** Notificações, Calendário compartilhado, Demandas (kanban: pendente → executando → realizada → evidência → auditada, com histórico).

## Regras do Regimento implementadas (`js/permissoes.js`, testadas em `tests/`)
- Mandato de coordenação ≤ 3 anos; conselheiro tem acesso por 1 ano sem renovação.
- Calendário comercial: plano de ação precisa de **60 dias** de antecedência.
- Relatório ABJ mensal: no prazo vale 10 pts; até o 3º dia do mês seguinte, −2 pts (8); depois, 0.
- Repasse transitório do financeiro: prazo de **24 h** (vencido = infração gravíssima).
- Alerta PCD: membro sem entrega em **2 meses**; risco de inatividade com 18 meses sem atividade.
- Quem conclui o curso (`data_conclusao`) perde acesso.

## Selo ABJ 2026
18 atividades em `atividades_abj`, agrupadas em 5 estrelas com prazos (31/03, 31/05, 31/07, 31/08, 30/09/2026 — arrays `ABJ_ESTRELAS` em `js/abj.js`). **Esses prazos e atividades são do ciclo 2026**; para o ciclo seguinte é preciso atualizar `ABJ_ESTRELAS`, o seed de atividades e as regras de pontuação.

## Integrações externas
| Serviço | Uso | Onde configurado |
|---|---|---|
| Supabase | Banco, Auth, Storage (`evidencias`), Edge Function | `js/config.defaults.js` |
| EmailJS | E-mails de convite/demanda/aniversário | `js/emails.js` (serviço `service_4d8167g`, chave pública `WIiLVFRJPDeqTP7Ox`) |
| Web Push (VAPID) | Push no celular/desktop | Pública em `js/push.js` e `send-push/index.ts`; privada nos secrets do Supabase |
| Cloudflare Pages | Hospedagem + headers de segurança (`_headers`) | `.github/workflows/deploy.yml` |
| GitHub Actions | Testes + deploy | secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Lojinha NUPIEEPRO | Link para loja e admin da loja | `js/app.js` (URLs do GitHub Pages) |
| Trello / Notion | Atalhos para quadros externos do Marketing | `js/pages.js` |
