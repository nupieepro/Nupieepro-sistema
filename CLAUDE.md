# NUPIEEPRO — Sistema de Gestão

## Visão Geral
Plataforma web (PWA) para gestão interna do NUPIEEPRO (Núcleo Piauiense de Engenharia de Produção), afiliado à ABJ 2026. Trata-se de uma SPA (Single Page Application) sem framework, com backend Supabase.

## Stack
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sem framework)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **E-mail**: EmailJS SDK
- **Deploy**: GitHub Pages (`.github/workflows/deploy.yml`)
- **PWA**: Service Worker (`sw.js`) + `manifest.json`

## Estrutura de Arquivos
```
dashboard.html          # SPA principal — todas as "pages" estão neste arquivo
index.html              # Página de login/landing
reset.html              # Reset de senha
convite.html            # Cadastro por convite
adminoperacoes.html     # Admin credenciamento QR Code (restrito)
operacoes-site-inscricoes.html  # Site público de inscrições

css/
  styles.css            # Design system principal — variáveis, layout, componentes
  patch.css             # Correções pontuais e overrides de urgência
  themes-override.css   # Temas premium (Fusion, Luminous, Obsidian, Rose, Glimmer)
  mobile.css            # Responsividade e ajustes mobile-first
  animations.css        # Keyframes, transições, efeitos glassmorphism, partículas
  premium.css           # Visual premium v9 — cursor 3D, efeitos especiais

js/
  app.js                # Core: Auth listener, roteamento, toasts, theme, modais
  auth.js               # Login/logout/convite, sessão Supabase
  abj.js                # Módulo ABJ — 18 atividades, pontuação, auditoria
  pages.js              # Carregamento dinâmico de módulos/páginas
  relatorio.js          # Geração e exportação de relatórios ABJ
  push.js               # Push notifications (web push API)
  premium.js            # Efeitos visuais premium — partículas, cursor 3D, glassmorphism

supabase/
  schema.sql            # Schema completo do banco (membros, demandas, financeiro, etc.)
  seed_developer.sql    # Seeds para ambiente de desenvolvimento
  migrations/
    seed.sql            # Seeds de produção / dados iniciais obrigatórios
```

## Módulos e Funcionalidades
- **Dashboard**: KPIs (pontos ABJ, demandas, membros, caixa), termômetro de auditoria, gamificação, aniversariantes, mini-calendário
- **ABJ Checklist**: 18 atividades oficiais com pontuação, status (pendente/revisão/aprovada), upload de evidências
- **Kanban**: Demandas por coordenadoria (A Fazer → Em Produção → Evidência → Concluída)
- **Financeiro**: Fluxo de caixa, filiações ABEPRO, calendário comercial, regra dos 60 dias
- **Gestão de Pessoas**: CRM de talentos, pesquisa de clima (eNPS), módulo TAP, convite por link
- **Marketing**: Social media tracker, Kanban da lojinha, campanhas
- **Operações**: Cofre de POPs, credenciamento QR Code
- **Projetos**: Patrocinadores, NUPICAST, eventos estratégicos
- **Calendário Universal**: Agenda oficial multiano
- **Notificações**: Central de alertas por coordenadoria
- **Configurações**: 6 temas, 4 tipografias

## Temas Disponíveis
| ID | Nome | Descrição |
|----|------|-----------|
| `fusion` | Fusion Elite | Oficial NUPI — preto + roxo |
| `luminous` | Luminous | Modo claro premium |
| `orange` / `dark-orange` | Orange Indust. | Preto + laranja (legacy) |
| `obsidian` | Obsidian | Absolute dark |
| `rose` | Rose Quartz | Elegante / refinado |
| `glimmer` | Glimmer | Sofisticado cinza |

## Roles / Permissões
| Role | Acesso |
|------|--------|
| `membro` | Apenas visualização das próprias coordenadorias |
| `coordenador` | Gestão da própria coordenadoria |
| `admin` / `dev` | Acesso total + dev banner + role switcher |

## Coordenadorias
- **GER** — Coordenação Geral (assembleia, votações, RGN)
- **OPS** — Operações (POPs, relatórios, credenciamento)
- **GP** — Gestão de Pessoas (CRM, clima, TAP)
- **MKT** — Marketing (social media, lojinha, campanhas)
- **PRJ** — Projetos (patrocinadores, ENEGEP, NUPICAST)
- **FIN** — Finanças (caixa, ABEPRO, comercial)

## Convenções de Desenvolvimento
- **Versioning**: query string `?v=N` nos scripts (ex: `abj.js?v=15`)
- **Namespace global**: cada módulo expõe objeto global (`App`, `ABJ`, `Kanban`, `Financeiro`, `Pessoas`, `Theme`, etc.)
- **Supabase client**: inicializado em `app.js`, reutilizado via `window.supabase`
- **Tema**: armazenado em `localStorage` (`nupie_theme`, `nupie_font`), aplicado via `data-theme` e `data-font` no `<html>`
- **CSP**: `unsafe-inline` e `unsafe-eval` permitidos (scripts inline existentes no HTML)
- **Fontes**: Google Fonts — DM Sans, Plus Jakarta Sans, Syne

## Visual Premium v9 (patch atual)
O visual premium v9 introduz:
- **Glassmorphism**: cards com backdrop-filter e bordas translúcidas
- **Partículas**: canvas animado no background do dashboard
- **Cursor 3D**: efeito de profundidade no cursor custom
- Gerenciado pelos arquivos: `animations.css`, `premium.css`, `premium.js`

## Links Externos do Projeto
- Lojinha pública: `https://nupieepro.github.io/Lojinha-Nupieepro/`
- Admin lojinha: `https://nupieepro.github.io/Lojinha-Nupieepro/admin.html`
