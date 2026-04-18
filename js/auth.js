/* ============================================================
   NUPIEEPRO — Authentication (Supabase JWT)
   Login: email + senha apenas. Coord vem do perfil no DB.
   ============================================================ */

const Auth = {
  async login(email, password) {
    if (!_sb) throw new Error('Supabase não configurado. Edite js/app.js com sua URL e ANON KEY.');
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register(email, password, metadata = {}) {
    if (!_sb) throw new Error('Supabase não configurado.');
    const { data, error } = await _sb.auth.signUp({
      email, password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  /* Registro via token de convite */
  async registerWithToken(token, nome, password) {
    if (!_sb) throw new Error('Supabase não configurado.');

    const { data: convite, error: tokenErr } = await _sb
      .from('convites')
      .select('*, coordenadorias(nome, sigla)')
      .eq('token', token)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !convite) throw new Error('Convite inválido ou expirado.');

    const iniciais = nome.split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const { data, error } = await _sb.auth.signUp({
      email: convite.email,
      password,
      options: {
        data: {
          nome,
          role:             convite.role,
          cargo:            convite.cargo,
          coordenadoria_id: convite.coordenadoria_id,
          iniciais
        }
      }
    });

    if (error) throw error;

    await _sb.from('convites').update({ usado: true }).eq('id', convite.id);
    return data;
  },

  async logout() {
    if (_sb) await _sb.auth.signOut();
    window.location.href = 'index.html';
  },

  async getSession() {
    if (!_sb) return null;
    const { data: { session } } = await _sb.auth.getSession();
    return session;
  },

  async resetPassword(email) {
    if (!_sb) throw new Error('Supabase não configurado.');
    const { error } = await _sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset.html'
    });
    if (error) throw error;
  }
};
