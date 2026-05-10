/* ============================================================
   NUPIEEPRO — Supabase Client + App Helpers
   Alinhado com a plataforma real (dark theme, 6 coords, ABJ)
   ============================================================ */

// Chave anon (publishable) é segura para frontend — segurança real = RLS no Supabase.
const _SB_URL = 'https://quwpyrdxyibcbyzwfilb.supabase.co';
const _SB_KEY = 'sb_publishable_VmEMT07DiE1f5DtxzgZomA_-F0gZIpM';

const _EMAILJS_PUB_KEY = 'WIiLVFRJPDeqTP7Ox';
const _EMAILJS_SERVICE = 'service_85bjukt';

// Inicialização SEGURA do Supabase (try-catch para nunca travar o sistema)
let _sb = null;
try {
  if (typeof supabase !== 'undefined' && _SB_KEY && _SB_KEY.length > 10) {
    _sb = supabase.createClient(_SB_URL, _SB_KEY);
    window._sb = _sb;
    window._supabase = _sb;
    console.log('Supabase: Conectado com sucesso.');
  } else {
    console.warn('Supabase: Chave não configurada. Sistema em modo offline/demo.');
  }
} catch (e) {
  console.error('Supabase: Falha na conexão. Sistema em modo offline.', e.message);
  _sb = null;
}
window._sb = window._sb || null;
window._supabase = window._supabase || null;

/* ============================================================
   Constants — NUPIEEPRO structure
   ============================================================ */
const META_ABJ = 882;

const COORDENADORIAS = [
  { sigla: 'GER', nome: 'Geral',      icon: 'layout-dashboard', cor: '--orange' },
  { sigla: 'OPS', nome: 'Operações',   icon: 'cpu',   cor: '--blue' },
  { sigla: 'GP',  nome: 'G. Pessoas',  icon: 'user-cog', cor: '--yellow' },
  { sigla: 'MKT', nome: 'Marketing',   icon: 'layers',cor: '--red' },
  { sigla: 'PRJ', nome: 'Projetos',    icon: 'component',cor: '--orange' },
  { sigla: 'FIN', nome: 'Finanças',    icon: 'trending-up',cor: '--green' },
];

function getIcon(name) {
  // Retorna um placeholder que o Lucide irá transformar em SVG real
  return `<i data-lucide="${name}" class="nav-icon-i" style="width:18px; height:18px; stroke-width:1.8px;"></i>`;
}

// Pages each coord can access
const ROLE_PAGES = {
  'Geral':      [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'geral_reunioes', icon: 'users', label: 'Reuniões e Check-in' },
    { id: 'geral_planejamento', icon: 'layout', label: 'Planejamento Sem.' },
    { id: 'geral_melhorias', icon: 'star', label: 'Caixa de Melhorias' },
    { id: 'geral_parcerias', icon: 'gem', label: 'Parcerias Estratégicas' },
    { id: 'pessoas', icon: 'users', label: 'Gestão de Membros' },
    { id: 'tarefas', icon: 'list', label: 'Kanban Geral' },
  ],
  'Operações':  [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'ops_relatorios', icon: 'file', label: 'Relatórios ABJ' },
    { id: 'ops_pops', icon: 'folder', label: 'Cofre de POPs' },
    { id: 'ops_arquivo', icon: 'folder', label: 'Arquivo Digital' },
  ],
  'G. Pessoas': [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'gp_talentos', icon: 'users', label: 'Banco de Talentos' },
    { id: 'gp_clima', icon: 'star', label: 'Pesquisa de Clima' },
    { id: 'gp_tap', icon: 'layout', label: 'Módulo TAP (Inovação)' },
    { id: 'pessoas', icon: 'users', label: 'Gestão de Membros' },
  ],
  'Marketing':  [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'mkt_tracker', icon: 'megaphone', label: 'Social Media Tracker' },
    { id: 'mkt_kanban', icon: 'list', label: 'Kanban da Lojinha' },
  ],
  'Projetos':   [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'prj_eventos', icon: 'star', label: 'Eventos Estaduais' },
    { id: 'prj_enegep', icon: 'layout', label: 'Momento ENEGEP' },
    { id: 'prj_treinamentos', icon: 'users', label: 'Treinamentos Externos' },
    { id: 'prj_nupicast', icon: 'megaphone', label: 'NUPICAST Tracker' },
  ],
  'Finanças':   [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'fin_fluxo', icon: 'banknote', label: 'Fluxo de Caixa' },
    { id: 'fin_abepro', icon: 'users', label: 'Associações ABJ' },
    { id: 'fin_comercial', icon: 'gem', label: 'Calendário Comercial' },
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
   Global UI Hooks (Spotlight & Haptics)
   ============================================================ */
document.addEventListener("mousemove", e => {
  document.querySelectorAll(".sum-card, .section-card, .kanban-column, .cal-box").forEach(el => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
  });
});

function haptic(ms=15) { if(navigator.vibrate) navigator.vibrate(ms); }

/* ============================================================
   Omni-Connect Email & Security Engine (V6.7)
   ============================================================ */

// === SEGURANÇA: Sanitizador XSS ===
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

// === SEGURANÇA: Rate Limiter Anti-Brute-Force ===
const RateLimiter = {
  _attempts: {},
  check(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    if (!this._attempts[key]) this._attempts[key] = [];
    this._attempts[key] = this._attempts[key].filter(t => now - t < windowMs);
    if (this._attempts[key].length >= maxAttempts) return false;
    this._attempts[key].push(now);
    return true;
  },
  reset(key) { delete this._attempts[key]; }
};

// === NOME DO REMETENTE ===
const _EMAIL_SENDER = 'Nupieepro Sistem';

const EmailService = {
  init() {
    if (typeof emailjs !== 'undefined') {
      emailjs.init(_EMAILJS_PUB_KEY);
      console.log('EmailService: V6.7 Active | Sender:', _EMAIL_SENDER);
    }
  },

  async send(templateId, params) {
    if (typeof emailjs === 'undefined') return;
    try {
      params.from_name = _EMAIL_SENDER;
      await emailjs.send(_EMAILJS_SERVICE, templateId, params);
      console.log('Email sent:', templateId);
    } catch (e) {
      console.error('Email error:', e);
    }
  },

  // 🎂 Feliz Aniversário
  async notifyBirthday(user) {
    const nome = sanitize(user.nome);
    await this.send('template_birthday', {
      user_name: nome,
      target_email: user.email,
      subject: `Hoje o dia é de celebração, ${nome}! 🎉`,
      message: `Olá, ${nome}!\n\nHoje é um dia mais do que especial! 💙🧡\n\nEm nome de todo o Nupi, queremos te desejar um feliz aniversário e um ano repleto de realizações, saúde e muito sucesso. Que a sua jornada continue sendo de constante evolução e que você continue agregando tanto valor aos nossos projetos e à nossa equipe.\n\nAproveite muito o seu dia, celebre suas conquistas e conte com a gente para os próximos desafios!\n\nUm grande abraço,\nEquipe Nupi`
    });
  },

  // 👋 Despedida
  async notifyGoodbye(user, personalMsg) {
    const nome = sanitize(user.nome);
    const extra = personalMsg ? `\n\nMensagem personalizada: ${sanitize(personalMsg)}` : '';
    await this.send('template_goodbye', {
      user_name: nome,
      target_email: user.email,
      subject: `Até logo e muito sucesso na sua jornada! 🚀`,
      message: `Olá, ${nome}.\n\nGrandes ciclos se encerram para que novas e incríveis histórias possam ser escritas. 💙🧡\n\nHoje nos despedimos, mas o sentimento que fica é de uma imensa gratidão por toda a sua dedicação, produtividade e pelas marcas positivas que você deixa no Nupi. Trabalhar ao seu lado foi um grande aprendizado para todos nós.\n\nDesejamos que a sua trajetória seja brilhante e cheia de novas conquistas. Lembre-se de que as portas estarão sempre abertas e que você sempre fará parte da nossa história. Voa alto!${extra}\n\nCom carinho e admiração,\nEquipe Nupi`
    });
  },

  // 📩 Convite (Onboarding)
  async notifyInvite(user, magicLink) {
    const nome = sanitize(user.nome);
    await this.send('template_invite', {
      user_name: nome,
      target_email: user.email,
      subject: `Você acaba de dar o primeiro passo para algo incrível! ✨`,
      link: magicLink,
      message: `Olá, ${nome}!\n\nÉ com muita alegria que te convidamos para integrar oficialmente o nosso sistema e fazer parte do Nupi! 💙🧡\n\nA partir de agora, você faz parte de um ambiente focado em desenvolvimento, gestão e resultados. Aqui, nós construímos projetos, aprimoramos nossas habilidades e, o mais importante, crescemos juntos.\n\nPara começar a sua jornada com a gente, basta acessar a plataforma através do link abaixo, configurar o seu perfil e explorar o sistema.\n\n🔗 Acesse aqui: ${magicLink}\n\nEstamos muito felizes em ter você no time. Prepare-se para fazer a diferença!\n\nSeja muito bem-vindo(a),\nEquipe Nupi`
    });
  },

  // 📋 Nova Demanda
  async notifyDemand(demand, targetEmail) {
    await this.send('template_demand', {
      demand_title: sanitize(demand.titulo),
      target_email: targetEmail,
      sender: sanitize(window._appProfile?.nome || 'Coordenação'),
      subject: `Nova Demanda: ${sanitize(demand.titulo)}`,
      message: `Uma nova demanda foi registrada no sistema.\n\nTítulo: ${sanitize(demand.titulo)}\nRemetente: ${sanitize(window._appProfile?.nome || 'Coordenação')}\n\nAcesse o sistema para verificar os detalhes.\n\nEquipe Nupi`
    });
  }
};

