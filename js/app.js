/* ============================================================
   NUPIEEPRO — Supabase Client + App Helpers
   Alinhado com a plataforma real (dark theme, 6 coords, ABJ)
   ============================================================ */

// Chave pública (anon/publishable) — segura para frontend.
// Segurança real = RLS policies no banco (schema.sql).
// NUNCA coloque a service_role key aqui.
const SUPABASE_URL  = 'https://quwpyrdxyibcbyzwfilb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_VmEMT07DiE1f5DtxzgZomA_-F0gZIpM';

const _sb = (SUPABASE_URL !== 'COLE_SUA_URL_AQUI')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

/* ============================================================
   Constants — NUPIEEPRO structure
   ============================================================ */
const META_ABJ = 882;

const COORDENADORIAS = [
  { sigla: 'GER', nome: 'Geral',      icon: '⬡', cor: '--orange' }, // Triângulo/Pirâmide topo
  { sigla: 'OPS', nome: 'Operações',   icon: '⚙', cor: '--blue' }, // Engrenagem/Operacional
  { sigla: 'GP',  nome: 'G. Pessoas',  icon: '◒', cor: '--yellow' }, // Esfera/Integração
  { sigla: 'MKT', nome: 'Marketing',   icon: '◬', cor: '--red' }, // Prisma
  { sigla: 'PRJ', nome: 'Projetos',    icon: '◫', cor: '--orange' }, // Estrutura em barras
  { sigla: 'FIN', nome: 'Finanças',    icon: '◎', cor: '--green' }, // Moeda dupla
];

// Pages each coord can access
const ROLE_PAGES = {
  'Geral':      [
    { id: 'dashboard', icon: '⬡', label: 'Painel Central' },
    { id: 'abj',       icon: '⭐️', label: 'Selo ABJ', badge: '!' },
    { id: 'tarefas',   icon: '☰', label: 'Todas Demandas' },
    { id: 'manu',      icon: '🗂', label: 'Repositório Central' },
  ],
  'Operações':  [
    { id: 'operacoes', icon: '⚙', label: 'Operações Hub' },
    { id: 'tarefas',   icon: '☰', label: 'Processos' },
  ],
  'G. Pessoas': [
    { id: 'pessoas',   icon: '◒', label: 'Membros e G.P' },
    { id: 'tarefas',   icon: '☰', label: 'Tarefas G.P' },
  ],
  'Marketing':  [
    { id: 'marketing', icon: '◬', label: 'Agência MKT' },
    { id: 'tarefas',   icon: '☰', label: 'Demandas MKT' },
  ],
  'Projetos':   [
    { id: 'projetos',  icon: '◫', label: 'Ações Projetos' },
    { id: 'tarefas',   icon: '☰', label: 'Tarefas PRJ' },
  ],
  'Finanças':   [
    { id: 'financeiro', icon: '◎', label: 'Teses Financeiras' },
    { id: 'tarefas',   icon: '☰', label: 'Tarefas FIN' },
  ],
};

const COORD_TAG_CLASS = {
  'Geral': 'tag-geral',
  'Operações': 'tag-operacoes',
  'G. Pessoas': 'tag-pessoas',
  'Marketing': 'tag-marketing',
  'Projetos': 'tag-projetos',
  'Finanças': 'tag-financas',
};

/* ============================================================
   Toast notifications
   ============================================================ */
