/* ============================================================
   NUPIEEPRO — Supabase Client + App Helpers
   Alinhado com a plataforma real (dark theme, 6 coords, ABJ)
   ============================================================ */

// ⚠️ Substitua pelos valores do seu projeto Supabase
const SUPABASE_URL  = 'COLE_SUA_URL_AQUI';
const SUPABASE_ANON = 'COLE_SUA_ANON_KEY_AQUI';

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
    if (sidebar) sidebar.classList.toggle('open');
  },

  /** Init full dashboard (auth + sidebar + profile) */
  async initDashboard() {
    const session = await App.requireAuth();
    if (!session) return null;

    const profile = await App.getProfile();
    if (!profile) return null;

    // Set sidebar user info
    const coordName = profile.coordenadorias?.nome || 'Geral';
    document.getElementById('sideAvatar').textContent = profile.iniciais || profile.nome?.charAt(0) || '?';
    document.getElementById('sideName').textContent = profile.nome;
    document.getElementById('sideRole').textContent = (profile.cargo || profile.role) + ' · ' + coordName;

    App.buildSidebar(coordName);
    App.buildSidebar = () => {}; // hack: já foi montada
    
    // Pass profile to sidebar logic so admin sees everything
    const nav = document.getElementById('sideNav');
    if (!nav) return;

    const myPages = profile?.role === 'admin' 
      ? Object.values(ROLE_PAGES).flat().filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)
      : ROLE_PAGES[coordName] || [];

    let html = '<div class="sidebar-section">Meu painel</div>';
    
    // Removendo view repetidas como Historico e Calendario para limpar a visão do Admin
    const cleanPages = myPages.reduce((acc, current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) return acc.concat([current]); else return acc;
    }, []);

    cleanPages.forEach(p => {
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

    html += '<div class="sidebar-section">Ação Rápida</div>';
    html += `<div class="nav-item" style="background:var(--orange-dim);border-color:var(--orange-border);color:var(--orange)" onclick="App.toast('ABJ modal — FASE 2','info')">
      <span class="nav-icon">➕</span>
      <span class="nav-label" style="color:var(--orange)">Inserir Atividade ABJ</span>
    </div>`;
    html += '<div class="sidebar-section">Colaborativo</div>';
    html += `<div class="nav-item nav-shared" id="nav-compartilhado" onclick="goTo('compartilhado')">
      <span class="nav-icon">📅</span>
      <span class="nav-label">Calendário Unificado</span>
    </div>`;

    html += '<div class="sidebar-section">Sistemas Externos</div>';
    html += `<a href="../Lojinha-Nupieepro/admin.html" target="_blank" class="nav-item">
      <span class="nav-icon">🛒</span>
      <span class="nav-label">Admin da Lojinha</span>
    </a>`;

    nav.innerHTML = html;

    App.buildMobileNav(coordName);

    // Load notification count
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
  'historico','calendario','manu'
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

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
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
    el('dashPts').textContent = pts;
    el('dashPtsBar').style.width = Math.min(pct, 100) + '%';
    el('dashAbjBar').style.width = Math.min(pct, 100) + '%';
    el('dashAbjPct').textContent = pct + '%';
    el('dashTasks').textContent = tasks;
    el('dashTasksSub').textContent = tasks + ' em andamento';
    el('dashMembers').textContent = members;
    el('dashSaldo').textContent = App.currency(saldo);
    el('dashSaldoSub').textContent = `↑ ${App.currency(vendas)} · ↓ ${App.currency(despesas)}`;

    // Quick action buttons
    el('quickBtns').innerHTML = `
      <button class="btn btn-primary" onclick="App.toast('Inserir atividade ABJ — FASE 2','info')">➕ Atividade ABJ</button>
      <button class="btn btn-ghost" onclick="App.toast('Nova tarefa — FASE 2','info')">☰ Nova Tarefa</button>
      <button class="btn btn-ghost" onclick="App.toast('Lançamento financeiro — FASE 2','info')">◎ Lançamento</button>
      <button class="btn btn-ghost" onclick="App.toast('Gerar relatório — FASE 2','info')">📄 Relatório</button>
    `;
  }
};