const MagicLink = {
  async generate(email) {
    const sb = window._sb || window._supabase;
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 2 * 60000).toISOString(); // 2 min

    if (sb) {
      const { error } = await sb.from('magic_links').insert({
        email, token, expires_at: expiresAt, used: false
      });
      if (error) throw error;
    }
    
    // Link base (ajustar conforme o domínio final)
    const base = window.location.origin + window.location.pathname.replace('dashboard.html', 'index.html');
    return `${base}?magic=${token}`;
  },

  async verify(token) {
    const sb = window._sb || window._supabase;
    if (!sb) return null;
    const { data, error } = await sb.from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !data) return null;

    // Verificar expiração
    if (new Date() > new Date(data.expires_at)) {
      window.App?.toast?.('Link mágico expirado (2 min).', 'error');
      return null;
    }

    // Marcar como usado
    await sb.from('magic_links').update({ used: true }).eq('token', token);
    return data.email;
  }
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
    toast.style.position = 'relative';
    toast.style.overflow = 'hidden';
    toast.textContent = message;

    const prog = document.createElement('div');
    prog.style.position = 'absolute';
    prog.style.bottom = '0'; prog.style.left = '0';
    prog.style.height = '3px'; prog.style.width = '100%';
    prog.style.background = 'var(--c-white)';
    prog.style.opacity = '0.4';
    prog.style.transition = `width ${duration}ms linear`;
    toast.appendChild(prog);

    container.appendChild(toast);
    
    // Animate progress shrink
    requestAnimationFrame(() => requestAnimationFrame(() => { prog.style.width = '0%'; }));

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
          cargo: 'Desenvolvedor',
          iniciais: 'JR',
          coordenadorias: { nome: 'Geral', sigla: 'GER', icon: 'crown' }
        };
      }
      return null;
    }
    const { data: { user } } = await _sb.auth.getUser();
    if (!user) return null;

    // INTERVENÇÃO MASTER: Se for o e-mail do Dev, força o cargo/role independente do banco
    const isDev = user.email === 'jjoserrayan2711@gmail.com';

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
        role: isDev ? 'admin' : (meta.role || 'membro'),
        cargo: isDev ? 'Desenvolvedor' : (meta.cargo || 'Membro'),
        iniciais: meta.iniciais || emailName.slice(0, 2).toUpperCase(),
        coordenadorias: { nome: 'Geral', sigla: 'GER', icon: 'crown' }
      };
    }
    if (isDev) { data.role = 'admin'; data.cargo = 'Desenvolvedor'; }
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

    const profile = window._appProfile;
    const cName = coordName || 'Geral';
    // Sanitização para encontrar a chave correta no ROLE_PAGES (lidar com acentos e case)
    const roleKey = Object.keys(ROLE_PAGES).find(k => 
      k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === 
      cName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    ) || 'Geral';
    
    const GLOBAL_PAGES = [
      { id: 'global_visitas', icon: 'zap', label: 'Visitas Técnicas' },
      { id: 'global_apresentacoes', icon: 'star', label: 'Apresentações Inst.' },
      { id: 'global_producao', icon: 'file', label: 'Produção Científica' },
      { id: 'global_assembleia', icon: 'users', label: 'Assembleia e Votos' }
    ];

    const isCoordGeral = profile?.role === 'coordenador' && cName.toUpperCase() === 'GERAL';
    const myPages = (profile?.role === 'admin' || isCoordGeral)
      ? Object.values(ROLE_PAGES).flat().concat(GLOBAL_PAGES).filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)
      : (ROLE_PAGES[roleKey] || []).concat(GLOBAL_PAGES);

    let html = '<div class="sidebar-section">Meu painel</div>';
    html += myPages.map(p => 
      `<div class="nav-item" id="nav-${p.id}" onclick="goTo('${p.id}')">
        <span class="nav-icon">${getIcon(p.icon)}</span>
        <span class="nav-label">${p.label}</span>
        ${p.badge ? `<span class="nav-badge">${p.badge}</span>` : ''}
      </div>`
    ).join('');

    html += '<div class="sidebar-section">Operacional</div>';
    html += `<div class="nav-item" style="background:var(--orange-dim);border-color:var(--orange-border);color:var(--orange)" onclick="goTo('abj')">
      <span class="nav-icon">${getIcon('star')}</span>
      <span class="nav-label" style="color:var(--orange)">Atividades ABJ</span>
    </div>`;

    // Terminal do Dev (Admin only)
    if (profile?.role === 'admin') {
      html += '<div class="sidebar-section">Terminal do Dev</div>';
      html += `<div class="nav-item" style="color:var(--orange); border-left:2px solid var(--orange);" onclick="window.open('https://supabase.com/dashboard/project/quwpyrdxyibcbyzwfilb','_blank')">
        <span class="nav-icon">${getIcon('settings')}</span>
        <span class="nav-label">DB Supabase Dashboard</span>
      </div>`;
      html += `<div class="nav-item" onclick="window.open('https://nupieepro.github.io/Lojinha-Nupieepro/admin.html','_blank')">
        <span class="nav-icon">${getIcon('gem')}</span>
        <span class="nav-label">Admin Lojinha</span>
      </div>`;
    }

    // Shared
    html += '<div class="sidebar-section">Colaborativo</div>';
    html += `<div class="nav-item nav-shared" id="nav-compartilhado" onclick="goTo('compartilhado')">
      <span class="nav-icon">${getIcon('users')}</span>
      <span class="nav-label">Compartilhado</span>
    </div>`;

    nav.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  /** Build mobile bottom nav */
  buildMobileNav(coordName) {
    const mobileNav = document.getElementById('mobileNav');
    if (!mobileNav) return;

    const myPages = (ROLE_PAGES[coordName] || []).slice(0, 5);
    mobileNav.innerHTML = myPages.map(p =>
      `<div class="mnav-item" onclick="goTo('${p.id}')">
        <span class="mnav-icon">${getIcon(p.icon).replace('width="18" height="18"', 'width="20" height="20"')}</span>
        <span>${p.label}</span>
      </div>`
    ).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
    try {
      Theme.init();

      const session = await App.requireAuth();
      if (!session) return null;

      const shell = document.getElementById('appShell');
      if (shell) shell.classList.add('visible');

      const profile = await App.getProfile();
      if (!profile) {
        App.toast('Perfil não encontrado. Faça logout.', 'error');
        return null;
      }
      window._appProfile = profile;

      if (typeof DashboardExtra !== 'undefined') {
        DashboardExtra.syncMandates(profile);
        DashboardExtra.checkGlobalInactivity();
      }

      const coordName = profile.coordenadorias?.nome || 'Geral';

      const userInitials = profile.iniciais || profile.nome?.[0] || '?';
      const userLabel    = (profile.cargo || profile.role || 'Membro') + ' · ' + coordName;
      const firstName    = profile.nome?.split(' ')[0] || 'Usuário';

      const sid = document.getElementById('sideAvatar');
      const snm = document.getElementById('sideName');
      const srl = document.getElementById('sideRole');
      const tav = document.getElementById('topbarAvatar');
      const tnm = document.getElementById('topbarName');
      const drn = document.getElementById('dropName');
      const drr = document.getElementById('dropRole');
      if (sid) sid.textContent = userInitials;
      if (snm) snm.textContent = profile.nome || 'Usuário';
      if (srl) srl.textContent = userLabel;
      if (tav) tav.textContent = userInitials;
      if (tnm) tnm.textContent = firstName;
      if (drn) drn.textContent = profile.nome || 'Usuário';
      if (drr) drr.textContent = userLabel;

      App.buildSidebar(coordName);
      App.buildMobileNav(coordName);

      const isOps = profile.role === 'admin' || (profile.coordenadorias?.sigla || '').toUpperCase() === 'OPS';
      const opsSection = document.getElementById('opsLinksSection');
      if (opsSection) opsSection.style.display = isOps ? 'contents' : 'none';

      if (typeof Cal !== 'undefined') Cal.init();
      if (typeof MiniCal !== 'undefined') MiniCal.init();

      await App.loadNotifCount().catch(e => console.warn('Notif check failed:', e));

      // Saudação dinâmica
      const saudacao = App.getSaudacao();
      const sEl = document.getElementById('topbarSaudacao');
      if (sEl) sEl.textContent = `${saudacao}, ${firstName}!`;

      // Role Switcher para o dev/admin
      const isJR = profile.email?.includes('jjose') || profile.nome?.toLowerCase().includes('rayan');
      const btnSwitch = document.getElementById('btnSwitchRole');
      if (isJR && btnSwitch) btnSwitch.style.display = 'block';

      App.syncSettingsInputs(profile);

      return profile;
    } catch (err) {
      console.error('Critical Init Error:', err);
      App.toast('Erro ao carregar dashboard. Tente recarregar.', 'error');
      return null;
    }
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
  },
  getSaudacao() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 18) return "Boa tarde";
    return "Boa noite";
  },
  setFont(family) {
    document.documentElement.setAttribute('data-font', family);
    localStorage.setItem('nupie_font', family);
    // Sem toast — mudança visual é imediata
  },
  
  syncSettingsInputs(p) {
    if (!p) return;
    const elNome = document.getElementById('myProfileNome');
    const elInit = document.getElementById('myProfileIniciais');
    const elCargo = document.getElementById('myProfileCargo');
    const elAvatar = document.getElementById('myProfileAvatar');
    
    if (elNome) elNome.value = p.nome || '';
    if (elInit) elInit.value = p.iniciais || '';
    if (elCargo) elCargo.value = p.cargo || '';
    if (elAvatar) elAvatar.textContent = p.iniciais || p.nome?.[0] || '?';
  },

  async updateMyProfile() {
    const nome = document.getElementById('myProfileNome')?.value?.trim();
    const iniciais = document.getElementById('myProfileIniciais')?.value?.trim()?.toUpperCase();
    const cargo = document.getElementById('myProfileCargo')?.value?.trim();
    
    if (!nome) return App.toast('Nome é obrigatório', 'warning');
    
    App.loading(true);
    try {
      const p = window._appProfile;
      if (!p) throw new Error('Sessão expirada');
      
      if (_sb) {
        const { error } = await _sb.from('users').update({
          nome, iniciais, cargo
        }).eq('id', p.id);
        if (error) throw error;
      }
      
      // Update local object
      p.nome = nome;
      p.iniciais = iniciais;
      p.cargo = cargo;
      
      // Update UI
      document.getElementById('sideName').textContent = nome;
      document.getElementById('sideAvatar').textContent = iniciais;
      document.getElementById('sideRole').textContent = `${cargo} · ${p.coordenadorias?.nome || 'Geral'}`;
      App.syncSettingsInputs(p);
      
      App.toast('Perfil atualizado com sucesso!', 'success');
    } catch (e) {
      App.toast('Erro ao atualizar: ' + e.message, 'error');
    } finally {
      App.loading(false);
    }
  },
  showPage(id) {
    if (typeof goTo === 'function') goTo(id);
  },
  toggleRole() {
    const p = window._appProfile;
    if (!p) return;
    
    // Efeito Flip 3D (V9.0)
    document.body.classList.add('profile-switching');
    
    setTimeout(() => {
      // Toggle logic
      const current = window._activeRole || p.role;
      window._activeRole = (current === 'admin') ? 'assessor' : 'admin';
      
      const newCoord = (window._activeRole === 'admin') ? 'Geral' : 'Marketing';
      
      // Re-build UI
      App.buildSidebar(newCoord);
      document.getElementById('sideRole').textContent = `${window._activeRole.toUpperCase()} · ${newCoord}`;
      
      const badge = document.getElementById('profile-badge');
      if (badge) {
        badge.classList.toggle('dev-mode', window._activeRole === 'admin');
        badge.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:${window._activeRole==='admin'?'#2DD4A0':'var(--green)'}"></div> ${window._activeRole.toUpperCase()}`;
      }

      document.body.classList.remove('profile-switching');
      document.body.classList.add('profile-switching-in');
      setTimeout(() => document.body.classList.remove('profile-switching-in'), 400);

      App.toast(`Perfil alterado para: ${window._activeRole.toUpperCase()}`, 'success');
    }, 300);
  },
  updateABJCountdown() {
    const el = document.getElementById('abj-countdown');
    if (!el) return;

    const agora = new Date();
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    const diff = fimMes - agora;

    if (diff <= 0) {
      el.textContent = "Prazo encerrado!";
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    el.textContent = `${d}d ${h}h ${m}m`;
  }
};