const App = {
  toast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  loading(show) {
    let overlay = document.getElementById('loading-overlay');
    if (show && !overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="spinner" style="width:48px;height:48px;border-width:3px;"></div>';
      document.body.appendChild(overlay);
    } else if (!show && overlay) {
      overlay.remove();
    }
  },

  currency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  },

  date(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  },

  redirect(url) { window.location.href = url; },
  param(name) { return new URLSearchParams(window.location.search).get(name); },

  /** Require auth — redirect to login if not authenticated */
  async requireAuth() {
    if (!_sb) {
      const mock = localStorage.getItem('mockSession');
      if (mock === 'jjoserrayan2711@gmail.com') return { user: { email: mock } };
      App.redirect('index.html'); return null;
    }
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) { App.redirect('index.html'); return null; }
    return session;
  },

  /** Get current user profile from public.users */
  async getProfile() {
    if (!_sb) {
      const mock = localStorage.getItem('mockSession');
      if (mock === 'jjoserrayan2711@gmail.com') {
        return {
          id: 'dev-chefe',
          email: mock,
          nome: 'Desenvolvedor / Assessor',
          role: 'admin',
          cargo: 'Dev Chefe & Assessor de Marketing',
          iniciais: 'RV',
          coordenadorias: { nome: 'Marketing', sigla: 'MKT', icone: '◬' }
        };
      }
      return null;
    }
    const { data: { user } } = await _sb.auth.getUser();
    if (!user) return null;
    const { data } = await _sb
      .from('users')
      .select('*, coordenadorias(nome, sigla, icone)')
      .eq('id', user.id)
      .single();

    // Fallback: se não há linha em public.users, usa metadados do auth
    if (!data) {
      const meta = user.user_metadata || {};
      const emailName = user.email?.split('@')[0] || 'usuario';
      return {
        id: user.id,
        email: user.email,
        nome: meta.nome || emailName,
        role: meta.role || 'membro',
        cargo: meta.cargo || 'Membro',
        iniciais: meta.iniciais || emailName.slice(0, 2).toUpperCase(),
        coordenadorias: { nome: 'Geral', sigla: 'GER', icone: '⬡' }
      };
    }
    return data;
  },

  /** Get all coordenadorias */
  async getCoordenadorias() {
    if (!_sb) return COORDENADORIAS;
    const { data } = await _sb.from('coordenadorias').select('*').order('nome');
    return data || [];
  },

  /** Build sidebar based on user coord */
  buildSidebar(coordName) {
    const nav = document.getElementById('sideNav');
    if (!nav) return;

    const myPages = profile?.role === 'admin' 
      ? Object.values(ROLE_PAGES).flat().filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)
      : ROLE_PAGES[coordName] || [];
    let html = '<div class="sidebar-section">Meu painel</div>';

    myPages.forEach(p => {
      const badge = p.badge
        ? `<span class="nav-badge">${p.badge}</span>`
        : p.badgeId
          ? `<span class="nav-badge" id="${p.badgeId}">0</span>`
          : '';
      html += `<div class="nav-item" id="nav-${p.id}" onclick="goTo('${p.id}')">
        <span class="nav-icon">${p.icon}</span>
        <span class="nav-label">${p.label}</span>${badge}
      </div>`;
    });

    // Quick action
    html += '<div class="sidebar-section">Ação Rápida</div>';
    html += `<div class="nav-item" style="background:var(--orange-dim);border-color:var(--orange-border);color:var(--orange)" onclick="App.toast('ABJ modal — FASE 2','info')">
      <span class="nav-icon">➕</span>
      <span class="nav-label" style="color:var(--orange)">Inserir Atividade ABJ</span>
    </div>`;

    // Shared
    html += '<div class="sidebar-section">Colaborativo</div>';
    html += `<div class="nav-item nav-shared" id="nav-compartilhado" onclick="goTo('compartilhado')">
      <span class="nav-icon">🤝</span>
      <span class="nav-label">Compartilhado</span>
    </div>`;

    nav.innerHTML = html;
  },

  /** Build mobile bottom nav */
  buildMobileNav(coordName) {
    const mobileNav = document.getElementById('mobileNav');
    if (!mobileNav) return;

    const myPages = (ROLE_PAGES[coordName] || []).slice(0, 5);
    mobileNav.innerHTML = myPages.map(p =>
      `<div class="mnav-item" onclick="goTo('${p.id}')">
        <span class="mnav-icon">${p.icon}</span>
        <span>${p.label}</span>
      </div>`
    ).join('');
  },

  /** Toggle sidebar on mobile */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('visible');
  },

  /** Init full dashboard (auth + sidebar + profile) */
  async initDashboard() {
    Theme.init();

    const session = await App.requireAuth();
    if (!session) return null;

    // CRITICAL: torna o shell visível após autenticação confirmada
    const shell = document.getElementById('appShell');
    if (shell) shell.classList.add('visible');

    const profile = await App.getProfile();
    if (!profile) {
      App.toast('Perfil não encontrado. Faça logout e tente novamente.', 'error');
      return null;
    }

    const coordName = profile.coordenadorias?.nome || 'Geral';

    // Set user chip
    document.getElementById('sideAvatar').textContent = profile.iniciais || profile.nome?.[0] || '?';
    document.getElementById('sideName').textContent   = profile.nome || 'Usuário';
    document.getElementById('sideRole').textContent   = (profile.cargo || profile.role) + ' · ' + coordName;

    if (profile.role === 'admin') {
      // Show role switcher for admin/dev
      const switcher = document.getElementById('roleSwitcher');
      if (switcher) switcher.classList.remove('d-none');
      // Build sidebar with dev pages (default: GER view)
      _buildNav('ger');
    } else {
      // Regular user: build sidebar based on their coord
      const pages = ROLE_PAGES[coordName] || [];
      const nav = document.getElementById('sideNav');
      if (nav) {
        let html = `<div class="sidebar-section">${coordName}</div>`;
        pages.forEach(p => {
          const badge = p.badge ? `<span class="nav-badge">${p.badge}</span>` : '';
          html += `<div class="nav-item" id="nav-${p.id}" onclick="goTo('${p.id}')">
            <span class="nav-icon">${p.icon}</span>
            <span class="nav-label">${p.label}</span>${badge}
          </div>`;
        });
        html += '<div class="sidebar-section">Colaborativo</div>';
        html += `<div class="nav-item nav-shared" id="nav-compartilhado" onclick="goTo('compartilhado')">
          <span class="nav-icon">📅</span><span class="nav-label">Calendário Universal</span>
        </div>`;
        html += '<div class="sidebar-section">Sistema</div>';
        html += `<div class="nav-item" onclick="goTo('configuracoes')">
          <span class="nav-icon">⚙</span><span class="nav-label">Configurações</span>
        </div>`;
        nav.innerHTML = html;
      }
    }

    App.buildMobileNav(coordName);

    // Init calendários
    Cal.init();
    MiniCal.init();

    // Init notification count
    updateNotifCount();
    await App.loadNotifCount();

    return profile;
  },

  async loadNotifCount() {
    if (!_sb) return;
    const { data: { user } } = await _sb.auth.getUser();
    if (!user) return;
    const { count } = await _sb
      .from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lida', false);

    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = count || 0;
      badge.classList.toggle('visible', count > 0);
    }
  }
};

