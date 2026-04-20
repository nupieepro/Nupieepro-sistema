/* ============================================================
   NUPIEEPRO — Supabase Client + App Helpers
   Alinhado com a plataforma real (dark theme, 6 coords, ABJ)
   ============================================================ */

// Chave anon (publishable) é segura para frontend — segurança real = RLS no Supabase.
// config.js pode sobrescrever via window.NUPI_URL / window.NUPI_KEY se disponível.
const _SURL = window.NUPI_URL || 'https://quwpyrdxyibcbyzwfilb.supabase.co';
const _SKEY = window.NUPI_KEY || 'sb_publishable_VmEMT07DiE1f5DtxzgZomA_-F0gZIpM';

const _sb = supabase.createClient(_SURL, _SKEY);
window._supabase = _sb;

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
          nome: 'JR',
          role: 'admin',
          cargo: 'Dev Chefe',
          iniciais: 'JR',
          coordenadorias: { nome: 'Geral', sigla: 'GER', icone: '⬡' }
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
    // _appProfile é variável global acessada pelo ABJ e outros módulos
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
    // Expõe globalmente para módulos como ABJ
    window._appProfile = profile;

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

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');

  // Lazy-load de páginas com dados
  if (id === 'pessoas') Pessoas.loadMembers();
  if (id === 'tarefas') Kanban.load();
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

// Feriados nacionais BR calculados dinamicamente
function _brHolidays(year) {
  // Páscoa (algoritmo de Meeus/Jones/Butcher)
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4;
  const l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31); // 1-indexed
  const day   = ((h+l-7*m+114) % 31) + 1;
  const easter = new Date(year, month-1, day);
  const key = (d) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  const add = (d, days) => new Date(d.getTime() + days*864e5);

  const h2 = {};
  const set = (dt, label, color='var(--red)') => {
    const k = key(dt);
    if (!h2[k]) h2[k] = [];
    h2[k].push({ label, tag:'🇧🇷', color });
  };
  set(new Date(year,0,1),  'Ano Novo');
  set(add(easter,-47),     'Carnaval');
  set(add(easter,-48),     'Carnaval');
  set(add(easter,-2),      'Sexta-feira Santa');
  set(new Date(year,3,21), 'Tiradentes', 'var(--yellow)');
  set(new Date(year,4,1),  'Dia do Trabalho');
  set(add(easter,60),      'Corpus Christi', 'var(--yellow)');
  set(new Date(year,8,7),  'Independência do Brasil', 'var(--green)');
  set(new Date(year,9,12), 'Nossa Sra. Aparecida');
  set(new Date(year,10,2), 'Finados');
  set(new Date(year,10,15),'Proclamação da República');
  set(new Date(year,10,20),'Consciência Negra');
  set(new Date(year,11,25),'Natal', 'var(--yellow)');
  return h2;
}

// Eventos personalizados — carregados do Supabase ou localStorage
let CAL_EVENTS = { ..._brHolidays(new Date().getFullYear()) };

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
   Gestão de Membros
   ============================================================ */