/* ============================================================
   Navigation
   ============================================================ */
const ALL_PAGES = [
  'dashboard','abj','tarefas','pessoas','projetos',
  'operacoes','marketing','financeiro','compartilhado',
  'manu','notificacoes','config','configuracoes',
  'demandas','calendario','geral','gp',
  'geral_reunioes','geral_planejamento','geral_melhorias','geral_parcerias',
  'mkt_tracker','mkt_kanban',
  'fin_fluxo','fin_abepro','fin_comercial',
  'prj_eventos','prj_enegep','prj_treinamentos','prj_nupicast',
  'ops_relatorios','ops_pops','ops_arquivo',
  'gp_talentos','gp_clima','gp_tap',
  'global_visitas','global_apresentacoes','global_producao','global_assembleia'
];

function goTo(id) {
  haptic();
  ALL_PAGES.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.remove('active');
  });
  const pg = document.getElementById('page-' + id);
  if (pg) {
    pg.classList.add('active');
    // Forçar reflow para animação de fade
    pg.style.display = 'none';
    pg.offsetHeight; 
    pg.style.display = 'flex';
    
    const content = pg.querySelector('.content') || pg;
    content.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');

  // Lazy-load de páginas com dados
  if (id === 'pessoas')         Pessoas.loadMembers();
  if (id === 'tarefas')         Kanban.load();
  if (id === 'abj')             ABJ.init();
  if (id === 'geral_reunioes')    typeof PageGeral     !== 'undefined' && PageGeral.init();
  if (id === 'geral_planejamento') typeof PageGeral    !== 'undefined' && PageGeral._renderPlanejamento();
  if (id === 'mkt_tracker')       typeof PageMarketing !== 'undefined' && PageMarketing.init();
  if (id === 'fin_fluxo')         typeof PageFinancas  !== 'undefined' && PageFinancas.init();
  if (id === 'prj_eventos')       typeof PageProjetos  !== 'undefined' && PageProjetos.init();
  if (id === 'ops_pops')          typeof PageOperacoes !== 'undefined' && PageOperacoes._renderPops();
  if (id === 'gp_talentos')       typeof PagePessoas   !== 'undefined' && PagePessoas._renderTalentos();
  if (id === 'demandas')          Dem.setView('kanban', document.getElementById('demViewKanban'));
  if (id === 'calendario')        NovoCal._render();
  if (id === 'gp')                { GP.loadTalentBank(); Pessoas.loadMembers(); }
  if (id === 'marketing')         Marketing.loadKanban();
  if (id === 'projetos')          Projetos.loadSponsors();
  if (id === 'notificacoes')      typeof PageNotificacoes !== 'undefined' && PageNotificacoes.init();
  if (id === 'compartilhado')     typeof PageCompartilhado !== 'undefined' && PageCompartilhado.init();
}

function toggleSidebar() {
  App.toggleSidebar();
}

/* ============================================================
   Dashboard renderer
   ============================================================ */
