// Blindagem Industrial V6.6 — Auth Module
const Auth = {
  _db() { return window._sb || window._supabase; },

  async login(email, password) {
    const sb = this._db();
    if (!sb) {
      if (email === 'jjoserrayan2711@gmail.com') {
        localStorage.setItem('mockSession', email);
        return { user: { id: 'dev-chefe', email } };
      }
      throw new Error('Sistema de dados offline. Verifique a URL do Supabase no app.js');
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register(email, password, metadata = {}) {
    const sb = this._db();
    if (!sb) throw new Error('Supabase não configurado.');
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  async registerWithToken(token, nome, password, extraMetadata = {}) {
    const sb = this._db();
    if (!sb) throw new Error('Sistema offline. Verifique a conexão.');

    const { data: convite, error: tokenErr } = await sb
      .from('convites')
      .select('*, coordenadorias(nome, sigla)')
      .eq('token', token)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !convite) throw new Error('Convite inválido ou expirado.');

    const iniciais = nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const metadataCompleto = {
      nome,
      role: convite.role,
      cargo: convite.cargo,
      coordenadoria_id: convite.coordenadoria_id,
      iniciais,
      apelido: extraMetadata.apelido || nome.split(' ')[0],
      data_nascimento: extraMetadata.data_nascimento || null,
      nome_primeiro: extraMetadata.nome_primeiro || nome.split(' ')[0],
      nome_sobrenome: extraMetadata.nome_sobrenome || nome.split(' ').slice(1).join(' ')
    };

    const { data, error } = await sb.auth.signUp({
      email: convite.email,
      password,
      options: { data: metadataCompleto }
    });

    if (error) throw error;
    await sb.from('convites').update({ usado: true }).eq('id', convite.id);
    return data;
  },

  async logout() {
    const sb = this._db();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('mockSession');
    if (window.App) window.App.redirect('index.html');
    else window.location.href = 'index.html';
  },

  async getSession() {
    const sb = this._db();
    if (!sb) {
      const mock = localStorage.getItem('mockSession');
      return mock ? { user: { email: mock } } : null;
    }
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  async resetPassword(email) {
    const sb = this._db();
    if (!sb) throw new Error('Supabase não configurado.');
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('reset.html', window.location.href).href
    });
    if (error) throw error;
  }
};

/* ============================================================
   Helpers de UI
   ============================================================ */
let selectedCoord = null;

function showAlert(msg, type, containerId = 'loginAlert') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = msg;
  const base = el.dataset.alertClass || el.className.split(' ')[0] || 'alert-box';
  el.className = base + ' ' + type;
  el.style.display = '';
}

function showPanelAlert(msg, type, id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert ' + type;
}

/* Abre/fecha painéis de recuperação e convite */
function togglePanel(id) {
  const target = document.getElementById(id);
  if (!target) return;

  const others = ['resetPanel', 'convitePanel'].filter(p => p !== id);
  others.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.classList.remove('open');
  });

  const isOpen = target.classList.contains('open');
  target.classList.toggle('open', !isOpen);

  if (!isOpen) {
    // Pré-preenche e-mail no painel de recuperação
    if (id === 'resetPanel') {
      const email = document.getElementById('loginEmail')?.value.trim();
      const resetInput = document.getElementById('resetEmail');
      if (email && resetInput) resetInput.value = email;
      resetInput?.focus();
    } else if (id === 'convitePanel') {
      document.getElementById('conviteTokenInput')?.focus();
    }
  }
}

