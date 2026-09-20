// Blindagem Industrial V6.6 — Auth Module
const Auth = {
  _db() { return window._sb || window._supabase; },

  async login(email, password) {
    const sb = this._db();
    if (!sb) throw new Error('Sistema offline. Verifique a conexão com a internet.');
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

    /* IMPORTANTE: Faz logout de qualquer session ativa pra evitar que o user
       seja redirecionado pra dashboard do session anterior (ex: admin que
       gerou o convite e tem o PWA aberto). Senao, mesmo cadastrando outro
       usuario, o sistema entra no perfil antigo. */
    try { await sb.auth.signOut(); } catch(_) {}

    const { data: convite, error: tokenErr } = await sb
      .rpc('get_convite_by_token', { p_token: token })
      .maybeSingle();

    if (tokenErr || !convite) throw new Error('Convite inválido ou expirado.');

    const iniciais = nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const metadataCompleto = {
      nome,
      role: convite.role,
      cargo: convite.cargo,
      coordenadoria_id: convite.coordenadoria_id,
      iniciais,
      apelido: extraMetadata.apelido || nome.split(' ')[0],
      aniversario: extraMetadata.data_nascimento || null,
      nome_primeiro: extraMetadata.nome_primeiro || nome.split(' ')[0],
      nome_sobrenome: extraMetadata.nome_sobrenome || nome.split(' ').slice(1).join(' ')
    };

    const { data, error } = await sb.auth.signUp({
      email: convite.email,
      password,
      options: { data: metadataCompleto }
    });

    if (error) throw error;
    await sb.rpc('consumir_convite', { p_token: token });
    return data;
  },

  async logout() {
    const sb = this._db();
    // Sinaliza que este signOut foi voluntário, pro watcher de sessão do
    // dashboard (app.js) não mostrar "sessão encerrada" por cima do logout
    // normal que o próprio usuário pediu.
    window.__logoutVoluntario = true;
    if (sb) await sb.auth.signOut();
    /* Limpa todo dado de sessão/trabalho em cache no logout — sem isso, o
       próximo usuário num dispositivo compartilhado (comum num evento como
       a ABJ) podia ver demandas, rascunhos de TAP ou repasse financeiro em
       andamento de quem saiu. Preferência de aparência (tema/fonte) não é
       dado de sessão, então fica. */
    const PRESERVAR = new Set(['nupie_theme', 'np-theme', 'nupie_font']);
    Object.keys(localStorage)
      .filter(k => !PRESERVAR.has(k))
      .forEach(k => localStorage.removeItem(k));
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

/* Traduz as mensagens de erro do Supabase Auth (sempre em inglês) pra
   PT-BR — mostrar "Invalid login credentials" cru pra quem só fala
   português não é profissional. Erro não mapeado cai num texto genérico
   curto em vez de vazar detalhe técnico/stack na tela. */
function traduzErroAuth(err) {
  const msg = (err && err.message) || String(err || '');
  const mapa = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'],
    [/user already registered|already been registered/i, 'Este e-mail já possui uma conta. Faça login ou recupere sua senha.'],
    [/password should be at least|password.*too short/i, 'Senha deve ter pelo menos 8 caracteres, com letras e números.'],
    [/same.*(password|senha)/i, 'A nova senha deve ser diferente da anterior.'],
    [/rate limit|too many requests|only request this after/i, 'Muitas tentativas. Aguarde um pouco antes de tentar de novo.'],
    [/failed to fetch|network|load failed/i, 'Erro de conexão. Verifique sua internet e tente novamente.'],
    [/token.*(expired|invalid)|invalid.*token|expired.*token|link.*(invalid|expired)|invalid.*link/i, 'Link inválido ou expirado.'],
    [/user not found/i, 'Usuário não encontrado.'],
    [/session.*missing|auth session missing/i, 'Sessão expirada. Solicite um novo link.'],
  ];
  for (const [re, pt] of mapa) { if (re.test(msg)) return pt; }
  return msg && msg.length < 140 ? msg : 'Algo deu errado. Tente novamente em instantes.';
}
window.traduzErroAuth = traduzErroAuth;

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
    showAlert(traduzErroAuth(err), 'error');
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

  // Enter também envia os painéis de "Esqueci minha senha" e "Ativar
  // convite" — sem isso o usuário é obrigado a clicar no botão, o que
  // quebra a expectativa padrão de qualquer formulário na web.
  const resetInput = document.getElementById('resetEmail');
  resetInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doResetPassword(); }
  });
  const conviteInput = document.getElementById('conviteTokenInput');
  conviteInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ativarConvite(); }
  });

  const sb = window._sb || window._supabase;
  Auth.getSession().then(session => {
    if (!session) return;
    const isMock = !sb && !!localStorage.getItem('mockSession');
    if (!isMock && sb) {
      const loginBox = document.querySelector('.login-box');
      if (loginBox) {
        loginBox.innerHTML = `
          <div class="form-group">
            <div class="form-label">Sessão Ativa</div>
            <h2 style="font-family:var(--font-head);font-size:22px;font-weight:800;margin-bottom:6px;">Você já está conectado</h2>
            <p style="font-size:13px;color:var(--c-slate);line-height:1.5;">Continuar ou entrar com outra conta.</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:1.5rem;">
            <button class="btn-submit" style="width:100%;justify-content:center;" onclick="window.location.href='dashboard.html'">Entrar no Sistema</button>
            <button class="btn-submit" style="width:100%;justify-content:center;background:transparent;border:1px solid var(--border);color:var(--c-slate);" onclick="forceLogout()">Trocar de Conta</button>
          </div>
        `;
      }
    }
  });
}

