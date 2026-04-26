# NUPIEEPRO — Guia Completo de Desenvolvimento
> Versão: v9.0 — Schema real 100% mapeado
> Escrito por JR para Claude Code e Antigravity
> Última atualização: 27/04/2026

---

## 🧠 O Projeto

Software de gestão do NUPIEEPRO — Núcleo Piauiense de Estudantes de
Engenharia de Produção (UFPI, Teresina-PI), afiliado à ABEPRO Jovem.
PWA hospedado no GitHub Pages com backend Supabase.

**Dev principal:** José Rayan Bezerra Nascimento (JR / Rayan)
- Assessor de Marketing + Dev Admin (perfil duplo com toggle animado)
- Co-fundador DAX Visual Agency (com Edgar Agnussem e Rafael Inácio)

---

## 🔐 Credenciais

| Serviço | Valor |
|---------|-------|
| Repositório | https://github.com/nupieepro/Nupieepro-sistema |
| Supabase URL | https://quwpyrdxyibcbyzwfilb.supabase.co |
| Supabase anon key | sb_publishable_VmEMT07DiE1f5DtxzgZomA_-F0gZIpM |
| EmailJS public key | WIiLVFRJPDeqTP7Ox |
| EmailJS service | service_85bjukt |
| E-mail remetente | nupieeprotreinamentos@gmail.com |
| Display name | NUPIEEPRO Sistema |

---

## 📁 Estrutura Completa do Projeto

```
/
├── index.html              ← Login — NÃO MODIFICAR (funciona)
├── dashboard.html          ← Dashboard — NÃO SUBSTITUIR (patch cirúrgico)
├── convite.html            ← Onboarding — NÃO MODIFICAR
├── reset.html              ← Reset senha — NÃO MODIFICAR
├── sw.js                   ← Service Worker v9/v10 — NÃO SUBSTITUIR
├── manifest.json           ← PWA — NÃO SUBSTITUIR (usa icon.svg)
├── CLAUDE.md               ← Este arquivo
│
├── css/
│   ├── styles.css          ← Design system — NÃO MODIFICAR
│   ├── patch.css           ← Classes complementares — ADICIONAR
│   ├── themes-override.css ← 8 temas extras — ADICIONAR
│   ├── mobile.css          ← Responsivo iPhone/Android — ADICIONAR
│   ├── animations.css      ← Animações premium — ADICIONAR
│   └── premium.css         ← Glassmorphism·Neon·3D·Cursor — ADICIONAR
│
├── js/
│   ├── auth.js             ← Auth Supabase — NÃO MODIFICAR
│   ├── app.js              ← Core v8 — NÃO MODIFICAR
│   ├── abj.js              ← ABJ v3 schema real — SUBSTITUIR
│   ├── pages.js            ← Módulos das coords v2 — ADICIONAR
│   ├── relatorio.js        ← Geração de PDF — ADICIONAR
│   ├── push.js             ← Push notifications — ADICIONAR
│   └── premium.js          ← Cursor·Partículas·3D·Ripple — ADICIONAR
│
├── assets/
│   ├── icon.svg            ← Logo SVG (já existe — NÃO MEXER)
│   ├── icon.png            ← Logo PNG (já existe — NÃO MEXER)
│   └── logo.png            ← Alternativa (já existe)
│
└── supabase/
    └── migrations/
        └── seed.sql        ← RODAR NO SUPABASE (seguro)
```

---

## ✏️ PATCH no dashboard.html — 2 edições cirúrgicas

### ⚠️ NÃO substituir o arquivo inteiro. Apenas estas 2 edições.

### Edição 1 — CSS (após styles.css)

Encontrar esta linha:
```html
<link rel="stylesheet" href="css/styles.css">
```

Substituir por:
```html
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/patch.css">
<link rel="stylesheet" href="css/themes-override.css">
<link rel="stylesheet" href="css/mobile.css">
<link rel="stylesheet" href="css/animations.css">
<link rel="stylesheet" href="css/premium.css">
```

### Edição 2 — JS (após abj.js)

Encontrar esta linha:
```html
<script src="js/abj.js?v=14"></script>
```

Substituir por:
```html
<script src="js/abj.js?v=15"></script>
<script src="js/pages.js?v=1"></script>
<script src="js/relatorio.js?v=1"></script>
<script src="js/push.js?v=1"></script>
<script src="js/premium.js?v=1"></script>
```

---

## 🗃️ Schema Real do Supabase — 100% mapeado