const Pessoas = {
  _tab: 'membros',

  switchTab(tab, el) {
    this._tab = tab;
    document.querySelectorAll('#pessoasTabBar .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    ['membros','convidar','gerenciar'].forEach(t => {
      const el2 = document.getElementById('pessoasTab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (el2) el2.style.display = t === tab ? '' : 'none';
    });
    if (tab === 'membros' || tab === 'gerenciar') Pessoas.loadMembers();
  },

  async loadMembers() {
    const grid = document.getElementById('memberGrid');
    const mgrid = document.getElementById('manageGrid');
    const count = document.getElementById('memberCount');

    // Dados mock enquanto Supabase não retorna
    let members = [
      { iniciais:'RB', nome:'Rayan Bezerra', cargo:'Desenvolvedor Chefe', coord:'Geral', email:'jjoserrayan2711@gmail.com', role:'admin', cor:'orange' },
    ];

    if (_sb) {
      const { data } = await _sb.from('users')
        .select('*, coordenadorias(nome,sigla)')
        .eq('ativo', true)
        .order('nome');
      if (data && data.length) members = data.map(u => ({
        iniciais: u.iniciais || u.nome?.[0] || '?',
        nome: u.nome || u.email,
        cargo: u.cargo || u.role,
        coord: u.coordenadorias?.nome || 'Geral',
        email: u.email,
        role: u.role,
        id: u.id,
        cor: u.role === 'admin' ? 'orange' : 'blue'
      }));
    }

    if (count) count.textContent = members.length + ' membros';

    if (grid) grid.innerHTML = members.map(m => `
      <div style="background:var(--c-s2);padding:14px;border-radius:12px;border:1px solid ${m.cor==='orange'?'var(--orange-border)':'var(--border)'};display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;border-radius:50%;background:${m.cor==='orange'?'var(--orange-dim)':'var(--blue-dim)'};border:2px solid ${m.cor==='orange'?'var(--orange)':'var(--blue)'};color:${m.cor==='orange'?'var(--orange)':'var(--blue)'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">${m.iniciais}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;">${m.nome}</div>
          <div style="font-size:11px;color:var(--t-3);margin-top:2px;">${m.cargo} · ${m.coord}</div>
          <div style="font-size:10px;color:var(--t-4);margin-top:1px;">${m.email}</div>
        </div>
      </div>
    `).join('');

    if (mgrid) mgrid.innerHTML = members.map(m => `
      <div style="background:var(--c-s2);padding:12px 14px;border-radius:10px;border:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--w10);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${m.iniciais}</div>
        <div style="flex:1;min-width:120px;">
          <div style="font-weight:600;font-size:13px;">${m.nome}</div>
          <div style="font-size:11px;color:var(--t-3);">${m.coord}</div>
        </div>
        <select style="background:var(--w5);border:1px solid var(--b-1);border-radius:8px;padding:5px 10px;color:var(--t-2);font-size:12px;outline:none;" onchange="Pessoas.updateRole('${m.id||m.email}',this.value)">
          <option value="membro" ${m.role==='membro'?'selected':''}>Membro</option>
          <option value="coordenador" ${m.role==='coordenador'?'selected':''}>Coordenador</option>
          <option value="admin" ${m.role==='admin'?'selected':''}>Admin/Dev</option>
        </select>
      </div>
    `).join('');
  },

  async gerarConvite() {
    const email = document.getElementById('inviteEmail')?.value.trim();
    const cargo = document.getElementById('inviteCargo')?.value.trim();
    const coordSigla = document.getElementById('inviteCoord')?.value;
    const role = document.getElementById('inviteRole')?.value;
    const alertEl = document.getElementById('inviteAlert');

    if (!email || !coordSigla || !cargo) {
      if (alertEl) { alertEl.textContent = 'Preencha e-mail, cargo e coordenadoria.'; alertEl.className = 'alert-box error'; }
      return;
    }

    // Gerar token único
    const token = 'NUPI-' + Math.random().toString(36).slice(2,10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (_sb) {
      const { data: coordData } = await _sb.from('coordenadorias').select('id').eq('sigla', coordSigla).single();
      const { error } = await _sb.from('convites').insert({
        token, email, cargo, role,
        coordenadoria_id: coordData?.id,
        usado: false,
        expires_at: expires,
        created_by: window._appProfile?.id || null
      });
      if (error) {
        if (alertEl) { alertEl.textContent = 'Erro ao salvar convite: ' + error.message; alertEl.className = 'alert-box error'; }
        return;
      }
    }

    const link = `${window.location.origin}${window.location.pathname.replace('dashboard.html','')}convite.html?token=${token}`;
    const input = document.getElementById('inviteLinkInput');
    if (input) input.value = link;
    const card = document.getElementById('inviteLinkCard');
    if (card) card.style.display = '';
    if (alertEl) { alertEl.textContent = 'Convite criado com sucesso!'; alertEl.className = 'alert-box success'; }
    App.toast('Link de convite gerado!', 'success');
  },

  copiarLink() {
    const val = document.getElementById('inviteLinkInput')?.value;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => App.toast('Link copiado!', 'success')).catch(() => {
      document.getElementById('inviteLinkInput')?.select();
      document.execCommand('copy');
      App.toast('Link copiado!', 'success');
    });
  },

  async updateRole(identifier, newRole) {
    if (!_sb) { App.toast('Supabase necessário para alterar funções.', 'error'); return; }
    const q = identifier.includes('@')
      ? _sb.from('users').update({ role: newRole }).eq('email', identifier)
      : _sb.from('users').update({ role: newRole }).eq('id', identifier);
    const { error } = await q;
    if (error) { App.toast('Erro ao atualizar: ' + error.message, 'error'); return; }
    App.toast('Função atualizada com sucesso!', 'success');
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
// Páginas por visão do admin (simula o que cada coord vê)
const DEV_PAGES = {
  ger: [
    { id: 'dashboard',  icon: '⬡', label: 'Painel Central' },
    { id: 'abj',        icon: '⭐', label: 'Selo ABJ', badge: '!' },
    { id: 'tarefas',    icon: '☰', label: 'Todas Demandas' },
    { id: 'pessoas',    icon: '◒', label: 'Membros & Gestão' },
    { id: 'financeiro', icon: '◎', label: 'Financeiro' },
    { id: 'operacoes',  icon: '⚙', label: 'Operações' },
    { id: 'projetos',   icon: '◫', label: 'Projetos' },
    { id: 'manu',       icon: '🗂', label: 'Repositório' },
  ],
  ops: [
    { id: 'operacoes',  icon: '⚙', label: 'Operações Hub' },
    { id: 'tarefas',    icon: '☰', label: 'Processos OPS' },
    { id: 'manu',       icon: '🗂', label: 'Repositório' },
  ],
  gp: [
    { id: 'pessoas',    icon: '◒', label: 'Membros e G.P' },
    { id: 'tarefas',    icon: '☰', label: 'Tarefas G.P' },
  ],
  mkt: [
    { id: 'marketing',    icon: '◬', label: 'Agência MKT' },
    { id: 'tarefas',      icon: '☰', label: 'Demandas MKT' },
    { id: 'notificacoes', icon: '🔔', label: 'Notificações' },
    { id: 'manu',         icon: '🗂', label: 'Repositório' },
  ],
  prj: [
    { id: 'projetos',   icon: '◫', label: 'Ações Projetos' },
    { id: 'tarefas',    icon: '☰', label: 'Tarefas PRJ' },
  ],
  fin: [
    { id: 'financeiro', icon: '◎', label: 'Tesouraria' },
    { id: 'tarefas',    icon: '☰', label: 'Tarefas FIN' },
  ],
};

// Chip do usuário por role (JR em GER, RB em MKT, nome em outros)
const DEV_CHIP = {
  ger:  { iniciais: 'JR', nome: 'JR', cargo: 'Dev Chefe' },
  ops:  { iniciais: 'JR', nome: 'JR', cargo: 'Preview OPS' },
  gp:   { iniciais: 'JR', nome: 'JR', cargo: 'Preview G.P' },
  mkt:  { iniciais: 'RB', nome: 'RB', cargo: 'Assessor MKT' },
  prj:  { iniciais: 'JR', nome: 'JR', cargo: 'Preview PRJ' },
  fin:  { iniciais: 'JR', nome: 'JR', cargo: 'Preview FIN' },
};

let _currentRole = 'ger';

function switchRole(role) {
  _currentRole = role;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById('roleTab-' + role);
  if (activeTab) activeTab.classList.add('active');
  _buildNav(role);
  // Atualiza chip do usuário
  const chip = DEV_CHIP[role] || DEV_CHIP.ger;
  const av = document.getElementById('sideAvatar');
  const nm = document.getElementById('sideName');
  const rl = document.getElementById('sideRole');
  if (av) av.textContent = chip.iniciais;
  if (nm) nm.textContent = chip.nome;
  if (rl) rl.textContent = chip.cargo;
  // Navega para a primeira página da visão
  const firstPage = (DEV_PAGES[role] || DEV_PAGES.ger)[0];
  if (firstPage) goTo(firstPage.id);
}

const ROLE_LABELS = { ger:'⬡ Coord. Geral', ops:'⚙ Operações', gp:'◒ G. Pessoas', mkt:'◬ Assessor MKT', prj:'◫ Projetos', fin:'◎ Finanças' };

function _buildNav(role) {
  const nav = document.getElementById('sideNav');
  if (!nav) return;

  const pages = DEV_PAGES[role] || [];
  let html = `<div class="sidebar-section">${ROLE_LABELS[role] || role.toUpperCase()}</div>`;

  pages.forEach(p => {
    const badge = p.badge ? `<span class="nav-badge">${p.badge}</span>` : '';
    html += `<div class="nav-item" id="nav-${p.id}" onclick="goTo('${p.id}')">
      <span class="nav-icon">${p.icon}</span>
      <span class="nav-label">${p.label}</span>${badge}
    </div>`;
  });

  html += '<div class="sidebar-section">Colaborativo</div>';
  html += `<div class="nav-item nav-shared" id="nav-compartilhado" onclick="goTo('compartilhado')">
    <span class="nav-icon">📅</span><span class="nav-label">Calendário</span>
  </div>`;

  html += '<div class="sidebar-section">Sistema</div>';
  html += `<div class="nav-item" id="nav-notificacoes" onclick="goTo('notificacoes')">
    <span class="nav-icon">🔔</span><span class="nav-label">Notificações</span>
  </div>`;
  html += `<div class="nav-item" id="nav-configuracoes" onclick="goTo('configuracoes')">
    <span class="nav-icon">⚙</span><span class="nav-label">Configurações</span>
  </div>`;

  nav.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   KANBAN MODULE — Demandas por coordenadoria
   ═══════════════════════════════════════════════════════════════ */
const Kanban = (() => {
  const COLS = [
    { id: 'afazer',    label: 'A Fazer',       status: 'pendente' },
    { id: 'producao',  label: 'Em Produção',    status: 'em_producao' },
    { id: 'evidencia', label: 'Evidência',      status: 'evidencia' },
    { id: 'concluida', label: 'Concluídas',     status: 'concluida' },
  ];

  let _demands = [];
  let _loaded = false;

  async function load() {
    if (!window._supabase) { _renderAll([]); return; }
    try {
      const { data, error } = await window._supabase
        .from('demandas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      _demands = data || [];
    } catch (e) {
      console.warn('Kanban: sem tabela demandas, modo offline.', e.message);
      _demands = JSON.parse(localStorage.getItem('_kanban_demands') || '[]');
    }
    _loaded = true;
    _renderAll(_demands);
  }

  function _renderAll(list) {
    COLS.forEach(col => {
      const el = document.getElementById('kanban-' + col.id);
      if (!el) return;
      const items = list.filter(d => d.status === col.status);
      if (items.length === 0) {
        el.innerHTML = '<div class="kanban-empty">Vazio.</div>';
        return;
      }
      el.innerHTML = items.map(d => _cardHtml(d)).join('');
    });
  }

  function _cardHtml(d) {
    const prazo = d.prazo ? `<span class="kanban-card-meta">📅 ${new Date(d.prazo).toLocaleDateString('pt-BR')}</span>` : '';
    const coord = d.coordenadoria ? `<span class="kanban-card-tag">${d.coordenadoria.toUpperCase()}</span>` : '';
    return `<div class="kanban-card" onclick="Kanban.abrirDetalhes('${d.id}')">
      <div class="kanban-card-title">${_esc(d.titulo)}</div>
      <div class="kanban-card-footer">${coord}${prazo}</div>
    </div>`;
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function abrirNovaDemanda() {
    const m = document.getElementById('kanbanModal');
    if (m) { m.style.display = 'flex'; }
    document.getElementById('kTitulo')?.focus();
  }

  function fecharModal() {
    const m = document.getElementById('kanbanModal');
    if (m) m.style.display = 'none';
    ['kTitulo','kCoord','kPrazo','kDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  async function salvar() {
    const titulo = document.getElementById('kTitulo')?.value?.trim();
    const coord  = document.getElementById('kCoord')?.value || 'ger';
    const prazo  = document.getElementById('kPrazo')?.value || null;
    const desc   = document.getElementById('kDesc')?.value?.trim() || '';
    if (!titulo) { alert('Insira um título para a demanda.'); return; }

    const now = new Date().toISOString();
    const demand = { id: 'loc-' + Date.now(), titulo, coordenadoria: coord, prazo, descricao: desc, status: 'pendente', created_at: now };

    if (window._supabase) {
      try {
        const { data, error } = await window._supabase
          .from('demandas')
          .insert([{ titulo, coordenadoria: coord, prazo, descricao: desc, status: 'pendente' }])
          .select()
          .single();
        if (error) throw error;
        _demands.unshift(data);
      } catch (e) {
        console.warn('Kanban: fallback local.', e.message);
        _demands.unshift(demand);
        _saveLocal();
      }
    } else {
      _demands.unshift(demand);
      _saveLocal();
    }

    _renderAll(_demands);
    fecharModal();
  }

  function abrirDetalhes(id) {
    const d = _demands.find(x => x.id == id || x.id == id);
    if (!d) return;
    // Abre modal de detalhes simples — futuramente expandir
    const info = `Título: ${d.titulo}\nCoord: ${(d.coordenadoria||'').toUpperCase()}\nStatus: ${d.status}\nPrazo: ${d.prazo || '—'}\n\n${d.descricao || ''}`;
    alert(info);
  }

  function _saveLocal() {
    localStorage.setItem('_kanban_demands', JSON.stringify(_demands));
  }

  return { load, abrirNovaDemanda, fecharModal, salvar, abrirDetalhes };
})();