async function forceLogout() {
  const sb = window._sb || window._supabase;
  window.__logoutVoluntario = true;
  if (sb) await sb.auth.signOut();
  const PRESERVAR = new Set(['nupie_theme', 'np-theme', 'nupie_font']);
  Object.keys(localStorage)
    .filter(k => !PRESERVAR.has(k))
    .forEach(k => localStorage.removeItem(k));
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

  // SEGURANÇA: mesmo limitador anti-abuso do login — sem isso, alguém podia
  // martelar "enviar link" pro e-mail de outra pessoa indefinidamente.
  if (typeof RateLimiter !== 'undefined' && !RateLimiter.check('reset_' + email, 3, 60000)) {
    showPanelAlert('Muitas tentativas. Aguarde 1 minuto antes de pedir outro link.', 'error', 'resetAlert');
    return;
  }

  const btn = document.getElementById('btnReset');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    await Auth.resetPassword(email);
    showPanelAlert('Se esse e-mail tiver cadastro, você receberá o link em instantes. Verifique também a pasta de spam.', 'success', 'resetAlert');
    if (emailEl) emailEl.value = '';
  } catch (err) {
    showPanelAlert(traduzErroAuth(err), 'error', 'resetAlert');
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
        .rpc('get_convite_by_token', { p_token: token })
        .maybeSingle();

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
        const esc = typeof sanitize === 'function' ? sanitize : (s => String(s ?? ''));
        const coord = convite.coord_sigla ? `${convite.coord_sigla} — ${convite.coord_nome}` : 'Geral';
        /* Separador "·" como pseudo-elemento (não um <span> à parte): com
           flex-wrap, um span só com o ponto podia quebrar sozinho pra uma
           linha nova quando o email era comprido, ficando um "·" solto.
           Grudado no ::before do próprio item seguinte, ele nunca se separa
           do texto que introduz. */
        infoEl.innerHTML = `<span>📧 ${esc(convite.email)}</span><span class="info-sep">${esc(coord)}</span><span class="info-sep">${esc(convite.cargo || convite.role)}</span>`;
      }

      // Enter em qualquer campo do formulário também envia — mesmo padrão
      // do restante do fluxo de acesso.
      document.getElementById('conviteForm')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); doConviteRegister(); }
      });
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
  const erroSenha = senhaForte(password);
  if (erroSenha) { showAlert(erroSenha, 'error', 'conviteAlert'); return; }
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
      /* Vai pro index pra forcar login com a NOVA conta (evita pegar session
         do user que enviou o convite). */
      if (count <= 0) { clearInterval(timer); window.location.href = 'index.html'; }
    }, 1000);
  } catch (err) {
    showAlert(traduzErroAuth(err), 'error', 'conviteAlert');
    if (btn) { btn.disabled = false; btn.textContent = 'Criar Minha Conta'; }
  }
}