/* ============================================================
   Login Page
   ============================================================ */
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) { showAlert('Insira seu e-mail.', 'error'); return; }
  if (!password) { showAlert('Insira sua senha.', 'error'); return; }

  // SEGURANÇA: Rate Limiter Anti-Brute-Force
  if (typeof RateLimiter !== 'undefined' && !RateLimiter.check('login_' + email)) {
    showAlert('Muitas tentativas. Aguarde 1 minuto.', 'error');
    return;
  }

  const btn = document.getElementById('btnLogin');
  if (btn) { btn.classList.add('loading'); btn.textContent = 'Verificando...'; }

  try {
    await Auth.login(email, password);
    if (typeof RateLimiter !== 'undefined') RateLimiter.reset('login_' + email);
    if (window.App) window.App.toast('Login realizado!', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
  } catch (err) {
    showAlert(err.message || 'E-mail ou senha incorretos.', 'error');
  } finally {
    if (btn) { btn.classList.remove('loading'); btn.textContent = 'Entrar'; }
  }
}

async function doLogout() {
  await Auth.logout();
}

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
  });

  const sb = window._sb || window._supabase;
  Auth.getSession().then(session => {
    if (!session) return;
    const isMock = !sb && !!localStorage.getItem('mockSession');
    if (!isMock && sb) {
      const formCard = document.querySelector('.form-card');
      if (formCard) {
        formCard.innerHTML = `
          <div class="form-header">
            <div class="form-eyebrow">Sessão Ativa</div>
            <div class="form-title">Você já está conectado</div>
            <div class="form-sub">Continuar ou entrar com outra conta.</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;">
            <button class="btn-login" onclick="window.location.href='dashboard.html'">Entrar no Sistema</button>
            <button class="btn-login" style="background:transparent;border:1px solid rgba(145,154,187,0.2);color:var(--slate);" onclick="forceLogout()">Trocar de Conta</button>
          </div>
        `;
      }
    }
  });
}

async function forceLogout() {
  const sb = window._sb || window._supabase;
  if (sb) await sb.auth.signOut();
  localStorage.removeItem('mockSession');
  window.location.reload();
}

/* ============================================================
   Recuperação de Senha — verifica cadastro antes de enviar
   ============================================================ */
async function doResetPassword() {
  const emailEl = document.getElementById('resetEmail');
  const email = emailEl?.value.trim();

  if (!email) { showPanelAlert('Insira seu e-mail.', 'error', 'resetAlert'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showPanelAlert('E-mail inválido.', 'error', 'resetAlert'); return;
  }
  const sb = window._sb || window._supabase;
  if (!sb) { showPanelAlert('Sistema offline. Tente novamente mais tarde.', 'error', 'resetAlert'); return; }

  const btn = document.getElementById('btnReset');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await Auth.resetPassword(email);
    showPanelAlert('Se esse e-mail tiver cadastro, você receberá o link em instantes. Verifique também a pasta de spam.', 'success', 'resetAlert');
    if (emailEl) emailEl.value = '';
  } catch (err) {
    showPanelAlert(err.message || 'Erro ao enviar. Tente novamente.', 'error', 'resetAlert');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar link de redefinição'; }
  }
}

/* ============================================================
   Ativar Convite
   ============================================================ */
function ativarConvite() {
  const tokenEl = document.getElementById('conviteTokenInput');
  const token = tokenEl?.value.trim();
  if (!token) {
    showPanelAlert('Cole o token do seu convite.', 'error', 'conviteAlert'); return;
  }
  window.location.href = 'convite.html?token=' + encodeURIComponent(token);
}

/* ============================================================
   Convite (Invite) Page
   ============================================================ */