### Tabelas existentes

| Tabela | Uso |
|--------|-----|
| `users` | Usuários (não `profiles`!) |
| `coordenadorias` | 6 coordenadorias com UUID |
| `atividades_abj` | 18 atividades do Manual (seed.sql) |
| `progresso_abj` | Progresso por atividade |
| `evidencias_abj` | Arquivos de evidência |
| `demandas` | Kanban (coluna = `coluna`, não `status`!) |
| `eventos` | Reuniões + eventos + visitas + treinamentos |
| `vendas` | Entradas financeiras |
| `despesas` | Saídas financeiras |
| `calendario` | Posts de marketing e calendário |
| `frequencia` | Presença em eventos e reuniões |
| `notificacoes` | Notificações in-app por usuário |
| `historico_demandas` | Histórico de movimentação do kanban |
| `inscritos_evento` | Inscrições em eventos |
| `convites` | Convites de novos membros (7 dias) |
| `relatorios_mensais` | Relatórios mensais ABJ |
| `push_subscriptions` | Tokens push (criado pelo seed.sql) |

### Funções RLS disponíveis no banco

```sql
is_admin()          → true se role = 'admin'
is_coord_or_admin() → true se role in ('admin','coordenador')
get_my_coord()      → retorna coordenadoria_id do usuário logado
get_my_role()       → retorna role do usuário logado
```

### Trigger handle_new_user

Quando um novo usuário faz signup, o banco cria automaticamente
o registro em `public.users` com os dados de `raw_user_meta_data`.
O `auth.js` original já passa esses dados corretamente.

### Políticas RLS por tabela

| Tabela | Leitura | Escrita |
|--------|---------|---------|
| `coordenadorias` | Todos | `is_admin()` |
| `atividades_abj` | Todos | `is_coord_or_admin()` |
| `progresso_abj` | Todos | Insert: todos · Update: `is_coord_or_admin()` |
| `evidencias_abj` | Todos | Insert: todos · Update: `is_coord_or_admin()` |
| `eventos` | Todos | `is_coord_or_admin()` |
| `calendario` | Todos | `is_coord_or_admin()` |
| `demandas` | Por coord ou responsável | Insert: todos · Update: responsável ou coord |
| `vendas` | Por coord ou admin | `is_coord_or_admin()` |
| `despesas` | Por coord ou admin | `is_coord_or_admin()` |
| `frequencia` | Própria ou coord | `is_coord_or_admin()` |
| `notificacoes` | Próprias | Próprias |
| `users` | Próprio, mesma coord, admin | Self ou admin |
| `convites` | Anon (para validar token) | `is_coord_or_admin()` |

### ⚠️ Pegadinhas críticas

```
❌ profiles        → ✅ users
❌ demandas.status → ✅ demandas.coluna
❌ abj_atividades_registros → ✅ progresso_abj
❌ convites expira 1h → ✅ convites expira 7 dias
```

### Joins corretos

```js
// Usuário com coordenadoria completa
supabase.from('users')
  .select('*, coordenadorias(id, nome, sigla, cor, icone)')
  .eq('id', userId)

// Demandas com coord e responsável
supabase.from('demandas')
  .select('*, coordenadorias(nome), users!responsavel_id(nome)')

// Progresso ABJ com evidências
supabase.from('progresso_abj')
  .select('*, evidencias_abj(*), atividades_abj(numero, nome)')

// Eventos com coord
supabase.from('eventos')
  .select('*, coordenadorias(nome, icone)')
```

---

## 👥 Membros e Roles

| Nome | Role | Coordenadoria |
|------|------|---------------|
| Luís Henrique | admin | Geral |
| Ana Lívia | admin | Geral |
| Edgar Agnussem | coordenador | Marketing |
| Rayan Bezerra (JR) | admin | Marketing |
| Kauan Castro | assessor | Marketing |
| João Vitor | coordenador | Financeira |
| Raissa Ohrana | assessor | Financeira |
| Lyvia Maria | assessor | Financeira |
| Antônio Gabriel | coordenador | Projetos |
| Cleysbiane Maria | coordenador | Projetos |
| Beatriz Fernandes | assessor | Projetos |
| Ilaiana Rebeca | assessor | Projetos |
| Laís Teixeira | coordenador | Operações |
| Joelson Monteiro | coordenador | Operações |
| Isabela Abreu | coordenador | Gestão de Pessoas |
| Lilian Cristina | coordenador | Gestão de Pessoas |

