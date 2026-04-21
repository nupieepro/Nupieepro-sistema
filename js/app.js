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
  const icons = {
    'layout-dashboard': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    'user-cog': '<circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 14.3 1-.4"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.1 6.27a2 2 0 0 0 0 3.46l9.07 4.09a2 2 0 0 0 1.66 0l9.07-4.09a2 2 0 0 0 0-3.46z"/><path d="m2.1 14.73 9.07 4.09a2 2 0 0 0 1.66 0l9.07-4.09"/><path d="m2.1 10.58 9.07 4.09a2 2 0 0 0 1.66 0l9.07-4.09"/>',
    component: '<path d="M5.5 8.5 2 12l3.5 3.5L9 12Z"/><path d="m15 5 3.5 3.5L22 12l-3.5 3.5L15 19l-3.5-3.5L8 12l3.5-3.5Z"/><path d="m11.5 15.5 3.5 3.5 3.5-3.5L15 12Z"/><path d="m11.5 8.5 3.5-3.5 3.5 3.5L15 12Z"/>',
    'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M12 17H2l.5 2h19l.5-2H12z"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2.01c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-2.5 5-2.5"/><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 2.5-5 2.5-5"/>',
    layout: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93l-1-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>'
  };
  return `<svg data-lucide="${name}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}">${icons[name] || ''}</svg>`;
}