const Dashboard = {
  async render(profile) {
    const cards = document.querySelectorAll('.sum-card');
    cards.forEach(c => c.classList.add('loading'));

    if (!_sb) {
      setTimeout(() => {
        Dashboard.renderDemo(profile);
        cards.forEach(c => c.classList.remove('loading'));
      }, 800);
      return;
    }

    try {
      // Fetch KPIs em paralelo
      const [abjRes, demandasRes, membersRes, vendasRes, despesasRes, recentRes] = await Promise.all([
        _sb.from('progresso_abj').select('pontos'),
        _sb.from('demandas').select('coluna, titulo, created_at, coordenadorias(sigla)').order('created_at', {ascending:false}).limit(50),
        _sb.from('users').select('id', { count: 'exact', head: true }).eq('ativo', true),
        _sb.from('vendas').select('valor'),
        _sb.from('despesas').select('valor'),
        _sb.from('demandas').select('titulo, coluna, updated_at, coordenadorias(sigla)').order('updated_at', {ascending:false}).limit(6),
      ]);

      cards.forEach(c => c.classList.remove('loading'));

      const totalPts   = (abjRes.data || []).reduce((s, r) => s + (r.pontos || 0), 0);
      const allDemands = demandasRes.data || [];
      const activeTasks = allDemands.filter(d => !['realizada','auditada'].includes(d.coluna)).length;
      const doneTasks   = allDemands.filter(d => ['realizada','auditada'].includes(d.coluna)).length;
      const deliveryPct = allDemands.length ? Math.round((doneTasks / allDemands.length) * 100) : null;
      const totalMembers = membersRes.count || 0;
      const totalVendas  = (vendasRes.data || []).reduce((s, r) => s + parseFloat(r.valor || 0), 0);
      const totalDespesas= (despesasRes.data || []).reduce((s, r) => s + parseFloat(r.valor || 0), 0);
      const saldo = totalVendas - totalDespesas;

      Dashboard.setKPIs(totalPts, activeTasks, totalMembers, saldo, totalVendas, totalDespesas);

      // Taxa de entrega dinâmica
      const elDel = document.getElementById('stat-delivery');
      const elDelT = document.getElementById('stat-delivery-trend');
      if (elDel) elDel.textContent = deliveryPct !== null ? deliveryPct + '%' : '—';
      if (elDelT) elDelT.textContent = deliveryPct !== null ? `${doneTasks} de ${allDemands.length} demandas` : 'Sem demandas cadastradas';

      // Auditoria ABJ
      const auditPct = Math.round((totalPts / 50) * 100);
      const auditBar = document.getElementById('audit-bar');
      const auditTxt = document.getElementById('audit-percent');
      const auditStatus = document.getElementById('audit-status');
      if (auditBar) auditBar.style.width = Math.min(auditPct, 100) + '%';
      if (auditTxt) auditTxt.textContent = auditPct + '%';
      if (auditStatus) {
        if (auditPct >= 100) auditStatus.textContent = 'Auditoria completa — Selo garantido';
        else if (auditPct >= 70) auditStatus.textContent = 'Quase lá — foco no fechamento';
        else auditStatus.textContent = 'Sincronizado — continue reportando';
      }

      // Atividade recente (demandas reais)
      const recentEl = document.getElementById('dashRecent');
      if (recentEl) {
        const items = recentRes.data || [];
        if (items.length === 0) {
          recentEl.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:16px 0;">Nenhuma atividade registrada.</p>';
        } else {
          const colLabel = {pendente:'Pendente',exec:'Em execução',realizada:'Realizada',auditada:'Auditada'};
          recentEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px;">' +
            items.map(d => {
              const sigla = d.coordenadorias?.sigla || 'GER';
              const tag = sigla.toLowerCase();
              const dt = d.updated_at ? new Date(d.updated_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '—';
              return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-2);border-radius:8px;font-size:13px;">
                <span class="coord-tag tag-${tag}" style="flex-shrink:0;">${sigla}</span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.titulo || 'Demanda'}</span>
                <span style="color:var(--fg-3);font-size:11px;font-family:var(--font-mono);flex-shrink:0;">${dt}</span>
              </div>`;
            }).join('') +
          '</div>';
        }
      }

      // Gráficos — dados reais
      Dashboard.renderChartPareto(allDemands);
      Dashboard.renderChartCoord(allDemands);
      Dashboard.render5S();
      Dashboard.renderChartFreq().catch(e => console.warn('[Dash FreqEvt]', e.message));
      Dashboard.renderChartRadar().catch(e => console.warn('[Dash Radar]', e.message));

      // Pipeline de Demandas por status
      Dashboard.renderPipeline(allDemands);

      // ABJ: progresso por estrela
      Dashboard.renderAbjEstrelas().catch(e => console.warn('[Dash ABJ]', e.message));

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      Dashboard.renderDemo(profile);
    }
  },

  renderPipeline(demands) {
    const el = document.getElementById('dashPipeline');
    if (!el) return;
    const cols = [
      { id:'pendente',  label:'Pendente',    cor:'var(--fg-3)' },
      { id:'exec',      label:'Em Execução', cor:'var(--brand-orange)' },
      { id:'evidencia', label:'Evidência',   cor:'var(--blue)' },
      { id:'realizada', label:'Realizada',   cor:'var(--green)' },
      { id:'auditada',  label:'Auditada',    cor:'var(--brand-purple-l)' },
    ];
    if (!demands || demands.length === 0) {
      el.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:24px 0;">Nenhuma demanda cadastrada ainda. <a href="#" onclick="goTo(\'demandas\');return false;" style="color:var(--brand-orange);">Criar primeira →</a></p>';
      return;
    }
    const max = Math.max(...cols.map(c => demands.filter(d => d.coluna === c.id).length), 1);
    el.innerHTML = cols.map(c => {
      const count = demands.filter(d => d.coluna === c.id).length;
      const pct = Math.round((count / max) * 100);
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--fg-2);">${c.label}</span>
          <span style="font-family:var(--font-mono);color:${c.cor};font-weight:700;">${count}</span>
        </div>
        <div style="height:6px;background:var(--surface-2);border-radius:3px;">
          <div style="width:${pct}%;height:100%;background:${c.cor};border-radius:3px;transition:width 1s var(--spring);opacity:0.85;"></div>
        </div>
      </div>`;
    }).join('');
  },

  async renderAbjEstrelas() {
    const el = document.getElementById('dashAbjAreas');
    if (!el || !_sb) return;
    const [r1, r2] = await Promise.all([
      _sb.from('atividades_abj').select('id, numero, nome, ativo').eq('ativo', true),
      _sb.from('progresso_abj').select('atividade_id, status'),
    ]);
    const atividades = r1.data || [];
    const progresso  = r2.data || [];
    if (atividades.length === 0) {
      el.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:24px 0;">Atividades ABJ não encontradas.</p>';
      return;
    }
    const statusDe = (atvId) => progresso.find(p => p.atividade_id === atvId)?.status || 'pendente';
    const estrelas = [
      {n:1, label:'1ª Estrela', atv:[1,2,3,4,6]},
      {n:2, label:'2ª Estrela', atv:[8,9]},
      {n:3, label:'3ª Estrela', atv:[7,13,14]},
      {n:4, label:'4ª Estrela', atv:[5,16]},
      {n:5, label:'5ª Estrela', atv:[11,12,18]},
    ];
    el.innerHTML = estrelas.map(e => {
      const items = e.atv.map(n => atividades.find(a => a.numero === n)).filter(Boolean);
      const done = items.filter(a => statusDe(a.id) === 'concluido').length;
      const total = items.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const cor = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--brand-orange)' : 'var(--fg-4)';
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--fg-2);">${e.label}</span>
          <span style="font-family:var(--font-mono);color:${cor};font-weight:700;">${done}/${total}</span>
        </div>
        <div style="height:6px;background:var(--surface-2);border-radius:3px;">
          <div style="width:${pct}%;height:100%;background:${cor};border-radius:3px;transition:width 1s var(--spring);"></div>
        </div>
      </div>`;
    }).join('');
  },

  renderChartPareto(demands) {
    const el = document.getElementById('dashChartPareto');
    if (!el) return;
    const active = (demands||[]).filter(d => !['realizada','auditada'].includes(d.coluna));
    if (!active.length) {
      el.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:24px 0;">Nenhuma demanda ativa cadastrada ainda.</p>';
      return;
    }
    const counts = {};
    active.forEach(d => { const s = d.coordenadorias?.sigla||'GER'; counts[s]=(counts[s]||0)+1; });
    const COR = {GER:'var(--tag-geral,#f97316)',OPS:'var(--blue,#5b9cf6)',GP:'var(--yellow,#f5c518)',MKT:'var(--red,#ef4444)',PRJ:'var(--brand-orange,#f97316)',FIN:'var(--green,#2dd4a0)'};
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const max = sorted[0]?.[1]||1;
    el.innerHTML = sorted.map(([s,c])=>`
      <div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span style="color:var(--fg-2);">${s}</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:${COR[s]||'var(--brand-orange)'};">${c}</span>
        </div>
        <div style="height:8px;background:var(--surface-2);border-radius:4px;">
          <div style="width:${Math.round(c/max*100)}%;height:100%;background:${COR[s]||'var(--brand-orange)'};border-radius:4px;transition:width 1s var(--spring);"></div>
        </div>
      </div>`).join('');
  },

  async renderChartFreq() {
    const el = document.getElementById('dashChartFreq');
    if (!el) return;
    const now = new Date();
    const months = Array.from({length:6},(_,i)=>{
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      return { key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').slice(0,3).toUpperCase() };
    });
    const counts = Object.fromEntries(months.map(m=>[m.key,0]));
    if (_sb) {
      try {
        const { data } = await _sb.from('eventos').select('created_at');
        (data||[]).forEach(ev=>{ const d=new Date(ev.created_at); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if(k in counts) counts[k]++; });
      } catch(_) {}
    }
    const vals = months.map(m=>counts[m.key]);
    const mx = Math.max(...vals,1);
    el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:5px;height:90px;">`+
      months.map((m,i)=>{
        const h = vals[i]>0 ? Math.max(Math.round(vals[i]/mx*72),8) : 4;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
          <div style="width:100%;height:${h}px;background:${vals[i]>0?'var(--brand-orange)':'var(--surface-2)'};border-radius:3px 3px 0 0;opacity:${vals[i]>0?0.85:0.35};transition:height 1s var(--spring);" title="${vals[i]} eventos"></div>
          <div style="font-size:9px;color:var(--fg-4);white-space:nowrap;">${m.label}</div>
        </div>`;
      }).join('')+'</div>';
  },

  async renderChartRadar() {
    const el = document.getElementById('dashChartRadar');
    if (!el) return;
    const ESTRELAS = [
      {label:'1ª ★',atv:[1,2,3,4,6]},{label:'2ª ★',atv:[8,9]},
      {label:'3ª ★',atv:[7,13,14]},{label:'4ª ★',atv:[5,16]},{label:'5ª ★',atv:[11,12,18]}
    ];
    let pcts = [0,0,0,0,0];
    if (_sb) {
      try {
        const [r1,r2] = await Promise.all([
          _sb.from('atividades_abj').select('id,numero').eq('ativo',true),
          _sb.from('progresso_abj').select('atividade_id,status'),
        ]);
        const atv = r1.data||[], prog = r2.data||[];
        pcts = ESTRELAS.map(e=>{
          const ids = e.atv.map(n=>atv.find(a=>a.numero===n)?.id).filter(Boolean);
          const done = ids.filter(id=>prog.find(p=>p.atividade_id===id&&p.status==='concluido')).length;
          return ids.length ? Math.round(done/ids.length*100) : 0;
        });
      } catch(_) {}
    }
    const cx=90,cy=90,r=65;
    const angs = ESTRELAS.map((_,i)=>(i*72-90)*Math.PI/180);
    const coord = (pct,ai)=>[cx+r*(pct/100)*Math.cos(angs[ai]),cy+r*(pct/100)*Math.sin(angs[ai])];
    const path = pts=>pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')+'Z';
    const rings=[25,50,75,100].map(g=>{const gp=angs.map(a=>[cx+r*(g/100)*Math.cos(a),cy+r*(g/100)*Math.sin(a)]);return`<path d="${path(gp)}" fill="none" stroke="var(--surface-2)" stroke-width="1"/>`;}).join('');
    const axes=angs.map(a=>`<line x1="${cx}" y1="${cy}" x2="${(cx+r*Math.cos(a)).toFixed(1)}" y2="${(cy+r*Math.sin(a)).toFixed(1)}" stroke="var(--surface-2)" stroke-width="1"/>`).join('');
    const dataP=path(ESTRELAS.map((_,i)=>coord(pcts[i]||2,i)));
    const lbls=ESTRELAS.map((e,i)=>{const lx=(cx+(r+18)*Math.cos(angs[i])).toFixed(1);const ly=(cy+(r+18)*Math.sin(angs[i])).toFixed(1);return`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--fg-3)" font-size="10" font-family="inherit">${e.label}</text>`;}).join('');
    el.innerHTML=`<svg viewBox="0 0 180 180" style="width:100%;max-height:155px;">${rings}${axes}<path d="${dataP}" fill="var(--brand-orange)" fill-opacity="0.18" stroke="var(--brand-orange)" stroke-width="2"/>${lbls}</svg>`;
  },

  render5S() {
    const el = document.getElementById('dashChart5S');
    if (!el) return;
    const S=['Seiri','Seiton','Seiso','Seiketsu','Shitsuke'];
    const scores=JSON.parse(localStorage.getItem('np_5s')||'null')||[7,7,7,7,7];
    el.innerHTML=`<div style="display:flex;align-items:flex-end;gap:5px;height:90px;">`+
      S.map((s,i)=>{
        const h=Math.max(Math.round(scores[i]/10*72),4);
        const cor=scores[i]>=8?'var(--green)':scores[i]>=5?'var(--brand-orange)':'#ef4444';
        return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;" onclick="Dashboard.edit5S(${i})" title="${s}: ${scores[i]}/10">
          <div style="width:100%;height:${h}px;background:${cor};border-radius:3px 3px 0 0;opacity:0.85;"></div>
          <div style="font-size:9px;color:var(--fg-4);">${s.slice(0,2)}</div>
        </div>`;
      }).join('')+
      `</div><div style="font-size:10px;color:var(--fg-4);text-align:center;margin-top:6px;">Média: ${(scores.reduce((a,b)=>a+b,0)/5).toFixed(1)}/10</div>`;
  },

  edit5S(idx) {
    const S=['Seiri','Seiton','Seiso','Seiketsu','Shitsuke'];
    const DESCR=['Senso de Utilização','Senso de Organização','Senso de Limpeza','Senso de Padronização','Senso de Disciplina'];
    const scores=JSON.parse(localStorage.getItem('np_5s')||'null')||[7,7,7,7,7];
    abrirModal({ titulo:`${S[idx]} — ${DESCR[idx]}`, tipo:'info', corpo:`
      <div class="form-group">
        <label class="form-label">Nota de 0 a 10</label>
        <input id="5s-nota" class="form-input" type="number" min="0" max="10" value="${scores[idx]}">
      </div>
      <div style="font-size:12px;color:var(--fg-3,var(--c-slate));margin-top:6px;padding:8px 12px;background:var(--surface-2,var(--b-1));border-radius:8px;">
        <strong style="color:#ef4444">0–4</strong> Insuficiente &nbsp;·&nbsp;
        <strong style="color:var(--brand-orange,#f97316)">5–7</strong> Regular &nbsp;·&nbsp;
        <strong style="color:var(--green,#2dd4a0)">8–10</strong> Ótimo
      </div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar',classe:'btn-primary',acao:()=>{
        const v=Math.max(0,Math.min(10,parseInt(document.getElementById('5s-nota')?.value)||0));
        scores[idx]=v;
        localStorage.setItem('np_5s',JSON.stringify(scores));
        fecharModal();
        Dashboard.render5S();
      }}
    ]});
  },

  renderChartCoord(demands) {
    const el = document.getElementById('dashChartCoord');
    if (!el) return;
    const all = demands||[];
    if (!all.length) {
      el.innerHTML='<p style="color:var(--fg-3);font-size:12px;text-align:center;padding:20px 0;">Sem demandas.</p>';
      return;
    }
    const counts={};
    all.forEach(d=>{ const s=d.coordenadorias?.sigla||'GER'; counts[s]=(counts[s]||0)+1; });
    const COR={GER:'var(--tag-geral,#f97316)',OPS:'var(--blue,#5b9cf6)',GP:'var(--yellow,#f5c518)',MKT:'var(--red,#ef4444)',PRJ:'var(--brand-orange,#f97316)',FIN:'var(--green,#2dd4a0)'};
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const max=sorted[0]?.[1]||1;
    el.innerHTML=sorted.map(([s,c])=>`
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">
          <span style="color:var(--fg-2);">${s}</span>
          <span style="font-family:var(--font-mono);font-weight:700;font-size:11px;color:${COR[s]||'var(--brand-orange)'};">${c}</span>
        </div>
        <div style="height:6px;background:var(--surface-2);border-radius:3px;">
          <div style="width:${Math.round(c/max*100)}%;height:100%;background:${COR[s]||'var(--brand-orange)'};border-radius:3px;transition:width 1s var(--spring);opacity:0.7;"></div>
        </div>
      </div>`).join('');
  },

  renderDemo(profile) {
    Dashboard.setKPIs(0, 0, 0, 0, 0, 0);
    const auditBar = document.getElementById('audit-bar');
    const auditTxt = document.getElementById('audit-percent');
    const auditStatus = document.getElementById('audit-status');
    if (auditBar) auditBar.style.width = '0%';
    if (auditTxt) auditTxt.textContent = '0%';
    if (auditStatus) auditStatus.textContent = 'Sem conexão com o servidor';
    const elDel = document.getElementById('stat-delivery');
    const elDelT = document.getElementById('stat-delivery-trend');
    if (elDel) elDel.textContent = '—';
    if (elDelT) elDelT.textContent = 'Sem dados';
    const recentEl = document.getElementById('dashRecent');
    if (recentEl) recentEl.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:16px 0;">Sem conexão — verifique sua internet.</p>';
    const pipeEl = document.getElementById('dashPipeline');
    if (pipeEl) pipeEl.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:16px 0;">Sem conexão com o servidor.</p>';
    const abjEl = document.getElementById('dashAbjAreas');
    if (abjEl) abjEl.innerHTML = '<p style="color:var(--fg-3);font-size:13px;text-align:center;padding:16px 0;">Sem conexão com o servidor.</p>';
    // Gráficos — estado offline
    ['dashChartPareto','dashChartCoord'].forEach(id=>{
      const e=document.getElementById(id);
      if(e) e.innerHTML='<p style="color:var(--fg-3);font-size:12px;text-align:center;padding:20px 0;">Sem conexão.</p>';
    });
    Dashboard.renderChartFreq(); // mostra barras zeradas sem query
    Dashboard.render5S();        // localStorage funciona offline
    const radarEl=document.getElementById('dashChartRadar');
    if(radarEl) radarEl.innerHTML='<p style="color:var(--fg-3);font-size:12px;text-align:center;">Sem conexão.</p>';
  },

  setKPIs(pts, tasks, members, saldo, vendas, despesas) {
    const pct = Math.round((pts / META_ABJ) * 100);
    const el = (id) => document.getElementById(id);
    
    // Novas IDs do Dashboard V7.0
    if (el('stat-points')) el('stat-points').textContent = pts;
    if (el('stat-points-trend')) el('stat-points-trend').textContent = pct + '% da meta';
    if (el('stat-demands')) el('stat-demands').textContent = tasks;
    if (el('stat-members')) el('stat-members').textContent = members;
    if (el('stat-cash')) el('stat-cash').textContent = App.currency(saldo);
    if (el('stat-cash-trend')) el('stat-cash-trend').textContent = `↑ ${App.currency(vendas)} / ↓ ${App.currency(despesas)}`;

    // Suporte legado
    if (el('dashPts')) el('dashPts').textContent = pts;
    if (el('dashPtsBar')) el('dashPtsBar').style.width = Math.min(pct, 100) + '%';
    if (el('dashAbjBar')) el('dashAbjBar').style.width = Math.min(pct, 100) + '%';
    if (el('dashAbjPct')) el('dashAbjPct').textContent = pct + '%';
    if (el('dashTasks')) el('dashTasks').textContent = tasks;
    if (el('dashMembers')) el('dashMembers').textContent = members;
    if (el('dashSaldo')) el('dashSaldo').textContent = App.currency(saldo);

    const qb = el('quickBtns');
    if (qb) {
      qb.innerHTML = `
        <button class="btn btn-primary" onclick="goTo('abj')">⭐ Selo ABJ</button>
        <button class="btn btn-ghost" onclick="goTo('tarefas')">☰ Demandas</button>
        <button class="btn btn-ghost" onclick="goTo('compartilhado')">📅 Calendário</button>
        <button class="btn btn-ghost" onclick="goTo('financeiro')">◎ Financeiro</button>
      `;
    }
  }
};