**Atualmente com conta:** JR + Lilian (ambos admin)

---

## ✅ Status de Todas as Entregas

| Arquivo | Versão | Status | O que fazer |
|---------|--------|--------|-------------|
| css/styles.css | original | ✅ perfeito | NÃO MEXER |
| css/patch.css | v1 | ✅ gerado | ADICIONAR |
| css/themes-override.css | v1 | ✅ gerado | ADICIONAR |
| css/mobile.css | v1 | ✅ gerado | ADICIONAR |
| css/animations.css | v2 | ✅ gerado | ADICIONAR |
| css/premium.css | v1 | ✅ gerado | ADICIONAR |
| js/auth.js | original | ✅ perfeito | NÃO MEXER |
| js/app.js | v8 | ✅ adaptado | NÃO MEXER |
| js/abj.js | v3 | ✅ gerado | SUBSTITUIR |
| js/pages.js | v2 | ✅ gerado | ADICIONAR |
| js/relatorio.js | v1 | ✅ gerado | ADICIONAR |
| js/push.js | v1 | ✅ gerado | ADICIONAR |
| js/premium.js | v1 | ✅ gerado | ADICIONAR |
| dashboard.html | original | ✅ perfeito | PATCH CIRÚRGICO |
| sw.js | v9/v10 | ✅ perfeito | NÃO MEXER |
| manifest.json | original | ✅ ok | NÃO MEXER |
| supabase/seed.sql | v3 | ✅ gerado | RODAR NO SUPABASE |

---

## 🎨 O Que Foi Melhorado Visualmente

### premium.css (696 linhas)
- Sidebar com glassmorphism real (backdrop-filter: blur 28px)
- Logo com glow laranja pulsante + float animado
- Nav items com indicator bar laranja e hover translateX
- Topbar com gradiente animado + linha laranja na base
- KPI cards com 3D tilt e neon hover
- Section cards com glassmorphism refinado
- Botões com gradiente + sombra neon + hover lift
- Barra de progresso com shimmer neon laranja
- Modal ultra premium (blur 40px, borda com gradiente)
- Notif badge com animação neon pulsante
- Stats com gradient text
- Profile badge com neon
- Kanban cards com glassmorphism
- Fundo com gradiente respirante animado
- Scrollbar ultra fina (4px) com gradiente
- Dev banner com shimmer verde animado
- Cursor industrial personalizado (desktop only)

### premium.js (325 linhas)
- Cursor dot + ring com lag suave (desktop)
- Canvas de 55 partículas conectadas (pausa quando aba escondida)
- 3D Tilt nos KPI cards com perspective (hover desktop)
- Confetti ao aprovar atividade ABJ (window.PremiumConfetti)
- Haptic feedback: light/medium/heavy/success/error
- Ripple em todos os cliques de botão
- Spotlight seguindo o mouse nos cards

### animations.css (272 linhas)
- Páginas entram com fadeSlideUp (.page.active)
- Cards escalonados (delay por nth-child)
- Nav items com fadeSlideLeft
- Skeleton loaders com shimmer
- Modal com spring animation
- Countdown pulsando
- Barra de auditoria com shimmer
- Estrelas ABJ com glow + float + starEarn
- Kanban cards com hover rotate
- Logo com logoPulse

### mobile.css (543 linhas)
- Safe areas iPhone (Dynamic Island + notch)
- height: 100dvh (sem barra do browser no mobile)
- Inputs font-size: 16px (sem zoom automático iOS)
- Modais como bottom sheet no mobile
- Scroll com momentum (-webkit-overflow-scrolling: touch)
- Touch targets mínimo 44px (Apple HIG)
- Breakpoints: 380px / 640px / 1024px / 1440px
- Dark mode do sistema operacional
- Modo impressão limpo

---

## 🤖 INSTRUÇÕES PARA CLAUDE CODE

### Setup completo

```bash
# 1. Clonar
git clone https://github.com/nupieepro/Nupieepro-sistema
cd Nupieepro-sistema

# 2. Criar pastas se não existirem
mkdir -p css js supabase/migrations

# 3. Copiar CSS novos (não sobrescrever styles.css!)
cp patch.css css/
cp themes-override.css css/
cp mobile.css css/
cp animations.css css/
cp premium.css css/

# 4. Copiar JS (abj.js substitui, resto é novo)
cp abj.js js/
cp pages.js js/
cp relatorio.js js/
cp push.js js/
cp premium.js js/

# 5. Copiar seed
cp seed.sql supabase/migrations/

# 6. Aplicar patch cirúrgico no dashboard.html
# (ver seção PATCH acima — 2 edições)

# 7. Commit
git add .
git commit -m "feat: visual premium v9 — glassmorphism, partículas, cursor 3D, schema real"
git push origin main
```