// Pages each coord can access
const ROLE_PAGES = {
  'Geral':      [
    { id: 'dashboard', icon: 'grid', label: 'Painel Central' },
    { id: 'abj',       icon: 'star', label: 'Selo ABJ', badge: '!' },
    { id: 'tarefas',   icon: 'list', label: 'Todas Demandas' },
    { id: 'manu',      icon: 'folder', label: 'Repositório Central' },
  ],
  'Operações':  [
    { id: 'operacoes', icon: 'settings', label: 'Operações Hub' },
    { id: 'tarefas',   icon: 'list',     label: 'Processos' },
  ],
  'G. Pessoas': [
    { id: 'pessoas',   icon: 'users',    label: 'Membros e G.P' },
    { id: 'tarefas',   icon: 'list',     label: 'Tarefas G.P' },
  ],
  'Marketing':  [
    { id: 'marketing', icon: 'megaphone',label: 'Agência MKT' },
    { id: 'tarefas',   icon: 'list',     label: 'Demandas MKT' },
  ],
  'Projetos':   [
    { id: 'projetos',  icon: 'layout',   label: 'Ações Projetos' },
    { id: 'tarefas',   icon: 'list',     label: 'Tarefas PRJ' },
  ],
  'Finanças':   [
    { id: 'financeiro', icon: 'banknote', label: 'Teses Financeiras' },
    { id: 'tarefas',   icon: 'list',     label: 'Tarefas FIN' },
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
      .select('*, coordenadorias(nome, sigla, icon)')
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
    
    const myPages = profile?.role === 'admin' 
      ? Object.values(ROLE_PAGES).flat().filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)
      : ROLE_PAGES[roleKey] || [];

    let html = '<div class="sidebar-section">Meu painel</div>';
    html += myPages.map(p => 
      `<div class="nav-item" id="nav-${p.id}" onclick="goTo('${p.id}')">
        <span class="nav-icon">${getIcon(p.icon)}</span>
        <span class="nav-label">${p.label}</span>
        ${p.badge ? `<span class="nav-badge">${p.badge}</span>` : ''}
      </div>`
    ).join('');

    html += '<div class="sidebar-section">Operacional</div>';
    html += `<div class="nav-item" style="background:var(--orange-dim);border-color:var(--orange-border);color:var(--orange)" onclick="App.toast('Módulo ABJ Ativado','info')">
      <span class="nav-icon">${getIcon('star')}</span>
      <span class="nav-label" style="color:var(--orange)">Inserir Atividade ABJ</span>
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
  },

  /** Build mobile bottom nav */
  buildMobileNav(coordName) {
    const mobileNav = document.getElementById('mobileNav');
    if (!mobileNav) return;

    const myPages = (ROLE_PAGES[coordName] || []).slice(0, 5);
    mobileNav.innerHTML = myPages.map(p =>
      `<div class="mnav-item" onclick="goTo('${p.id}')">
        <span class="mnav-icon">${getIcon(p.icon)}</span>
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
    const userRoleLabel = (profile.coordenadorias?.sigla === 'MKT') ? 'Assessor & Dev' : (profile.cargo || profile.role || 'Membro');
    document.getElementById('sideAvatar').textContent = profile.iniciais || profile.nome?.[0] || '?';
    document.getElementById('sideName').textContent   = profile.nome || 'Usuário';
    document.getElementById('sideRole').textContent   = userRoleLabel + ' · ' + coordName;

    App.buildSidebar(coordName);
    App.buildMobileNav(coordName);

    // Exibe links OPS apenas para coordenadores de ops ou admin/dev
    const isOps = profile.role === 'admin' || (profile.coordenadorias?.sigla || '').toUpperCase() === 'OPS';
    const opsSection = document.getElementById('opsLinksSection');
    if (opsSection) opsSection.style.display = isOps ? 'contents' : 'none';

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
  haptic();
  ALL_PAGES.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.remove('active');
  });
  const pg = document.getElementById('page-' + id);
  if (pg) {
    pg.classList.add('active');
    // MASTER RESET: Garante que a página comece do topo ao navegar
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
  if (id === 'pessoas') Pessoas.loadMembers();
  if (id === 'tarefas') Kanban.load();
  if (id === 'abj')     ABJ.init();
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
      Dashboard.renderDemo(profile);
      return;
    }

    try {
      // Fetch KPIs in parallel
      const [abjRes, tasksRes, membersRes, vendasRes, despesasRes] = await Promise.all([
        _sb.from('progresso_abj').select('pontos'),
        _sb.from('demandas').select('status').neq('status', 'auditada'),
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
    if (name === 'default') name = 'orange'; // Fallback industrial
    document.documentElement.setAttribute('data-theme', name);
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
      App.toast('Adicionando membro ao núcleo...', 'loading');
      const { error } = await _sb.from('users').insert({
        email, nome, cargo, role, nascimento: bday, mandate_start: mandate,
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
  async deleteMember(id, email) {
    if (!confirm(`TEM CERTEZA? O membro ${email} será APAGADO permanentemente do banco.`)) return;
    App.loading(true);
    try {
      if (_sb) {
        const { error } = await sb.from('users').delete().eq('id', id);
        if (error) throw error;
        // E-mail de Despedida Profissional V6.8
        await window.EmailService?.notifyGoodbye?.({ nome: email, email });
      }
      App.toast('Membro removido do núcleo.', 'success');
      this.loadMembers();
    } catch (e) {
      App.toast('Erro ao remover: ' + e.message, 'error');
    } finally { App.loading(false); }
  },

  async resetPassword(email) {
    if (!confirm(`Enviar redefinição de senha para ${email}?`)) return;
    if (_sb) {
      const { error } = await _sb.auth.resetPasswordForEmail(email);
      if (error) App.toast(error.message, 'error');
      else App.toast('E-mail de redefinição enviado!', 'success');
    }
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
      const { data } = await sb.from('users').select('nome, nascimento, iniciais').not('nascimento', 'is', null);
      bdays = (data || []).filter(u => {
        const m = new Date(u.nascimento + 'T12:00:00').getMonth() + 1;
        return m === month;
      });
    }

    if (bdays.length === 0) {
      if (mural) mural.style.display = 'none';
      return;
    }

    if (mural) mural.style.display = 'block';
    listEl.innerHTML = bdays.map(u => {
      const d = new Date(u.nascimento + 'T12:00:00').getDate();
      return `
        <div style="flex:0 0 140px; background:var(--s1); border:1px solid var(--b-1); border-radius:12px; padding:12px; display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div class="side-avatar" style="width:40px;height:40px;font-size:14px;margin:0;">${u.iniciais}</div>
          <div style="text-align:center;">
            <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:110px;">${u.nome}</div>
            <div style="font-size:10px;color:var(--orange);font-weight:800;margin-top:2px;">DIA ${d}</div>
          </div>
        </div>
      `;
    }).join('');

    // Sincronizar com Calendário Global
    bdays.forEach(u => {
      const d = new Date(u.nascimento + 'T12:00:00').getDate();
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
    if (!profile || !profile.mandate_start) return;
    const start = new Date(profile.mandate_start);
    const now = new Date();
    const diffMs = now - start;
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    // Regra: Conselheiro = 1 ano, Coord = 3 anos
    if (profile.role === 'conselheiro' && diffYears >= 1) {
      this.lockSystem('Seu mandato de Conselheiro (1 ano) expirou.');
    } else if (profile.role === 'coord' && diffYears >= 3) {
      this.lockSystem('Seu mandato de Coordenador (3 anos) expirou.');
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
    App.toast('Módulo de Upload em construção...', 'info');
  }
};

const Assembleia = {
  novaVotacao() {
    const titulo = prompt('Título da Votação:');
    if (titulo) App.toast('Votação criada com sucesso!', 'success');
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

  novaReuniao() { App.toast('Módulo de agendamento em construção...', 'info'); },
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
    const dest  = d.coordenadoria ? `<span class="kanban-card-tag">${d.coordenadoria.toUpperCase()}</span>` : '';
    
    // V6.0: Remetente Icon
    const remSigla = d.coord_remetente || 'GER';
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
    if (!titulo) { alert('Insira um título para a demanda.'); return; }

    const now = new Date().toISOString();
    const demand = { id: 'loc-' + Date.now(), titulo, coordenadoria: coord, prazo, descricao: desc, status: 'pendente', created_at: now };

    if (window._supabase) {
      try {
        const creator = window._appProfile?.email || 'desconhecido';
        const remCoord = window._appProfile?.coordenadorias?.sigla || 'GER';

        const { data, error } = await window._supabase
          .from('demandas')
          .insert([{ 
            titulo, 
            coordenadoria: coord, 
            prazo, 
            descricao: desc, 
            status: 'pendente',
            criado_por: creator,
            coord_remetente: remCoord
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
    const info = `Título: ${d.titulo}\nCoord: ${(d.coordenadoria||'').toUpperCase()}\nStatus: ${d.status}\nPrazo: ${d.prazo || '—'}\n\n${d.descricao || ''}`;
    alert(info);
  }

  function _saveLocal() {
    localStorage.setItem('_kanban_demands', JSON.stringify(_demands));
  }

  return { load, abrirNovaDemanda, fecharModal, salvar, abrirDetalhes };
})();

// V6.2 — Registro Global de Módulos Industriais (Elite Visibility)
window.App          = App;
window.Theme        = Theme;
window.EmailService = EmailService;
window.MagicLink    = MagicLink;
window.Pessoas      = Pessoas;
window.Kanban       = Kanban;
window.Dashboard    = Dashboard;
window.Auth         = Auth; // Caso auth esteja no mesmo escopo ou carregado
window._sb          = window._sb || _sb;

console.log('NUPIEEPRO V6.2: Todos os módulos globais registrados.');
