/* ============================================================
   NUPIEEPRO — Authentication (Supabase JWT)
   ============================================================ */

const Auth = {
  async login(email, password) {
    if (!_sb) throw new Error('Supabase não configurado. Cole sua URL e ANON KEY em js/app.js');
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
    if (!_sb) throw new Error('Supabase não configurado.');

    // Validate invite token
    const { data: convite, error: tokenErr } = await _sb
      .from('convites')
      .select('*, coordenadorias(nome, sigla)')
      .eq('token', token)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !convite) throw new Error('Convite inválido ou expirado.');

    // Create account with convite metadata
    const iniciais = nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const { data, error } = await _sb.auth.signUp({
      email: convite.email,
      password,
      options: {
        data: {
          nome,
          role: convite.role,
          cargo: convite.cargo,
          coordenadoria_id: convite.coordenadoria_id,
          iniciais
        }
      }
    });

    if (error) throw error;

    // Mark token used
    await _sb.from('convites').update({ usado: true }).eq('id', convite.id);
    return data;
  },

  async logout() {
    if (_sb) await _sb.auth.signOut();
    App.redirect('index.html');
  },

  async getSession() {
    if (!_sb) return null;
    const { data: { session } } = await _sb.auth.getSession();
    return session;
  },

  async resetPassword(email) {
    if (!_sb) throw new Error('Supabase não configurado.');
    const { error } = await _sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset.html`
    });
    if (error) throw error;
  }
};

/* ============================================================
   Login Page — coord selection + email/password
   ============================================================ */
let selectedCoord = null;

function selectCoord(btn) {
  document.querySelectorAll('.coord-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedCoord = btn.dataset.coord;
}

function showAlert(msg, type, containerId = 'loginAlert') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert-box ' + type;
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) { showAlert('Insira seu email.', 'error'); return; }
  if (!password) { showAlert('Insira sua senha.', 'error'); return; }

  const btn = document.getElementById('btnLogin');
  btn.classList.add('loading');
  btn.textContent = 'Verificando...';

  try {
    await Auth.login(email, password);
    App.toast('Login realizado!', 'success');
    setTimeout(() => App.redirect('dashboard.html'), 500);
  } catch (err) {
    showAlert(err.message || 'Erro ao fazer login.', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Entrar';
  }
}

async function doLogout() {
  await Auth.logout();
}

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Enter key submits
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
  });

  // If already logged in, redirect
  Auth.getSession().then(session => {
    if (session) App.redirect('dashboard.html');
  });
}

/* ============================================================
   Convite (Invite) Page
   ============================================================ */
function initConvitePage() {
  const token = App.param('token');
  if (!token) {
    const content = document.getElementById('conviteContent');
    if (content) {
      content.innerHTML = '<p class="text-center text-muted mt-2">Token de convite não encontrado na URL.<br><br>O link deve ter o formato:<br><code style="color:var(--orange)">convite.html?token=SEU_TOKEN</code></p>';
    }
    return;
  }

  loadConviteInfo(token);
}

async function loadConviteInfo(token) {
  const infoEl = document.getElementById('conviteInfo');
  if (!infoEl || !_sb) {
    if (infoEl) infoEl.innerHTML = '<p class="text-center text-muted">Supabase não configurado.</p>';
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
      infoEl.innerHTML = '<p class="text-center" style="color:var(--red);">Convite inválido ou expirado.</p>';
      const form = document.getElementById('conviteForm');
      if (form) form.style.display = 'none';
      return;
    }

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
  } catch {
    infoEl.innerHTML = '<p class="text-center text-muted">Erro ao carregar convite.</p>';
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