### Tarefas pendentes para Claude Code

#### TAREFA 1 — Rodar seed.sql no Supabase
```
Supabase → SQL Editor → New query → colar seed.sql → Run this query
Resultado esperado:
  coordenadorias_inseridas = 6
  atividades_abj_inseridas = 18
  status = "Seed v3 concluído!"
```

#### TAREFA 2 — Atualizar coordenadoria dos usuários existentes
```sql
-- Rodar APÓS o seed.sql
-- Substituir os emails reais antes de executar

UPDATE users
SET coordenadoria_id = (SELECT id FROM coordenadorias WHERE sigla = 'MKT')
WHERE email = 'EMAIL_DO_JR_AQUI';

UPDATE users
SET coordenadoria_id = (SELECT id FROM coordenadorias WHERE sigla = 'GP')
WHERE email = 'EMAIL_DA_LILIAN_AQUI';

-- Confirmar:
SELECT u.nome, u.email, u.role, c.nome AS coordenadoria
FROM users u
LEFT JOIN coordenadorias c ON c.id = u.coordenadoria_id;
```

#### TAREFA 3 — Criar bucket de Storage
```
Supabase → Storage → New bucket
Nome: evidencias
Public: OFF
File size limit: 10 MB
Save
```

#### TAREFA 4 — Gerar VAPID keys para push
```bash
npm install -g web-push
web-push generate-vapid-keys
# Copiar a chave PÚBLICA e substituir em js/push.js:
# const VAPID_PUBLIC_KEY = 'COLE_A_CHAVE_PUBLICA_AQUI';
# Salvar chave PRIVADA em Supabase → Settings → Edge Functions → Secrets
# Nome do secret: VAPID_PRIVATE_KEY
```

#### TAREFA 5 — Testar localmente
```bash
python3 -m http.server 8080
# Abrir: http://localhost:8080/dashboard.html
```

Checklist de teste:
- [ ] Partículas visíveis no fundo
- [ ] Cursor personalizado funciona (desktop)
- [ ] Cards com 3D tilt no hover (desktop)
- [ ] Sidebar com glassmorphism
- [ ] Animações de entrada nas páginas
- [ ] Logo com glow laranja pulsante
- [ ] Modal abre como bottom sheet no mobile
- [ ] Toasts aparecem acima do nav mobile
- [ ] Login redireciona pro dashboard corretamente
- [ ] ABJ carrega as 18 atividades do banco

---

## 🚀 INSTRUÇÕES PARA ANTIGRAVITY

### Passo 1 — Importar e contexto inicial

1. Antigravity → "Open from GitHub"
2. Colar: `https://github.com/nupieepro/Nupieepro-sistema`
3. Na primeira mensagem colar exatamente:

```
Leia o CLAUDE.md na raiz do repositório antes de qualquer coisa.

Resumo crítico:
- PWA estático (HTML/CSS/JS puro) no GitHub Pages. SEM React. SEM Vue.
- Backend: Supabase (credenciais no CLAUDE.md)
- NÃO substituir: dashboard.html, sw.js, manifest.json, styles.css, auth.js, app.js
- Fazer PATCH CIRÚRGICO no dashboard.html — 2 edições descritas no CLAUDE.md
- Tabela de usuários = "users" (não "profiles")
- Status das demandas = campo "coluna" (não "status")
- Progresso ABJ = tabela "progresso_abj" (não "abj_atividades_registros")
- Convites expiram em 7 dias (não 1 hora)
- RLS já configurado com funções: is_admin(), is_coord_or_admin(), get_my_coord()
```

### Sessões para o Antigravity

#### SESSÃO 1 — Seed e dados iniciais
```
1. Verificar: SELECT * FROM coordenadorias; (deve ter 6 ou 0)
2. Se vazio, rodar supabase/migrations/seed.sql completo
3. Atualizar coordenadoria dos 2 usuários existentes (JR = MKT, Lilian = GP)
4. Confirmar: SELECT COUNT(*) FROM atividades_abj; (deve ser 18)
5. Criar bucket "evidencias" no Storage se não existir
```