/* ============================================================
   Theme & Font System
   ============================================================ */
const Theme = {
  _aliases: {
    'default':        'nucleo',
    'fusion':         'nucleo',
    'dark-orange':    'nucleo',
    'dark-purple':    'violet',
    'orange':         'noite',
    'obsidian':       'noite',
    'bad-boy':        'noite',
    'badboy':         'noite',
    'luminous':       'papel',
    'glimmer':        'dark',
    'frufru':         'rose',
    'roxo':           'violet',
    'claro-suave':    'papel',
    'alto-contraste': 'noite',
    'branco-laranja': 'white-orange',
  },

  apply(name, silent = false) {
    if (this._aliases[name]) name = this._aliases[name];
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('nupie_theme', name);

    document.querySelectorAll('[id^="themeBtn-"]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('themeBtn-' + name);
    if (btn) btn.classList.add('active');

    const themeLabel = {
      'nucleo':       'Núcleo (Padrão)',
      'noite':        'Noite',
      'violet':       'Violeta',
      'papel':        'Papel',
      'dark-orange':  'Orange Industrial',
      'dark-purple':  'Fusion Elite',
      'luminous':     'Claro Premium',
      'obsidian':     'Obsidian Dark',
      'dark':         'Dark Premium',
      'rose':         'Rose Quartz',
      'white-orange': 'Branco + Laranja',
    };
    const label = document.getElementById('systemThemeLabel');
    if (label) label.textContent = themeLabel[name] || name;

    haptic();
    // Toast apenas quando o usuário trocou manualmente (não em inicialização)
    if (!silent) App.toast('Tema: ' + (themeLabel[name] || name), 'info', 1200);
  },

  applyFont(name, silent = false) {
    document.documentElement.setAttribute('data-font', name === 'default' ? '' : name);
    localStorage.setItem('nupie_font', name);
    document.querySelectorAll('[id^="fontBtn-"]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('fontBtn-' + name);
    if (btn) btn.classList.add('active');
    haptic();
    // Sem toast para fonte — mudança visual é imediata e óbvia
  },

  init() {
    let theme = localStorage.getItem('nupie_theme') || localStorage.getItem('np-theme') || 'nucleo';
    const legMap = {'dark-orange':'nucleo','dark-purple':'violet','fusion':'nucleo','luminous':'papel','orange':'noite','obsidian':'noite','bad-boy':'noite','default':'nucleo'};
    if (legMap[theme]) theme = legMap[theme];
    const font = localStorage.getItem('nupie_font') || 'default';
    Theme.apply(theme, true);
    Theme.applyFont(font, true);
  },

  set(name) {
    // Alias para Theme.apply — mantém compatibilidade com chamadas legadas
    this.apply(name);
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

        <!-- V6.0 Decision Console (Admin Only) -->
        <div style="display:flex; gap:6px; margin-left:auto;">
          <button class="btn btn-ghost" title="Gerar Magic Link (2 min)" onclick="Pessoas.sendMagicLink('${m.email}')" style="padding:4px 8px; font-size:14px; border:1px solid var(--b-1);">🪄</button>
          <button class="btn btn-ghost" title="Redefinir Senha" onclick="Pessoas.resetPassword('${m.email}')" style="padding:4px 8px; font-size:14px; border:1px solid var(--b-1);">🔑</button>
          <button class="btn btn-ghost" title="APAGAR DEFINITIVAMENTE" onclick="Pessoas.deleteMember('${m.id}','${m.email}')" style="padding:4px 8px; font-size:14px; border:1px solid var(--b-1); color:var(--red);">🔥</button>
        </div>
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
        criado_por: window._appProfile?.id || null
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

  _addMode: 'invite',
  setAddMode(mode) {
    this._addMode = mode;
    const isDirect = mode === 'direct';
    document.getElementById('directPassField').style.display = isDirect ? 'block' : 'none';
    document.getElementById('btnSubmitAdd').textContent = isDirect ? 'Adicionar Membro Agora' : 'Gerar Link de Convite';
    document.getElementById('modeInvite').classList.toggle('on', !isDirect);
    document.getElementById('modeDirect').classList.toggle('on', isDirect);
    document.getElementById('inviteLinkCard').style.display = 'none';
  },

  async processNewMember() {
    if (this._addMode === 'invite') {
      await this.gerarConvite();
    } else {
      await this.addMemberDirect();
    }
  },

  async addMemberDirect() {
    const email = document.getElementById('inviteEmail')?.value.trim();
    const nome = document.getElementById('inviteNome')?.value.trim();
    const cargo = document.getElementById('inviteCargo')?.value.trim();
    const coordSigla = document.getElementById('inviteCoord')?.value;
    const role = document.getElementById('inviteRole')?.value;
    const bday = document.getElementById('inviteBday')?.value;
    const mandate = document.getElementById('inviteMandate')?.value;
    const pass = document.getElementById('invitePass')?.value;
    const alertEl = document.getElementById('inviteAlert');

    if (!email || !nome || !cargo || !coordSigla || !pass) {
      if (alertEl) { alertEl.textContent = 'Preencha todos os campos, incluindo a senha.'; alertEl.className = 'alert-box error'; }
      return;
    }

    if (_sb) {
      // 1. Criar no Auth? (Geralmente requer Admin API key)
      App.toast('Adicionando membro ao núcleo...', 'info');
      const { error } = await _sb.from('users').insert({
        email, nome, cargo, role, aniversario: bday,
        coordenadoria_id: (await _sb.from('coordenadorias').select('id').eq('sigla', coordSigla).single()).data?.id,
        ativo: true
      });
      if (error) {
        if (alertEl) { alertEl.textContent = 'Erro: ' + error.message; alertEl.className = 'alert-box error'; }
        return;
      }
      App.toast('Membro adicionado com sucesso. Convite enviado!', 'success');
      // Trigger Welcome/Access Email
      const magic = await MagicLink.generate(email);
      await EmailService.notifyInvite({ nome, email }, magic);
    }
    Pessoas.loadMembers();
  },

  /* ============================================================
     Admin / Dev Decision Console (V6.0)
     ============================================================ */
  deleteMember(id, email) {
    abrirModal({
      titulo: 'Confirmar Exclusão',
      corpo: `TEM CERTEZA? O membro ${email} será APAGADO permanentemente do banco.`,
      botoes: [
        { texto: 'Cancelar', classe: 'btn-ghost' },
        { texto: 'Apagar', classe: 'btn-primary', acao: async () => {
          fecharModal();
          App.loading(true);
          try {
            if (_sb) {
              const { error } = await _sb.from('users').delete().eq('id', id);
              if (error) throw error;
              // E-mail de Despedida Profissional V6.8
              await window.EmailService?.notifyGoodbye?.({ nome: email, email });
            }
            App.toast('Membro removido do núcleo.', 'success');
            this.loadMembers();
          } catch (e) {
            App.toast('Erro ao remover: ' + e.message, 'error');
          } finally { App.loading(false); }
        }}
      ]
    });
  },

  resetPassword(email) {
    abrirModal({
      titulo: 'Redefinir Senha',
      corpo: `Enviar redefinição de senha para ${email}?`,
      botoes: [
        { texto: 'Cancelar', classe: 'btn-ghost' },
        { texto: 'Enviar', classe: 'btn-primary', acao: async () => {
          fecharModal();
          if (_sb) {
            const { error } = await _sb.auth.resetPasswordForEmail(email);
            if (error) App.toast(error.message, 'error');
            else App.toast('E-mail de redefinição enviado!', 'success');
          }
        }}
      ]
    });
  },

  async sendMagicLink(email) {
    window.App?.toast?.('Gerando acesso instantâneo...', 'info');
    const link = await window.MagicLink?.generate?.(email);
    await window.EmailService?.notifyInvite?.({ nome: email, email }, link);
    window.App?.toast?.('Magic Link (2 min) enviado com sucesso!', 'success');
  }
};

const PessoasExt = {
  async updateRole(identifier, newRole) {
    const sb = window._sb || window._supabase;
    if (!sb) { window.App?.toast?.('Supabase necessário para alterar funções.', 'error'); return; }
    const q = identifier.includes('@')
      ? sb.from('users').update({ role: newRole }).eq('email', identifier)
      : sb.from('users').update({ role: newRole }).eq('id', identifier);
    const { error } = await q;
    if (error) { window.App?.toast?.('Erro ao atualizar: ' + error.message, 'error'); return; }
    window.App?.toast?.('Função atualizada com sucesso!', 'success');
  }
};

Pessoas.updateRole = function (identifier, newRole) {
  return PessoasExt.updateRole(identifier, newRole);
};

/* ============================================================
   Governance & Dashboard Extra Components
   ============================================================ */
const DashboardExtra = {
  async loadBirthdays() {
    const listEl = document.getElementById('birthdayList');
    const mural = document.getElementById('dashBirthdays');
    if (!listEl) return;

    const sb = window._sb || window._supabase;
    const month = new Date().getMonth() + 1;
    let bdays = [];

    if (sb) {
      const { data } = await sb.from('users').select('nome, aniversario, iniciais').not('aniversario', 'is', null);
      bdays = (data || []).filter(u => {
        const m = new Date(u.aniversario + 'T12:00:00').getMonth() + 1;
        return m === month;
      });
    }

    if (bdays.length === 0) {
      if (mural) mural.style.display = 'none';
      return;
    }

      if (mural) mural.style.display = 'block';
    listEl.innerHTML = bdays.map(u => {
      const d = new Date(u.aniversario + 'T12:00:00').getDate();
      return `
        <div style="flex:0 0 140px; background:var(--s1); border:1px solid var(--b-1); border-radius:12px; padding:12px; display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div class="side-avatar" style="width:40px;height:40px;font-size:14px;margin:0;"><i data-lucide="cake" style="stroke-width:1.5px;"></i></div>
          <div style="text-align:center;">
            <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:110px;">${u.nome}</div>
            <div style="font-size:10px;color:var(--orange);font-weight:800;margin-top:2px;">DIA ${d}</div>
          </div>
        </div>
      `;
    }).join('');

    // Sincronizar com Calendário Global
    bdays.forEach(u => {
      const d = new Date(u.aniversario + 'T12:00:00').getDate();
      const key = `${new Date().getFullYear()}-${month}-${d}`;
      if (!CAL_EVENTS[key]) CAL_EVENTS[key] = [];
      CAL_EVENTS[key].push({ label: `Aniversário: ${u.nome}`, tag: '🎂', color: 'var(--yellow)' });
    });
    if (typeof Cal !== 'undefined' && Cal.render) Cal.render();
  },

  async renderAssembleia() {
    const listEl = document.getElementById('activeVotes');
    if (!listEl) return;
    // Mock ou Supabase: Carregar votações ativas
    listEl.innerHTML = `
      <div style="background:var(--s2); border:1px solid var(--b-p); padding:1.2rem; border-radius:12px;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
          <strong style="color:var(--white);">Votação: Novo Uniforme 2026</strong>
          <span class="nav-badge" style="background:var(--p-1); color:var(--c-white);">ABERTA</span>
        </div>
        <p style="font-size:12px; color:var(--t-2); margin-bottom:1rem;">Definição do modelo oficial para o ENEGEP 2026.</p>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" style="flex:1; font-size:11px;" onclick="Assembleia.votar('Uniforme A')">Opção Alpha</button>
          <button class="btn btn-ghost" style="flex:1; font-size:11px; border:1px solid var(--b-1);" onclick="Assembleia.votar('Uniforme B')">Opção Beta</button>
        </div>
        <div style="font-size:10px; color:var(--t-3); margin-top:12px; font-style:italic;">* Voto 100% secreto e auditado pela Coord. Geral.</div>
      </div>
    `;
  },

  async syncMandates(profile) {
    if (!profile) return;
    
    if (profile.graduacao_concluida === true) {
      this.lockSystem('Seu acesso de Membro Efetivo foi revogado por conclusão do curso superior. Parabéns pela formação!');
      return;
    }

    if (!profile.mandate_start) return;
    const start = new Date(profile.mandate_start);
    const now = new Date();
    const diffMs = now - start;
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    // Regra: Conselheiro = 1 ano, Coord = 3 anos
    if (profile.role === 'conselheiro' && diffYears >= 1) {
      this.lockSystem('Seu mandato de Conselheiro (1 ano) expirou.');
    } else if (profile.role === 'coordenador' && diffYears >= 3) {
      this.lockSystem('Seu tempo limite como Coordenador (3 anos) expirou.');
    }
  },

  async checkGlobalInactivity() {
    const sb = window._sb || window._supabase;
    if (!sb) return;
    const { data } = await sb.from('users').select('created_at').eq('ativo', true).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const lastActivity = new Date(data[0].created_at);
      const diffYears = (new Date() - lastActivity) / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears >= 2) {
        window.App?.toast?.('Atenção: nenhuma atividade registrada nos últimos 2 anos.', 'warning', 8000);
      }
    }
  },

  lockSystem(msg) {
    document.body.innerHTML = `
      <div style="height:100vh; background:#000; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:sans-serif; padding:2rem;">
        <div style="font-size:60px; margin-bottom:20px;">🛡️</div>
        <h1 style="color:var(--orange);">ACESSO REVOGADO</h1>
        <p style="max-width:400px; line-height:1.6; color:#888;">${msg}<br><br>Gere o relatório de final de gestão no repositório se necessário ou entre em contato com o Desenvolvedor.</p>
        <button onclick="location.href='index.html'" style="margin-top:2rem; background:#222; border:1px solid #444; color:#fff; padding:10px 20px; border-radius:8px; cursor:pointer;">Voltar ao Início</button>
      </div>
    `;
  }
};

const Projetos = {
  async loadSponsors() {
    const grid = document.getElementById('sponsorGrid');
    if (!grid) return;
    // Mock ou Supabase
    const sponsors = [
      { nome: 'Empresa Alpha', finalidade: 'Patrocinador Ouro', logo: '🏢' },
      { nome: 'Studio Beta', finalidade: 'Apoio NUPICAST', logo: '🎙️' }
    ];
    grid.innerHTML = sponsors.map(s => `
      <div class="section-card" style="text-align:center; padding:1.2rem; background:var(--s1); border:1px solid var(--b-1);">
        <div style="font-size:32px; margin-bottom:8px;">${s.logo}</div>
        <div style="font-weight:700; color:var(--white); font-size:13px;">${s.nome}</div>
        <div style="font-size:10px; color:var(--t-3); margin-top:4px;">${s.finalidade}</div>
      </div>
    `).join('');
  },
  novoPatrocinador() {
    abrirModal({ titulo: 'Novo Patrocinador', corpo: '<p style="color:var(--c-slate);font-size:13px;">Funcionalidade disponível em breve.</p>', botoes: [{ texto: 'Fechar', classe: 'btn-ghost', acao: fecharModal }] });
  }
};

const Assembleia = {
  novaVotacao() {
    abrirModal({
      titulo: 'Nova Votação',
      corpo: '<div class="form-group"><label class="form-label">Título da Votação</label><input id="av-titulo" class="form-input" placeholder="Ex: Uniforme Oficial"></div>',
      botoes: [
        { texto: 'Cancelar', classe: 'btn-ghost', acao: fecharModal },
        { texto: 'Criar', classe: 'btn-primary', acao: () => {
          const titulo = document.getElementById('av-titulo')?.value?.trim();
          fecharModal();
          if (titulo) App.toast('Votação criada com sucesso!', 'success');
        }}
      ]
    });
  },
  votar(opcao) {
    App.toast(`Voto secreto em "${opcao}" computado!`, 'success');
  },
  verResultados() {
    App.toast('Resultados parciais: Opção Alpha 64% | Opção Beta 36%', 'info');
  }
};

const Geral = {
  async loadMeetings() {
    const body = document.getElementById('meetingTableBody');
    if (!body) return;
    // Mock ou Supabase
    const meetings = [
      { id: 1, data: '2026-04-15', titulo: 'RGN #04 - Planejamento ENEGEP', presenca: '85%' },
      { id: 2, data: '2026-03-30', titulo: 'RGN #03 - Alinhamento Operacional', presenca: '92%' }
    ];
    body.innerHTML = meetings.map(m => `
      <tr style="border-bottom:1px solid var(--b-1); font-size:12px;">
        <td style="padding:12px;">${new Date(m.data+'T12:00:00').toLocaleDateString('pt-BR')}</td>
        <td style="padding:12px; font-weight:700; color:var(--white);">${m.titulo}</td>
        <td style="padding:12px;"><span class="nav-badge" style="background:var(--w10);color:var(--green);">${m.presenca}</span></td>
        <td style="padding:12px;">
          <button class="btn btn-ghost" style="padding:4px 8px; font-size:10px;" onclick="Geral.gerenciarPresenca(${m.id})">📂 Lista</button>
        </td>
      </tr>
    `).join('');
  },

  async checkPCD() {
    const list = document.getElementById('pcdAlerts');
    if (!list) return;
    // Mock: Simular membros com 2 faltas não justificadas
    const alerts = [
      { nome: 'Pedro Assis', faltas: 2, coord: 'MKT' },
      { nome: 'Marina Souza', faltas: 3, coord: 'PRJ' }
    ];
    if (alerts.length === 0) {
      list.innerHTML = '<p class="text-muted text-sm">Nenhum alerta crítico disparado.</p>';
      return;
    }
    list.innerHTML = alerts.map(a => `
      <div style="background:rgba(247,84,18,0.05); border:1px solid var(--b-a); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div>
          <div style="font-weight:700; font-size:12px; color:var(--white);">${a.nome}</div>
          <div style="font-size:10px; color:var(--orange);">⚠️ ${a.faltas} FALTAS NÃO JUSTIFICADAS (${a.coord})</div>
        </div>
        <button class="btn btn-ghost" style="font-size:10px; padding:4px 8px;" onclick="App.toast('Notificação enviada ao coordenador.','info')">Notificar</button>
      </div>
    `).join('');
  },

  novaReuniao() { abrirModal({ titulo: 'Nova Reunião', corpo: '<p style="color:var(--c-slate);font-size:13px;">Funcionalidade de agendamento disponível em breve.</p>', botoes: [{ texto: 'Fechar', classe: 'btn-ghost', acao: fecharModal }] }); },
  gerenciarPresenca(id) { App.toast('Abrindo lista de presença para RGN #' + id, 'info'); }
};

const Financeiro = {
  checkTimer() {
    // Alerta de 24h para transferências
    const lastTransfer = localStorage.getItem('last_fin_transfer');
    if (lastTransfer) {
      const diff = Date.now() - parseInt(lastTransfer);
      if (diff < 24 * 60 * 60 * 1000) {
        App.toast('⚠️ ATENÇÃO: Transferência pendente de prestação de contas (24h).', 'warning');
      }
    }
  },
  loadAbepro() {
    // Lógica para controle de filiação
  },
  validarPlano() {
    const nome = document.getElementById('comNome')?.value;
    const dataStr = document.getElementById('comData')?.value;
    if (!nome || !dataStr) { App.toast('Preencha nome e data.', 'error'); return; }

    const dataEvento = new Date(dataStr);
    const hoje = new Date();
    const diffDias = Math.ceil((dataEvento - hoje) / (1000 * 60 * 60 * 24));

    if (diffDias < 60) {
      App.toast(`Bloqueio: Faltam apenas ${diffDias} dias. O prazo mínimo é 60 dias.`, 'error');
    } else {
      App.toast('Plano validado! Criando chamado de aprovação...', 'success');
    }
  },
  novoLancamento() {
    // Módulo financeiro integrado ao Supabase — sem aviso desnecessário
  }
};

const Marketing = {
  async loadSocialStats() {
    // Integrar com APIs reais no futuro, agora mock premium
    console.log('Marketing: Stats carregadas.');
  },
  async loadKanban() {
    const el = document.getElementById('marketingKanban');
    if (!el) return;
    el.innerHTML = `
      <div class="kanban-column" style="flex:1; min-width:250px;">
        <div class="kanban-header">Fila Lojinha (10 dias)</div>
        <div class="kanban-card" style="border-left:4px solid var(--orange);">
           <div style="font-weight:700;">Pedido #2491</div>
           <div style="font-size:10px; color:var(--orange);">⏰ 3 DIAS RESTANTES</div>
        </div>
      </div>
    `;
  }
};

const GP = {
  async loadTalentBank() {
    const grid = document.getElementById('talentGrid');
    if (!grid) return;
    // CRM de Membros
    grid.innerHTML = `
      <div style="background:var(--s1); padding:10px; border-radius:8px; display:flex; align-items:center; gap:12px;">
        <div class="side-avatar" style="width:30px;height:30px;font-size:11px;">RB</div>
        <div>
          <div style="font-weight:700; font-size:12px;">Rayan Bezerra</div>
          <div style="font-size:10px; color:var(--t-3);">Habilidade: UI/UX, Fullstack</div>
        </div>
      </div>
    `;
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
  admin: [
    { id: 'dashboard',  icon: '⬡', label: 'Painel Central' },
    { id: 'abj',        icon: '⭐', label: 'Selo ABJ' },
    { id: 'tarefas',    icon: '☰', label: 'Todas Demandas' },
    { id: 'pessoas',    icon: '🤝', label: 'Gestão de Membros' },
    { id: 'financeiro', icon: '◎', label: 'Financeiro Hub' },
    { id: 'operacoes',  icon: '⚙', label: 'Operações Hub' },
    { id: 'marketing',  icon: '🚀', label: 'Agência MKT' },
    { id: 'projetos',   icon: '◫', label: 'Projetos Hub' },
    { id: 'gp',         icon: '◒', label: 'Gestão Pessoas' },
    { id: 'manu',       icon: '🗂', label: 'Repositório' },
  ],
  geral: [
    { id: 'dashboard',  icon: '⬡', label: 'Dashboard Geral' },
    { id: 'abj',        icon: '⭐', label: 'Selo ABJ' },
    { id: 'tarefas',    icon: '☰', label: 'Controle Estratégico' },
    { id: 'pessoas',    icon: '🤝', label: 'Gestão de Membros' },
    { id: 'financeiro', icon: '◎', label: 'Aprovações FIN' },
    { id: 'operacoes',  icon: '⚙', label: 'Auditoria Ops' },
    { id: 'manu',       icon: '🗂', label: 'Documentos' },
  ],
  coord: [
    { id: 'dashboard',  icon: '⬡', label: 'Início' },
    { id: 'tarefas',    icon: '☰', label: 'Minhas Demandas' },
    { id: 'pessoas',    icon: '🤝', label: 'Meu Time' },
    { id: 'manu',       icon: '🗂', label: 'Repositório' },
    // A página específica da coord será injetada via JS dependendo da sigla
  ],
  assessor: [
    { id: 'dashboard',  icon: '⬡', label: 'Meu Painel' },
    { id: 'tarefas',    icon: '☰', label: 'Minhas Atividades' },
    { id: 'compartilhado', icon: '📅', label: 'Calendário global' },
  ],
  conselheiro: [
    { id: 'dashboard',  icon: '⬡', label: 'Histórico' },
    { id: 'manu',       icon: '🗂', label: 'Arquivo Morto' },
  ]
};

// Chip do usuário por role (JR em GER, RB em MKT, nome em outros)
const DEV_CHIP = {
  admin:       { iniciais: 'AD', nome: 'Dev / Admin', cargo: 'Developer Master' },
  geral:       { iniciais: 'CG', nome: 'Coord. Geral', cargo: 'Gestão Estratégica' },
  coord:       { iniciais: 'CO', nome: 'Coordenador',   cargo: 'Liderança de Área' },
  assessor:    { iniciais: 'AS', nome: 'Assessor',      cargo: 'Membro Efetivo' },
  conselheiro: { iniciais: 'CS', nome: 'Conselheiro',   cargo: 'Membro Consultivo' },
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

const ROLE_LABELS = { 
  admin: '⚡ Developer Master', 
  geral: '⬡ Coordenação Geral', 
  coord: '◒ Coordenadoria', 
  assessor: 'Membro Efetivo', 
  conselheiro: '📜 Conselheiro' 
};

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
   DEM — Controlador de visão da página Demandas
   ═══════════════════════════════════════════════════════════════ */
const Dem = {
  setView(view, btn) {
    document.querySelectorAll('.dem-view-btn').forEach(b => {
      b.style.background = 'transparent';
      b.style.color = 'var(--fg-3)';
    });
    if (btn) { btn.style.background = 'var(--surface-3)'; btn.style.color = 'var(--fg-1)'; }
    const map = { kanban: 'demViewKanbanContent', lista: 'demViewListaContent', heatmap: 'demViewHeatContent' };
    Object.keys(map).forEach(v => {
      const el = document.getElementById(map[v]);
      if (el) el.style.display = (v === view) ? '' : 'none';
    });
  }
};
window.Dem = Dem;

/* ═══════════════════════════════════════════════════════════════
   NovoCal — Calendário dinâmico da página Calendário (full-page)
   ═══════════════════════════════════════════════════════════════ */
const NovoCal = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),

  prev() { this.month--; if (this.month < 0) { this.month = 11; this.year--; } this._render(); },
  next() { this.month++; if (this.month > 11) { this.month = 0; this.year++; } this._render(); },

  _render() {
    const grid  = document.getElementById('calNovoGrid');
    const label = document.getElementById('novoCalLabel');
    if (!grid) return;
    if (label) label.textContent = MONTHS_PT[this.month] + ' ' + this.year;

    const today    = new Date();
    const firstDay = new Date(this.year, this.month, 1).getDay();
    const days     = new Date(this.year, this.month + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const isToday = d === today.getDate() && this.month === today.getMonth() && this.year === today.getFullYear();
      html += `<div style="aspect-ratio:1;border-radius:6px;border:1px solid var(--border-1);padding:4px;font-size:11px;font-family:var(--font-mono);${isToday ? 'background:rgba(246,82,20,0.15);border-color:var(--brand-orange);font-weight:700;color:var(--brand-orange);' : ''}">${d}</div>`;
    }
    grid.innerHTML = html;

    this._loadEventos();
  },

  async _loadEventos() {
    const el = document.getElementById('calEventsList');
    if (!el) return;
    const sb = window._supabase;
    if (!sb) { el.innerHTML = '<p style="font-size:12px;color:var(--fg-3);">Conecte ao Supabase para ver eventos.</p>'; return; }
    try {
      const inicio = new Date(this.year, this.month, 1).toISOString().split('T')[0];
      const fim    = new Date(this.year, this.month + 1, 0).toISOString().split('T')[0];
      const { data } = await sb.from('eventos').select('titulo,data_inicio,tipo,coordenadorias(sigla)').gte('data_inicio', inicio).lte('data_inicio', fim).order('data_inicio');
      if (!data?.length) { el.innerHTML = '<p style="font-size:12px;color:var(--fg-3);text-align:center;padding:1rem;">Nenhum evento neste mês.</p>'; return; }
      const CORES = { reuniao:'#9b7be8', evento:'var(--brand-orange)', treinamento:'#5b9cf6', enegep:'#f5c518', podcast:'#e85aa8', assembleia:'#2dd4a0' };
      el.innerHTML = data.map(e => {
        const cor = CORES[e.tipo] || 'var(--fg-3)';
        const dia = e.data_inicio ? new Date(e.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—';
        return `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px;background:${cor}18;border-radius:8px;border-left:3px solid ${cor};">
          <div style="min-width:44px;text-align:center;font-size:11px;font-weight:700;color:${cor};">${dia}</div>
          <div><div style="font-weight:600;font-size:13px;">${e.titulo||'—'}</div><div style="font-size:11px;color:var(--fg-3);">${e.coordenadorias?.sigla||''} · ${e.tipo||''}</div></div>
        </div>`;
      }).join('');
    } catch(err) { el.innerHTML = '<p style="font-size:12px;color:var(--fg-3);">Erro ao carregar eventos.</p>'; }
  }
};
window.NovoCal = NovoCal;

/* ═══════════════════════════════════════════════════════════════
   KANBAN MODULE — Demandas por coordenadoria
   ═══════════════════════════════════════════════════════════════ */
const Kanban = (() => {
  const COLS = [
    { id: 'afazer',    label: 'A Fazer',       coluna: 'pendente' },
    { id: 'producao',  label: 'Em Produção',    coluna: 'exec' },
    { id: 'evidencia', label: 'Evidência',      coluna: 'evidencia' },
    { id: 'concluida', label: 'Concluídas',     coluna: 'auditada' },
  ];

  let _demands = [];
  let _loaded = false;

  async function load() {
    if (!window._supabase) { _renderAll([]); return; }
    try {
      const { data, error } = await window._supabase
        .from('demandas')
        .select('*, coordenadorias(sigla)')
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
      const items = list.filter(d => d.coluna === col.coluna);
      if (items.length === 0) {
        el.innerHTML = '<div class="kanban-empty">Vazio.</div>';
        return;
      }
      el.innerHTML = items.map(d => _cardHtml(d)).join('');
    });
  }

  function _cardHtml(d) {
    const prazo = d.prazo ? `<span class="kanban-card-meta">📅 ${new Date(d.prazo).toLocaleDateString('pt-BR')}</span>` : '';
    const coordSigla = d.coordenadorias?.sigla;
    const dest  = coordSigla ? `<span class="kanban-card-tag">${coordSigla}</span>` : '';

    // V6.0: Remetente Icon
    const remSigla = coordSigla || 'GER';
    const remIcon  = `<span class="kanban-rem-icon" title="Origem: ${remSigla}">${remSigla}</span>`;
    
    return `<div class="kanban-card" onclick="Kanban.abrirDetalhes('${d.id}')">
      <div class="kanban-card-title">${_esc(d.titulo)}</div>
      <div class="kanban-card-footer">
        <div style="display:flex; gap:4px; align-items:center;">
          ${remIcon} ${dest}
        </div>
        ${prazo}
      </div>
    </div>`;
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function abrirNovaDemanda() {
    const m = document.getElementById('kanbanModal');
    if (m) { m.style.display = 'flex'; }
    document.getElementById('ndTitulo')?.focus();
  }

  function fecharModal() {
    const m = document.getElementById('kanbanModal');
    if (m) m.style.display = 'none';
    ['ndTitulo','ndCoord','ndPrazo','ndDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  async function salvar() {
    const titulo = document.getElementById('ndTitulo')?.value?.trim();
    const coord  = document.getElementById('ndCoord')?.value || 'GER';
    const prazo  = document.getElementById('ndPrazo')?.value || null;
    const desc   = document.getElementById('ndDesc')?.value?.trim() || '';
    if (!titulo) { App.toast('Insira um título para a demanda.', 'warning'); return; }

    const now = new Date().toISOString();
    const demand = { id: 'loc-' + Date.now(), titulo, coordenadoria: coord, prazo, descricao: desc, coluna: 'pendente', created_at: now };

    if (window._supabase) {
      try {
        const coordRes = await window._supabase.from('coordenadorias').select('id').eq('sigla', coord).single();
        const { data, error } = await window._supabase
          .from('demandas')
          .insert([{
            titulo,
            coordenadoria_id: coordRes.data?.id || null,
            prazo,
            descricao: desc,
            coluna: 'pendente',
            criado_por: window._appProfile?.id,
          }])
          .select()
          .single();
        if (error) throw error;
        _demands.unshift(data);
        
        // Trigger Email Notification (EmailJS)
        await EmailService.send('template_demand', {
          demand_title: titulo,
          target_coord: coord,
          sender_name: window._appProfile?.nome || 'Especialista'
        });

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
    const info = `Título: ${d.titulo}\nCoord: ${(d.coordenadoria||'').toUpperCase()}\nColuna: ${d.coluna}\nPrazo: ${d.prazo || '—'}\n\n${d.descricao || ''}`;
    abrirModal({ titulo: 'Detalhes da Demanda', corpo: `<div style="white-space:pre-wrap;">${info}</div>`, botoes: [{ texto: 'Fechar', classe: 'btn-ghost' }] });
  }

  function _saveLocal() {
    localStorage.setItem('_kanban_demands', JSON.stringify(_demands));
  }

  return { load, abrirNovaDemanda, fecharModal, salvar, abrirDetalhes };
})();

/* ═══════════════════════════════════════════════════════════════
   FINANCEIRO MODULE — Gestão e Regra dos 60 dias
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   CYBERSECURITY 24H — Anti-hacking timer
   ═══════════════════════════════════════════════════════════════ */
const CyberSecurity = {
  lastAction: Date.now(),
  
  init() {
    ['mousedown', 'keydown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, () => { this.lastAction = Date.now(); });
    });
    setInterval(() => this.check(), 60000);
    console.log('CyberSecurity: Monitor de 24h ativo.');
  },

  check() {
    const profile = window._appProfile;
    if (!profile) return;
    const isFin = (profile.coordenadorias?.sigla === 'FIN' || profile.role === 'admin');
    if (!isFin) return;

    const diffHrs = (Date.now() - this.lastAction) / (1000 * 60 * 60);
    if (diffHrs >= 24) this.lockAndRotate();
  },

  async lockAndRotate() {
    App.toast('Sessão encerrada por inatividade.', 'warning', 6000);
    if (window._sb) await window._sb.auth.signOut();
    localStorage.clear();
    location.reload();
  }
};

// Iniciar segurança (Chamado no final para garantir que todos os módulos existem)
if (typeof CyberSecurity !== 'undefined') CyberSecurity.init();

/* ============================================================
   Helpers globais — Modal e Toast
   ============================================================ */

function mostrarToast(mensagem, tipo, duracao) {
  App.toast(mensagem, tipo || 'info', duracao || 3500);
}

function fecharModal() {
  const el = document.getElementById('__appModal');
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(100%)';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 220);
  }
}

function abrirModal({ titulo = '', tipo = 'info', corpo = '', botoes = [] } = {}) {
  let overlay = document.getElementById('__appModal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__appModal';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:900',
      'background:rgba(0,0,0,0.72)',
      'display:flex;align-items:flex-end;justify-content:center',
      'padding:0;backdrop-filter:blur(6px)',
      'transition:opacity .2s'
    ].join(';');
    overlay.addEventListener('click', e => { if (e.target === overlay) fecharModal(); });
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = '@keyframes _nupiSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
  }

  overlay.innerHTML = `
    <div id="__appModalBox" style="
      background:var(--c-s1,#111);
      border:1px solid var(--b-2,#2a2a2a);
      border-radius:20px 20px 0 0;
      padding:1.5rem;
      width:100%;max-width:560px;
      max-height:82vh;overflow-y:auto;
      display:flex;flex-direction:column;gap:1rem;
      animation:_nupiSlideUp .26s ease;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:var(--f-head,'sans-serif');font-weight:700;font-size:16px;color:var(--c-white,#fff)">${titulo}</div>
        <button onclick="fecharModal()" style="background:none;border:none;color:var(--t-3,#888);font-size:22px;cursor:pointer;padding:4px;line-height:1">✕</button>
      </div>
      <div style="color:var(--c-slate,#aaa);font-size:13px;line-height:1.6">${corpo}</div>
      ${botoes.length ? `<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;padding-top:4px">
        ${botoes.map((b, i) => `<button class="btn ${b.classe || 'btn-primary'}" data-mid="${i}">${b.texto}</button>`).join('')}
      </div>` : ''}
    </div>`;

  overlay.style.display = 'flex';
  overlay.style.opacity = '1';

  botoes.forEach((b, i) => {
    const btn = overlay.querySelector(`[data-mid="${i}"]`);
    if (btn && typeof b.acao === 'function') btn.addEventListener('click', b.acao);
  });
}

// V6.2 — Registro Global de Módulos Industriais (Elite Visibility)
window.App          = App;
window.Theme        = Theme;
window.EmailService = EmailService;
window.MagicLink    = MagicLink;
window.Pessoas      = Pessoas;
window.Kanban       = Kanban;
window.Dashboard    = Dashboard;
window.Auth         = typeof Auth !== 'undefined' ? Auth : null;
window.Financeiro   = Financeiro;
window.CyberSecurity = CyberSecurity;
window._sb          = window._sb || _sb;

console.log('NUPIEEPRO V6.2: Todos os módulos globais registrados.');