function initConvitePage() {
  const token = new URLSearchParams(window.location.search).get('token');
  const loadingEl = document.getElementById('conviteLoading');
  const errorEl   = document.getElementById('conviteError');
  const errorMsg  = document.getElementById('conviteErrorMsg');
  const wizardEl  = document.getElementById('wizard');

  if (!token) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl)   errorEl.style.display = '';
    if (errorMsg)  errorMsg.textContent = 'Você precisa de um link de convite válido. Solicite ao seu coordenador.';
    return;
  }

  (async () => {
    const sb = window._sb || window._supabase;
    if (!sb) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl)   errorEl.style.display = '';
      if (errorMsg)  errorMsg.textContent = 'Sistema offline. Verifique a conexão com o servidor.';
      return;
    }
    try {
      const { data: convite, error } = await sb
        .from('convites')
        .select('*, coordenadorias(nome, sigla)')
        .eq('token', token)
        .eq('usado', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !convite) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl)   errorEl.style.display = '';
        if (errorMsg)  errorMsg.textContent = 'Convite inválido, já utilizado ou expirado. Solicite um novo convite.';
        return;
      }

      // Token válido — mostra o formulário e preenche info do convite
      if (loadingEl) loadingEl.style.display = 'none';
      if (wizardEl)  wizardEl.style.display = '';

      const infoEl = document.getElementById('conviteInfoBox');
      if (infoEl) {
        const coord = convite.coordenadorias ? `${convite.coordenadorias.sigla} — ${convite.coordenadorias.nome}` : 'Geral';
        infoEl.innerHTML = `<span>📧 ${convite.email}</span><span>·</span><span>${coord}</span><span>·</span><span>${convite.cargo || convite.role}</span>`;
      }
    } catch (e) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl)   errorEl.style.display = '';
      if (errorMsg)  errorMsg.textContent = 'Erro ao verificar convite: ' + (e.message || 'tente novamente.');
    }
  })();
}

async function doConviteRegister() {
  const token = new URLSearchParams(window.location.search).get('token');
  const nome      = document.getElementById('conviteNome')?.value.trim();
  const sobrenome = document.getElementById('conviteSobrenome')?.value.trim();
  const apelido   = document.getElementById('conviteApelido')?.value.trim();
  const nascimento= document.getElementById('conviteNascimento')?.value;
  const password  = document.getElementById('convitePassword')?.value;
  const confirm   = document.getElementById('conviteConfirm')?.value;

  if (!nome)        { showAlert('Insira seu nome.',                          'error', 'conviteAlert'); return; }
  if (!sobrenome)   { showAlert('Insira seu sobrenome.',                     'error', 'conviteAlert'); return; }
  if (!apelido)     { showAlert('Insira seu apelido.',                       'error', 'conviteAlert'); return; }
  if (!nascimento)  { showAlert('Insira sua data de aniversário.',           'error', 'conviteAlert'); return; }
  if (password.length < 6) { showAlert('Senha deve ter pelo menos 6 caracteres.', 'error', 'conviteAlert'); return; }
  if (password !== confirm) { showAlert('As senhas não coincidem.',          'error', 'conviteAlert'); return; }

  const btn = document.getElementById('btnConvite');
  if (btn) { btn.disabled = true; btn.textContent = 'Criando sua conta…'; }

  try {
    const nomeCompleto = `${nome} ${sobrenome}`;
    await Auth.registerWithToken(token, nomeCompleto, password, {
      apelido, data_nascimento: nascimento, nome_primeiro: nome, nome_sobrenome: sobrenome
    });

    // Exibe tela de sucesso
    const wizardEl  = document.getElementById('wizard');
    const successEl = document.getElementById('conviteSuccess');
    const titleEl   = document.getElementById('successTitle');
    const subEl     = document.getElementById('successSub');
    const cdEl      = document.getElementById('cd');
    if (wizardEl)  wizardEl.style.display = 'none';
    if (successEl) successEl.style.display = '';
    if (titleEl)   titleEl.textContent = 'Conta criada, ' + apelido + '! 🎉';
    if (subEl)     subEl.textContent   = 'Bem-vindo(a) ao sistema NUPIEEPRO. Redirecionando…';

    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (cdEl) cdEl.textContent = count;
      if (count <= 0) { clearInterval(timer); window.location.href = 'dashboard.html'; }
    }, 1000);
  } catch (err) {
    showAlert(err.message || 'Erro ao criar conta. Tente novamente.', 'error', 'conviteAlert');
    if (btn) { btn.disabled = false; btn.textContent = 'Criar Minha Conta'; }
  }
}
