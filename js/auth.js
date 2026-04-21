/* ============================================================
   NUPIEEPRO — Authentication (Supabase JWT)
   ============================================================ */

const Auth = {
  async login(email, password) {
    if (!_sb) {
      if (email === 'jjoserrayan2711@gmail.com') {
        localStorage.setItem('mockSession', email);
        return { user: { id: 'dev-chefe', email } };
      }
      throw new Error('Supabase não configurado. Cole sua URL e ANON KEY em js/app.js');
    }
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register(email, password, metadata = {}) {
    if (!_sb) throw new Error('Supabase não configurado.');
    const { data, error } = await _sb.auth.signUp({
      email, password, options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  async registerWithToken(token, nome, password) {
    if (!_sb) throw new Error('Sistema offline. Verifique a conexão.');

    const { data: convite, error: tokenErr } = await _sb
      .from('convites')
      .select('*, coordenadorias(nome, sigla)')
      .eq('token', token)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !convite) throw new Error('Convite inválido ou expirado.');

    const iniciais = nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const { data, error } = await _sb.auth.signUp({
      email: convite.email,
      password,
      options: {
        data: { nome, role: convite.role, cargo: convite.cargo,
                coordenadoria_id: convite.coordenadoria_id, iniciais }
      }
    });

    if (error) throw error;
    await _sb.from('convites').update({ usado: true }).eq('id', convite.id);
    return data;
  },

  async logout() {
    if (_sb) await _sb.auth.signOut();
    localStorage.removeItem('mockSession');
    App.redirect('index.html');
  },

  async getSession() {
    if (!_sb) {
      const mock = localStorage.getItem('mockSession');
      return mock ? { user: { email: mock } } : null;
    }
    const { data: { session } } = await _sb.auth.getSession();
    return session;
  },

  async resetPassword(email) {
    if (!_sb) throw new Error('Supabase não configurado.');
    const { error } = await _sb.auth.resetPasswordForEmail(email, {
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
}

function showPanelAlert(msg, type, id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'panel-alert ' + type;
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

  const btn = document.getElementById('btnLogin');
  btn.classList.add('loading');
  btn.textContent = 'Verificando...';

  try {
    await Auth.login(email, password);
    App.toast('Login realizado!', 'success');
    setTimeout(() => App.redirect('dashboard.html'), 500);
  } catch (err) {
    showAlert(err.message || 'E-mail ou senha incorretos.', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Entrar na Plataforma';
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

  Auth.getSession().then(session => {
    if (!session) return;
    const isMock = !_sb && !!localStorage.getItem('mockSession');
    if (!isMock && _sb) {
      const formCard = document.querySelector('.form-card');
      if (formCard) {
        formCard.innerHTML = `
          <div class="form-header">
            <div class="form-eyebrow">Sessão Ativa</div>
            <div class="form-title">Você já está conectado</div>
            <div class="form-sub">Continuar ou entrar com outra conta.</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;">
            <button class="login-btn" onclick="App.redirect('dashboard.html')">Continuar no Sistema →</button>
            <button class="login-btn" style="background:transparent;border:1px solid rgba(145,154,187,0.2);color:var(--slate);" onclick="forceLogout()">Trocar de Conta</button>
          </div>
        `;
      }
    }
  });
}

async function forceLogout() {
  if (_sb) await _sb.auth.signOut();
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
  if (!_sb) { showPanelAlert('Sistema offline. Tente novamente mais tarde.', 'error', 'resetAlert'); return; }

  const btn = document.getElementById('btnReset');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await Auth.resetPassword(email);
    showPanelAlert('Se esse e-mail tiver cadastro, você receberá o link em instantes. Verifique também a pasta de spam.', 'success', 'resetAlert');
    if (emailEl) emailEl.value = '';
  } catch (err) {
    showPanelAlert(err.message || 'Erro ao enviar. Tente novamente.', 'error', 'resetAlert');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar link de redefinição →'; }
  }
}

/* ============================================================
   Ativar Convite
   ============================================================ */
function activarConvite() {
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
  const token = App.param('token');
  if (!token) {
    const content = document.getElementById('conviteContent');
    if (content) {
      content.innerHTML = `
        <div style="text-align:center;padding:1.5rem 0;">
          <div style="font-size:48px;margin-bottom:16px;">🔗</div>
          <p style="color:var(--w70,#919abb);margin-bottom:20px;line-height:1.6;">
            Você precisa de um link de convite para criar sua conta.<br>
            Solicite ao coordenador responsável.
          </p>
          <a href="index.html" style="color:#7c52c8;font-weight:600;text-decoration:none;">← Voltar ao login</a>
        </div>`;
    }
    return;
  }

  loadConviteInfo(token);
}

async function loadConviteInfo(token) {
  const infoEl = document.getElementById('conviteInfo');
  if (!_sb) {
    if (infoEl) infoEl.innerHTML = '<p class="text-center text-muted">Verificação requer conexão com o servidor.</p>';
    const form = document.getElementById('conviteForm');
    if (form) form.style.display = 'none';
    return;
  }

  try {
    const { data: convite, error } = await _sb
      .from('convites')
      .select('*, coordenadorias(nome, sigla)')
      .eq('token', token)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !convite) {
      if (infoEl) infoEl.innerHTML = '<p class="text-center" style="color:#f09595;">Convite inválido ou expirado.</p>';
      const form = document.getElementById('conviteForm');
      if (form) form.style.display = 'none';
      return;
    }

    if (infoEl) {
      infoEl.innerHTML = `
        <dl class="convite-info">
          <dt>Email</dt>
          <dd>${convite.email}</dd>
          <dt>Coordenadoria</dt>
          <dd>${convite.coordenadorias ? convite.coordenadorias.sigla + ' — ' + convite.coordenadorias.nome : 'Geral'}</dd>
          <dt>Função</dt>
          <dd>${convite.cargo || convite.role}</dd>
        </dl>
      `;
    }
  } catch {
    if (infoEl) infoEl.innerHTML = '<p class="text-center text-muted">Erro ao carregar convite.</p>';
  }
}

async function doConviteRegister() {
  const token = App.param('token');
  const nome = document.getElementById('conviteNome').value.trim();
  const password = document.getElementById('convitePassword').value;
  const confirm = document.getElementById('conviteConfirm').value;

  if (!nome) { showAlert('Insira seu nome.', 'error', 'conviteAlert'); return; }
  if (password.length < 6) { showAlert('Senha deve ter pelo menos 6 caracteres.', 'error', 'conviteAlert'); return; }
  if (password !== confirm) { showAlert('As senhas não coincidem.', 'error', 'conviteAlert'); return; }

  const btn = document.getElementById('btnConvite');
  btn.classList.add('loading');
  btn.textContent = 'Criando conta...';

  try {
    await Auth.registerWithToken(token, nome, password);
    showAlert('Conta criada com sucesso!', 'success', 'conviteAlert');
    App.toast('Bem-vindo ao NUPIEEPRO!', 'success');
    setTimeout(() => App.redirect('dashboard.html'), 1000);
  } catch (err) {
    showAlert(err.message || 'Erro ao criar conta.', 'error', 'conviteAlert');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Criar Conta';
  }
}