/* ============================================================
   Navigation
   ============================================================ */
const ALL_PAGES = [
  'dashboard','abj','tarefas','pessoas','projetos',
  'operacoes','marketing','financeiro','compartilhado',
  'manu','notificacoes','configuracoes'
];

function goTo(id) {
  ALL_PAGES.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.remove('active');
  });
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');

  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');

  // Close mobile sidebar + overlay
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

function toggleSidebar() {
  App.toggleSidebar();
}

/* ============================================================
   Dashboard renderer
   ============================================================ */
const Dashboard = {
  async render(profile) {
    if (!_sb) {
      // Demo mode — show placeholder data
      Dashboard.renderDemo(profile);
      return;
    }

    try {
      // Fetch KPIs in parallel
      const [abjRes, tasksRes, membersRes, vendasRes, despesasRes] = await Promise.all([
        _sb.from('progresso_abj').select('pontos'),
        _sb.from('demandas').select('coluna').neq('coluna', 'auditada'),
        _sb.from('users').select('id', { count: 'exact', head: true }).eq('ativo', true),
        _sb.from('vendas').select('valor'),
        _sb.from('despesas').select('valor'),
      ]);

      const totalPts = (abjRes.data || []).reduce((s, r) => s + (r.pontos || 0), 0);
      const activeTasks = (tasksRes.data || []).length;
      const totalMembers = membersRes.count || 0;
      const totalVendas = (vendasRes.data || []).reduce((s, r) => s + parseFloat(r.valor || 0), 0);
      const totalDespesas = (despesasRes.data || []).reduce((s, r) => s + parseFloat(r.valor || 0), 0);
      const saldo = totalVendas - totalDespesas;

      Dashboard.setKPIs(totalPts, activeTasks, totalMembers, saldo, totalVendas, totalDespesas);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      Dashboard.renderDemo(profile);
    }
  },

  renderDemo(profile) {
    // Show demo data when Supabase is not configured
    Dashboard.setKPIs(47, 10, 16, 1500, 2260, 760);
    document.getElementById('dashRecent').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--w5);border-radius:8px;font-size:13px;">
          <span class="coord-tag tag-operacoes">OPS</span>
          <span>Relatório mensal março enviado</span>
          <span style="margin-left:auto;color:var(--w40);font-size:11px;">Hoje</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--w5);border-radius:8px;font-size:13px;">
          <span class="coord-tag tag-geral">GER</span>
          <span>Confirmação mensal ABJ — atividades 1-4</span>
          <span style="margin-left:auto;color:var(--w40);font-size:11px;">Ontem</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--w5);border-radius:8px;font-size:13px;">
          <span class="coord-tag tag-projetos">PRJ</span>
          <span>Treinamento Excel Avançado realizado</span>
          <span style="margin-left:auto;color:var(--w40);font-size:11px;">3 dias</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--w5);border-radius:8px;font-size:13px;">
          <span class="coord-tag tag-marketing">MKT</span>
          <span>3 posts publicados em março</span>
          <span style="margin-left:auto;color:var(--w40);font-size:11px;">5 dias</span>
        </div>
      </div>
    `;
  },

  setKPIs(pts, tasks, members, saldo, vendas, despesas) {
    const pct = Math.round((pts / META_ABJ) * 100);

    const el = (id) => document.getElementById(id);
    if (!el('dashPts')) return; // guard for missing page
    el('dashPts').textContent = pts;
    el('dashPtsBar').style.width = Math.min(pct, 100) + '%';
    el('dashAbjBar').style.width = Math.min(pct, 100) + '%';
    el('dashAbjPct').textContent = pct + '%';
    el('dashTasks').textContent = tasks;
    el('dashTasksSub').textContent = tasks + ' em andamento';
    el('dashMembers').textContent = members;
    el('dashSaldo').textContent = App.currency(saldo);
    el('dashSaldoSub').textContent = `↑ ${App.currency(vendas)} · ↓ ${App.currency(despesas)}`;

    el('quickBtns').innerHTML = `
      <button class="btn btn-primary" onclick="goTo('abj')">⭐ Selo ABJ</button>
      <button class="btn btn-ghost" onclick="goTo('tarefas')">☰ Demandas</button>
      <button class="btn btn-ghost" onclick="goTo('compartilhado')">📅 Calendário</button>
      <button class="btn btn-ghost" onclick="goTo('financeiro')">◎ Financeiro</button>
    `;
  }
};

/* ============================================================
   Theme & Font System
   ============================================================ */
const Theme = {
  apply(name) {
    document.documentElement.setAttribute('data-theme', name === 'default' ? '' : name);
    localStorage.setItem('nupie_theme', name);
    // Update active button
    document.querySelectorAll('[id^="themeBtn-"]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('themeBtn-' + name);
    if (btn) btn.classList.add('active');
  },

  applyFont(name) {
    document.documentElement.setAttribute('data-font', name === 'default' ? '' : name);
    localStorage.setItem('nupie_font', name);
    document.querySelectorAll('[id^="fontBtn-"]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('fontBtn-' + name);
    if (btn) btn.classList.add('active');
  },

  init() {
    const theme = localStorage.getItem('nupie_theme') || 'default';
    const font  = localStorage.getItem('nupie_font')  || 'default';
    Theme.apply(theme);
    Theme.applyFont(font);
  }
};

/* ============================================================
   Calendar
   ============================================================ */
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Mock events — keyed as "YYYY-M-D"
const CAL_EVENTS = {
  '2026-4-6':  [{ label:'Reunião Geral', tag:'⬡', color:'var(--orange)' }],
  '2026-4-18': [{ label:'Data Hoje', tag:'⬡', color:'var(--green)' }],
  '2026-4-25': [{ label:'Prazo Relatório OPS', tag:'⚙', color:'var(--blue)' }],
  '2026-5-1':  [{ label:'Feriado Nacional', tag:'', color:'var(--red)' }],
  '2026-6-15': [{ label:'Evento Estadual', tag:'◫', color:'var(--purple)' }],
  '2026-7-31': [{ label:'Prazo ABJ #10', tag:'⭐', color:'var(--yellow)' }],
};

const Cal = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-indexed

  init() {
    // Populate year select (2024 – 2030)
    const sel = document.getElementById('calYearSelect');
    if (!sel) return;
    for (let y = 2024; y <= 2030; y++) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      if (y === Cal.year) opt.selected = true;
      sel.appendChild(opt);
    }
    Cal.render();
  },

  prev() {
    Cal.month--;
    if (Cal.month < 0) { Cal.month = 11; Cal.year--; }
    Cal.render();
  },

  next() {
    Cal.month++;
    if (Cal.month > 11) { Cal.month = 0; Cal.year++; }
    Cal.render();
  },

  goYear(y) {
    Cal.year = parseInt(y);
    Cal.render();
  },

  render() {
    const grid = document.getElementById('calGrid');
    if (!grid) return;

    // Update label
    document.getElementById('calMonthLabel').textContent = MONTHS_PT[Cal.month] + ' ' + Cal.year;
    const sel = document.getElementById('calYearSelect');
    if (sel) sel.value = Cal.year;

    // Clear days (keep the 7 day-name headers)
    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    const today = new Date();
    const firstDay = new Date(Cal.year, Cal.month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(Cal.year, Cal.month + 1, 0).getDate();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      grid.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      const isToday = (d === today.getDate() && Cal.month === today.getMonth() && Cal.year === today.getFullYear());
      if (isToday) cell.classList.add('today');

      cell.innerHTML = `<span>${d}</span>`;

      const key = `${Cal.year}-${Cal.month + 1}-${d}`;
      if (CAL_EVENTS[key]) {
        CAL_EVENTS[key].forEach(ev => {
          const tag = document.createElement('span');
          tag.className = 'cal-event-tag';
          tag.style.background = ev.color + '22';
          tag.style.color = ev.color;
          tag.textContent = (ev.tag ? ev.tag + ' ' : '') + ev.label;
          cell.appendChild(tag);
        });
      }
      grid.appendChild(cell);
    }

    // Upcoming events list
    Cal.renderUpcoming();
  },

  renderUpcoming() {
    const list = document.getElementById('calEventsList');
    if (!list) return;
    const now = new Date();
    const upcoming = Object.entries(CAL_EVENTS)
      .map(([key, evts]) => {
        const [y, m, d] = key.split('-').map(Number);
        return { date: new Date(y, m - 1, d), evts, key };
      })
      .filter(e => e.date >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);

    if (upcoming.length === 0) {
      list.innerHTML = '<p class="text-muted text-sm">Nenhum evento próximo.</p>';
      return;
    }

    list.innerHTML = upcoming.map(({ date, evts }) => {
      const label = evts[0].label;
      const color = evts[0].color;
      const tag   = evts[0].tag;
      const dateStr = date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--w5);border-radius:10px;border:1px solid var(--border);">
          <div style="width:40px;height:40px;border-radius:8px;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${tag || '📅'}</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;">${label}</div>
            <div style="font-size:11px;color:var(--w40);margin-top:2px;">${dateStr}</div>
          </div>
        </div>`;
    }).join('');
  }
};