#### SESSÃO 2 — Patch cirúrgico no dashboard.html
```
Aplicar as 2 edições descritas no CLAUDE.md.
NUNCA remover linhas existentes — apenas inserir as novas.
Verificar que a ordem dos scripts está: app.js → abj.js → pages.js → relatorio.js → push.js → premium.js → auth.js
```

#### SESSÃO 3 — VAPID keys e push
```
1. Gerar VAPID keys: npm install -g web-push && web-push generate-vapid-keys
2. Substituir placeholder em js/push.js com chave pública
3. Salvar chave privada em Supabase Edge Functions Secrets (VAPID_PRIVATE_KEY)
4. Criar Edge Function "send-push" que envia push para user_id usando push_subscriptions
5. Commit: "feat: VAPID real + push configurado"
```

#### SESSÃO 4 — EmailJS templates
```
Criar no dashboard EmailJS (service_85bjukt):

1. template_convite:
   Assunto: "Você foi convidado para o NUPIEEPRO Sistema"
   Body: "Olá! Acesse o link para criar sua conta: {{link}}
   O convite expira em 7 dias."

2. template_prazo_abj:
   Assunto: "⏰ Prazo ABJ se aproximando!"
   Body: "A atividade {{atividade}} vence em {{dias}} dias ({{data}})."

3. template_aniversario:
   Assunto: "🎂 Aniversário de {{nome}} hoje!"
   Body: "Hoje é aniversário de {{nome}}! Não esqueça de parabenizar."
```

#### SESSÃO 5 — Revisão final
```
1. grep -r "profiles" js/ → deve retornar zero resultados
2. grep -r "\.status" js/ → checar se algum é de demandas (deve ser .coluna)
3. grep -r "abj_atividades" js/ → deve retornar zero resultados
4. grep -r "alert\|confirm\|prompt" js/ → deve retornar zero resultados
5. Verificar que premium.js está ANTES de auth.js no dashboard.html
6. Commit: "fix: revisão final v9"
```

#### SESSÃO 6 — Deploy e PWA checklist
```
1. GitHub Pages ativo em Settings → Pages → Branch: main
2. Testar URL: https://nupieepro.github.io/Nupieepro-sistema/
3. Testar instalação PWA no Chrome mobile
4. Verificar manifest.json tem start_url e icons corretos
5. Confirmar sw.js está na raiz (não em /js/)
```

### Diferença Claude Code vs Antigravity

| Tarefa | Onde fazer |
|--------|-----------|
| Git clone + copiar arquivos + push | **Claude Code** |
| Rodar SQL no Supabase | **Antigravity** ou painel Supabase |
| Criar Edge Functions | **Antigravity** |
| Gerar VAPID keys (npm) | **Claude Code** |
| Criar templates EmailJS | **Antigravity** + dashboard EmailJS |
| Testar localmente (servidor) | **Claude Code** |
| Buscar bugs no código | **Ambos** |

---

## ⚠️ Regras Absolutas — Nunca Quebrar

1. **SEM frameworks** — sem React, Vue, Angular, nunca
2. **NÃO modificar** `styles.css`, `auth.js`, `sw.js`, `manifest.json`, `app.js`
3. **NÃO substituir** `dashboard.html` — PATCH CIRÚRGICO apenas
4. Tabela **`users`** — não `profiles`
5. Campo **`demandas.coluna`** — não `demandas.status`
6. Tabela **`progresso_abj`** — não `abj_atividades_registros`
7. Convites expiram em **7 dias** — não 1 hora
8. Comentários sempre em **PT-BR**
9. `premium.js` **antes** de `auth.js` nos scripts
10. Não usar **`alert()`** ou **`confirm()`** — usar `abrirModal()` / `mostrarToast()`
11. RLS já configurado — usar funções `is_admin()` etc nas queries
12. `push_subscriptions` criada pelo seed.sql com RLS automático

---

## 🏗️ Arquitetura Técnica

```
GitHub Pages (estático)
      │
      ├── HTML/CSS/JS puro (sem build)
      ├── sw.js (cache + push)
      └── manifest.json (PWA)
            │
            └── Supabase
                  ├── Auth (magic link + email/senha)
                  ├── Database (PostgreSQL + RLS)
                  ├── Storage (bucket: evidencias)
                  └── Edge Functions (send-push)
                        │
                        └── EmailJS (notificações email)
```

*Última atualização: 27/04/2026 — JR*