/* ============================================================
   Mini Calendar (widget no dashboard)
   ============================================================ */
const MiniCal = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),

  init() {
    const grid = document.getElementById('miniCalGrid');
    if (!grid) return;
    MiniCal.render();
  },

  prev() { MiniCal.month--; if (MiniCal.month < 0) { MiniCal.month = 11; MiniCal.year--; } MiniCal.render(); },
  next() { MiniCal.month++; if (MiniCal.month > 11) { MiniCal.month = 0; MiniCal.year++; } MiniCal.render(); },

  render() {
    const grid = document.getElementById('miniCalGrid');
    if (!grid) return;

    const label = document.getElementById('miniCalLabel');
    if (label) label.textContent = MONTHS_PT[MiniCal.month] + ' ' + MiniCal.year;

    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    const today = new Date();
    const firstDay = new Date(MiniCal.year, MiniCal.month, 1).getDay();
    const daysInMonth = new Date(MiniCal.year, MiniCal.month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const e = document.createElement('div'); e.className = 'mini-cal-day empty'; grid.appendChild(e);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'mini-cal-day';
      const isToday = d === today.getDate() && MiniCal.month === today.getMonth() && MiniCal.year === today.getFullYear();
      if (isToday) cell.classList.add('today');
      const key = `${MiniCal.year}-${MiniCal.month + 1}-${d}`;
      if (CAL_EVENTS[key]) cell.classList.add('has-event');
      cell.textContent = d;
      cell.onclick = () => goTo('compartilhado');
      grid.appendChild(cell);
    }

    // Eventos próximos compactos
    const evtsEl = document.getElementById('miniCalEvents');
    if (!evtsEl) return;
    const now = new Date();
    const upcoming = Object.entries(CAL_EVENTS)
      .map(([key, evts]) => { const [y,m,d] = key.split('-').map(Number); return { date: new Date(y,m-1,d), evts }; })
      .filter(e => e.date >= now)
      .sort((a,b) => a.date - b.date)
      .slice(0, 3);

    evtsEl.innerHTML = upcoming.map(({ date, evts }) => {
      const ev = evts[0];
      const ds = date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
      return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;background:var(--w5);border-radius:8px;border:1px solid var(--b-1);">
        <span style="color:${ev.color};font-size:13px;">${ev.tag || '📅'}</span>
        <span style="flex:1;font-weight:500;">${ev.label}</span>
        <span style="color:var(--t-3);white-space:nowrap;">${ds}</span>
      </div>`;
    }).join('') || '<p class="text-muted text-sm">Sem eventos próximos.</p>';
  }
};

/* ============================================================
   Notification helpers
   ============================================================ */
function updateNotifCount() {
  const unread = document.querySelectorAll('.notif-item.unread').length;
  const badge = document.getElementById('notifBadge');
  const count = document.getElementById('notifCount');
  if (badge) {
    badge.textContent = unread;
    badge.classList.toggle('visible', unread > 0);
  }
  if (count) count.textContent = unread + ' não lida' + (unread !== 1 ? 's' : '');
}

function markAllNotifRead() {
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  document.querySelectorAll('.notif-dot').forEach(d => d.classList.add('read'));
  updateNotifCount();
  App.toast('Todas notificações marcadas como lidas', 'success');
}

/* ============================================================
   Role Switcher (Dev: GER ↔ MKT)
   ============================================================ */
const DEV_PAGES = {
  ger: [
    { id: 'dashboard',     icon: '⬡', label: 'Painel Central' },
    { id: 'abj',           icon: '⭐', label: 'Selo ABJ', badge: '!' },
    { id: 'tarefas',       icon: '☰', label: 'Todas Demandas' },
    { id: 'manu',          icon: '🗂', label: 'Repositório' },
    { id: 'pessoas',       icon: '◒', label: 'Membros' },
    { id: 'financeiro',    icon: '◎', label: 'Financeiro' },
    { id: 'operacoes',     icon: '⚙', label: 'Operações' },
    { id: 'projetos',      icon: '◫', label: 'Projetos' },
  ],
  mkt: [
    { id: 'marketing',     icon: '◬', label: 'Agência MKT' },
    { id: 'tarefas',       icon: '☰', label: 'Demandas MKT' },
    { id: 'manu',          icon: '🗂', label: 'Repositório' },
  ]
};

let _currentRole = 'ger';

function switchRole(role) {
  _currentRole = role;
  // Update tab UI
  ['ger','mkt'].forEach(r => {
    const tab = document.getElementById('roleTab' + r.charAt(0).toUpperCase() + r.slice(1));
    if (tab) tab.classList.toggle('active', r === role);
  });
  // Rebuild nav
  _buildNav(role);
}

function _buildNav(role) {
  const nav = document.getElementById('sideNav');
  if (!nav) return;

  const pages = DEV_PAGES[role] || [];
  let html = `<div class="sidebar-section">${role === 'ger' ? '⬡ Coord. Geral' : '◬ Marketing'}</div>`;

  pages.forEach(p => {
    const badge = p.badge ? `<span class="nav-badge">${p.badge}</span>` : '';
    html += `<div class="nav-item" id="nav-${p.id}" onclick="goTo('${p.id}')">
      <span class="nav-icon">${p.icon}</span>
      <span class="nav-label">${p.label}</span>${badge}
    </div>`;
  });

  html += '<div class="sidebar-section">Colaborativo</div>';
  html += `<div class="nav-item nav-shared" id="nav-compartilhado" onclick="goTo('compartilhado')">
    <span class="nav-icon">📅</span><span class="nav-label">Calendário Universal</span>
  </div>`;

  html += '<div class="sidebar-section">Sistema</div>';
  html += `<div class="nav-item" onclick="goTo('configuracoes')">
    <span class="nav-icon">⚙</span><span class="nav-label">Configurações</span>
  </div>`;
  html += `<a href="../Lojinha-Nupieepro/admin.html" target="_blank" class="nav-item">
    <span class="nav-icon">🛒</span><span class="nav-label">Admin Lojinha</span>
  </a>`;

  nav.innerHTML = html;
}
