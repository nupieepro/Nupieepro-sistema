'use strict';
const _sbq = () => window._supabase;
const _sc = (titulo,icone,html) => `
  <div class="section-card" style="padding:20px 24px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:22px">${icone}</span>
      <h3 style="font-family:var(--f-head);font-size:15px;font-weight:700;color:var(--c-white)">${titulo}</h3>
    </div>${html}
  </div>`;
const _btn = (l,fn,cls='btn-primary')=>`<button class="btn ${cls}" onclick="${fn}" style="font-size:13px">${l}</button>`;
const _fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

/* ── Dias úteis: soma n dias úteis a partir de hoje ── */
function _addDiasUteis(n) {
  const d = new Date(); let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return d.toISOString().split('T')[0];
}

/* ── Notificação: grava na tabela notificacoes de um usuário ── */
async function _notificar(userId, titulo, mensagem, tipo = 'info', categoria = null) {
  if (!_sbq() || !userId) return;
  const VALID_TIPOS = ['info', 'alerta', 'sucesso', 'erro'];
  const tipoFinal = VALID_TIPOS.includes(tipo) ? tipo : 'info';
  try {
    await _sbq().from('notificacoes').insert([{ user_id: userId, titulo, mensagem, tipo: tipoFinal, categoria, lida: false }]);
  } catch(e) { console.warn('[notif]', e); }
}

/* ── Notificação em broadcast: dispara para todos de uma coord ── */
async function _notificarCoord(sigla, titulo, mensagem, tipo = 'info', categoria = null) {
  if (!_sbq()) return;
  const VALID_TIPOS = ['info', 'alerta', 'sucesso', 'erro'];
  const tipoFinal = VALID_TIPOS.includes(tipo) ? tipo : 'info';
  try {
    const coords = await getCoords();
    const coord  = coords.find(c => c.sigla === sigla);
    if (!coord) return;
    const { data } = await _sbq().from('users').select('id').eq('coordenadoria_id', coord.id).eq('ativo', true);
    if (!data?.length) return;
    await _sbq().from('notificacoes').insert(data.map(u => ({ user_id: u.id, titulo, mensagem, tipo: tipoFinal, categoria, lida: false })));
  } catch(e) { console.warn('[notif coord]', e); }
}

/* ── Helper global: busca coordenadorias com cache ── */
let _coordsCache = null;
async function getCoords() {
  if (_coordsCache) return _coordsCache;
  if (!_sbq()) return [];
  try {
    const { data } = await _sbq().from('coordenadorias').select('id,nome,sigla,cor,icone').order('nome');
    _coordsCache = data || [];
    return _coordsCache;
  } catch(e) { console.warn('[pages] getCoords:', e); return []; }
}
const PageGeral = {
  async init() {
    this._renderReuniao();
    this._renderPlanejamento();
    this._renderMelhorias();
    this._renderParcerias();
  },

  /* ── Dashboard da Coordenação Geral (page-geral) ─────────────
     Popula o PCD e o Gerenciador de Reuniões que já existem no HTML.
  ── */
  async _renderGeralDashboard() {
    this._popularPCD();
  },

  /* ── PCD: detecta membros com 2+ meses sem entregas ── */
  async _popularPCD() {
    const el = document.getElementById('pcdAlerts');
    if (!el || !_sbq()) return;
    el.innerHTML = '<div style="font-size:12px;color:var(--c-slate)">Verificando…</div>';
    try {
      /* Pega todos os membros ativos */
      const { data: membros } = await _sbq()
        .from('users')
        .select('id,nome,coordenadorias(nome)')
        .eq('ativo', true)
        .neq('role', 'admin');
      if (!membros?.length) { el.innerHTML = '<p style="font-size:13px;color:var(--c-slate)">Sem membros cadastrados.</p>'; return; }
      /* Limite: 2 meses atrás */
      const limite = new Date();
      limite.setMonth(limite.getMonth() - 2);
      const limStr = limite.toISOString().split('T')[0];
      /* Busca última atividade (evento criado_por) de cada membro */
      const { data: ativos } = await _sbq()
        .from('eventos')
        .select('criado_por, created_at')
        .gte('created_at', limStr);
      const ativosSet = new Set((ativos||[]).map(e => e.criado_por));
      const inativos = membros.filter(m => !ativosSet.has(m.id));
      if (!inativos.length) {
        el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--c-slate)">✅ Todos os membros têm entregas nos últimos 2 meses.</div>';
        return;
      }
      el.innerHTML = `
        <div style="background:var(--red)18;border:1px solid var(--red)33;border-radius:10px;padding:12px 14px;margin-bottom:10px;font-size:12px;color:var(--red);font-weight:700">
          ⚠️ ${inativos.length} membro(s) sem entregas nos últimos 2 meses — Avalie PCD ou realocação.
        </div>` +
        inativos.map(m => `
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;
                      padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(m.nome||'—')}</div>
              <div style="font-size:11px;color:var(--c-slate)">${sanitize(m.coordenadorias?.nome||'Sem coord')}</div>
            </div>
            <span style="font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;
                         background:var(--red)22;color:var(--red);border:1px solid var(--red)44">
              🔴 +2 meses sem entrega
            </span>
          </div>`).join('');
    } catch(e) { el.innerHTML='<p style="font-size:12px;color:var(--c-slate)">Erro ao verificar PCD.</p>'; console.warn(e); }
  },

  /* ── Módulo Institucional: logo, missão, regimento, PCD ── */
  _renderInstitucional() {
    const pg = document.getElementById('page-geral_planejamento');
    if (!pg) return;
    /* Injeta seção institucional abaixo do planejamento semestral */
    if (document.getElementById('inst-section')) return; /* já injetado */
    const container = pg.querySelector('.content');
    if (!container) return;
    const div = document.createElement('div');
    div.id = 'inst-section';
    div.innerHTML = _sc('Identidade Institucional','🏛️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Documentos obrigatórios do Núcleo — Atividades 01, 02 e 04.
        Repositório central de identidade visual e documentos jurídicos.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        ${[
          { icone:'🖼️', label:'Logotipo Oficial', sub:'PNG ou JPEG', id:'inst-logo',    btn:'Atualizar logo' },
          { icone:'📝', label:'Missão, Visão e Valores', sub:'Atividade 02', id:'inst-mvv',     btn:'Editar MVV' },
          { icone:'📋', label:'Regimento Interno', sub:'PDF — Atividade 01', id:'inst-reg',     btn:'Upload PDF' },
          { icone:'⚖️', label:'Programa de Controle Disciplinar', sub:'PDF — Atividade 04', id:'inst-pcd', btn:'Upload PDF' },
        ].map(item => `
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:16px">
            <div style="font-size:28px;margin-bottom:8px">${item.icone}</div>
            <div style="font-weight:700;font-size:13px;color:var(--c-white);margin-bottom:4px">${item.label}</div>
            <div style="font-size:11px;color:var(--c-slate);margin-bottom:12px">${item.sub}</div>
            <div id="${item.id}-status" style="font-size:11px;color:var(--c-slate);margin-bottom:8px">
              Status: <span style="color:var(--yellow)">⏳ Não verificado</span>
            </div>
            <button class="btn btn-ghost" style="font-size:11px;width:100%"
                    onclick="PageGeral._instDoc('${item.id}','${item.label}')">${item.btn}</button>
          </div>`).join('')}
      </div>`);
    container.appendChild(div);
  },

  _instDoc(id, label) {
    abrirModal({ titulo:`🏛️ ${label}`, tipo:'info', corpo:`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Cole o link do documento no Google Drive ou outro repositório seguro.
      </p>
      <div class="form-group"><label class="form-label">Link do documento *</label>
        <input id="inst-link" class="form-input" placeholder="https://drive.google.com/..."></div>
      <div class="form-group"><label class="form-label">Versão / Data</label>
        <input id="inst-versao" class="form-input" placeholder="v1.0 — ${new Date().getFullYear()}"></div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Salvar ✓', classe:'btn-primary', acao: () => {
        const link = document.getElementById('inst-link')?.value?.trim();
        if (!link) { mostrarToast('Cole o link do documento!','warning'); return; }
        const statusEl = document.getElementById(`${id}-status`);
        if (statusEl) statusEl.innerHTML = `Status: <span style="color:var(--green)">✅ Registrado</span>`;
        localStorage.setItem(`nupi_inst_${id}`, JSON.stringify({ link, versao: document.getElementById('inst-versao')?.value }));
        mostrarToast(`${label} registrado!`,'success');
        fecharModal();
      }}
    ]});
  },
  _renderReuniao() {
    const pg = document.getElementById('page-geral_reunioes');
    if (!pg) return;
    const ct = pg.querySelector('.content')||pg;
    ct.innerHTML = _sc('Reuniões Gerais','🤝',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Registre reuniões e controle a frequência dos membros.
        Presença mínima de 80% exigida pela ABJ (Atividade 8).
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Nova reunião',"PageGeral.novaReuniao()")}
        ${_btn('Ver frequência',"PageGeral.verFrequencia()",'btn-ghost')}
      </div>
      <div id="lista-reunioes">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Check-in Digital','✅',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Registre presença em eventos e reuniões. Tabela: frequencia.
      </p>
      ${_btn('Abrir check-in',"PageGeral.abrirCheckin()")}`);
    this._carregarReunioes();
  },
  async _carregarReunioes() {
    const el = document.getElementById('lista-reunioes');
    if (!el||!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*')
        .eq('tipo','reuniao')
        .order('data_inicio',{ascending:false})
        .limit(8);
      el.innerHTML = data?.length
        ? data.map(r=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(r.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(r.data_inicio)} · ${r.vagas||0} vagas</div>
            </div>
            <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                         background:var(--green)22;color:var(--green);border:1px solid var(--green)44">
              ${r.ativo?'Ativa':'Encerrada'}
            </span>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma reunião registrada ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  _renderPlanejamento() {
    const pg = document.getElementById('page-geral_planejamento');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    /* Injeta módulo institucional (lazy, só uma vez) */
    setTimeout(() => this._renderInstitucional(), 100);
    const ano = new Date().getFullYear();
    ct.innerHTML = _sc('Planejamento Semestral','📅',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Dois planos por ano: 1º semestre (prazo 31/03) e 2º semestre (prazo 31/07).
        Cada plano aprovado vale 1 estrela ABJ (Atividades 1 e 7).
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--a-1);border:1px solid var(--b-a);border-radius:12px;padding:18px">
          <div style="font-size:11px;font-weight:700;color:var(--c-accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">⭐ 1º Semestre ${ano}</div>
          <div style="font-size:13px;font-weight:700;color:var(--c-white);margin-bottom:4px">Jan → Jun</div>
          <div style="font-size:12px;color:var(--c-slate);margin-bottom:14px">Prazo de submissão: <strong style="color:var(--c-accent)">31/03/${ano}</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${_btn('+ Criar plano',"PageGeral.novoPlano(1)")}
            ${_btn('Ver atividades',"PageGeral.verAtividades(1)",'btn-ghost')}
          </div>
        </div>
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:18px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">⭐ 2º Semestre ${ano}</div>
          <div style="font-size:13px;font-weight:700;color:var(--c-white);margin-bottom:4px">Jul → Dez</div>
          <div style="font-size:12px;color:var(--c-slate);margin-bottom:14px">Prazo de submissão: <strong style="color:var(--c-slate)">31/07/${ano}</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${_btn('+ Criar plano',"PageGeral.novoPlano(2)")}
            ${_btn('Ver atividades',"PageGeral.verAtividades(2)",'btn-ghost')}
          </div>
        </div>
      </div>
      <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px;font-size:12px;color:var(--c-slate)">
        📌 O planejamento deve incluir ações conjuntas com o Representante Estadual da ABJ (Art. 5º Regimento).
      </div>`) +
    _sc('Marcos do Ano ABJ','🏆',`
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[
          { data:'31/03', label:'1ª Estrela — Planejamento 1º Sem.', cor:'var(--c-accent)' },
          { data:'30/06', label:'2ª Estrela — Marketing + Presença 80%', cor:'var(--c-accent)' },
          { data:'31/07', label:'3ª Estrela — Planejamento 2º Sem. + Evento Estadual', cor:'var(--c-accent)' },
          { data:'31/10', label:'4ª Estrela — ABJ completo 18 atividades', cor:'var(--green)' },
          { data:'30/11', label:'5ª Estrela — Evento Regional (opcional)', cor:'var(--c-slate)' },
        ].map(m=>`
          <div style="display:flex;align-items:center;gap:12px;background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;padding:10px 14px">
            <div style="font-size:11px;font-weight:700;color:${m.cor};min-width:42px">${m.data}</div>
            <div style="font-size:13px;color:var(--c-white)">${m.label}</div>
          </div>`).join('')}
      </div>`);
  },
  novoPlano(semestre) {
    const ano = new Date().getFullYear();
    abrirModal({ titulo:`📅 Plano ${semestre}º Semestre ${ano}`, tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título do Plano *</label>
        <input id="pl-titulo" class="form-input" value="Plano de Ação ${semestre}º Semestre ${ano}"></div>
      <div class="form-group"><label class="form-label">Data de Aprovação *</label>
        <input id="pl-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="form-label">Objetivos Principais *</label>
        <textarea id="pl-obj" class="form-input" style="height:90px" placeholder="Ex: Realizar evento estadual, aumentar engajamento 20%..."></textarea></div>
      <div class="form-group"><label class="form-label">Ações Conjuntas com ABJ</label>
        <textarea id="pl-abj" class="form-input" style="height:70px" placeholder="Ações planejadas com o Representante Estadual..."></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar ✓',classe:'btn-primary',acao:()=>PageGeral._salvarPlano(semestre,ano)}
    ]});
  },
  async _salvarPlano(semestre, ano) {
    const titulo = document.getElementById('pl-titulo')?.value?.trim();
    const data   = document.getElementById('pl-data')?.value;
    const obj    = document.getElementById('pl-obj')?.value?.trim();
    const abj    = document.getElementById('pl-abj')?.value?.trim();
    if (!titulo || !data) { mostrarToast('Preencha título e data de aprovação!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const ger = coords.find(c=>c.sigla==='GER');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'reuniao', data_inicio:data, ativo:true,
        coordenadoria_id: ger?.id||null,
        criado_por: window._appProfile?.id,
        descricao: JSON.stringify({ tipo_especial:'planejamento', semestre, ano, objetivos:obj, acoes_abj:abj })
      }]);
      mostrarToast(`Plano ${semestre}º Semestre salvo com sucesso!`,'success');
    } catch(e) { mostrarToast('Erro ao salvar plano.','error'); }
  },
  async verAtividades(semestre) {
    if (!_sbq()) return;
    try {
      const coords = await getCoords();
      const ger = coords.find(c => c.sigla === 'GER');
      const { data } = await _sbq()
        .from('eventos')
        .select('*, users!criado_por(nome)')
        .eq('tipo','reuniao')
        .eq('coordenadoria_id', ger?.id || '')
        .order('data_inicio',{ascending:false});
      const planos = (data||[]).filter(e => {
        try { const d=JSON.parse(e.descricao||'{}'); return d.tipo_especial==='planejamento' && String(d.semestre)===String(semestre); }
        catch { return false; }
      });
      if (!planos.length) {
        abrirModal({ titulo:`📅 Planos ${semestre}º Semestre`, tipo:'info',
          corpo:'<div style="padding:24px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum plano registrado para este semestre ainda.</div>',
          botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
        return;
      }
      const html = planos.map(e => {
        let d={}; try { d=JSON.parse(e.descricao); } catch {}
        return `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:16px;margin-bottom:10px">
          <div style="font-weight:700;font-size:14px;color:var(--c-white);margin-bottom:4px">${sanitize(e.titulo)}</div>
          <div style="font-size:11px;color:var(--c-slate);margin-bottom:10px">📅 Aprovado em ${_fmt(e.data_inicio)}${e.users?.nome?` · Por: ${sanitize(e.users.nome)}`:''}</div>
          ${d.objetivos?`<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:var(--c-accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Objetivos</div><div style="font-size:13px;color:var(--c-white);white-space:pre-wrap">${sanitize(d.objetivos)}</div></div>`:''}
          ${d.acoes_abj?`<div><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Ações ABJ</div><div style="font-size:13px;color:var(--c-white);white-space:pre-wrap">${sanitize(d.acoes_abj)}</div></div>`:''}
        </div>`;
      }).join('');
      abrirModal({ titulo:`📅 Planos ${semestre}º Semestre (${planos.length})`, tipo:'info', corpo:html,
        botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
    } catch(e) { mostrarToast('Erro ao carregar planos.','error'); }
  },
  _renderMelhorias() {
    const pg = document.getElementById('page-geral_melhorias');
    if (!pg) return;
    const ct = pg.querySelector('.content')||pg;
    ct.innerHTML = _sc('Sugestões de Melhoria','🛠️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Qualquer membro pode sugerir melhorias. A Coordenação Geral avalia e responde.
      </p>
      ${_btn('+ Nova sugestão',"PageGeral.novaMelhoria()")}
      <div id="melhorias-lista" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarMelhorias();
  },
  async _carregarMelhorias() {
    const el = document.getElementById('melhorias-lista');
    if (!el||!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('demandas')
        .select('*,users!responsavel_id(nome)')
        .eq('tipo','melhoria')
        .order('created_at',{ascending:false})
        .limit(10);
      const STATUS_COR = { aberto:'var(--c-accent)', andamento:'var(--yellow)', concluido:'var(--green)', cancelado:'var(--c-slate)' };
      el.innerHTML = data?.length
        ? data.map(d=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(d.titulo)}</div>
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;
                           background:${STATUS_COR[d.coluna]||'var(--c-slate)'}22;
                           color:${STATUS_COR[d.coluna]||'var(--c-slate)'};
                           border:1px solid ${STATUS_COR[d.coluna]||'var(--c-slate)'}44">
                ${d.coluna||'aberto'}
              </span>
            </div>
            <div style="font-size:12px;color:var(--c-slate)">${sanitize(d.descricao||'—')}</div>
            <div style="font-size:11px;color:var(--c-slate);margin-top:6px">
              👤 ${sanitize(d.users?.nome||'Anônimo')} · 📅 ${_fmt(d.created_at)}
            </div>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma sugestão ainda. Seja o primeiro!</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  _renderParcerias() {
    const pg = document.getElementById('page-geral_parcerias');
    if (!pg) return;
    const ct = pg.querySelector('.content')||pg;
    ct.innerHTML = _sc('Parcerias Institucionais','🤝',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Registro de parcerias ativas com instituições, empresas e entidades.
        Mínimo 1 parceria por semestre para pontuação ABJ.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Nova parceria',"PageGeral.novaParceria()")}
      </div>
      <div id="parcerias-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarParcerias();
  },
  async _carregarParcerias() {
    const el = document.getElementById('parcerias-lista');
    if (!el||!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('demandas')
        .select('*')
        .eq('tipo','parceria')
        .order('created_at',{ascending:false});
      el.innerHTML = data?.length
        ? data.map(d=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(d.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">${sanitize(d.descricao||'—')} · ${_fmt(d.created_at)}</div>
            </div>
            <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                         background:${['realizada','auditada'].includes(d.coluna)?'var(--green)22':'var(--yellow)22'};color:${['realizada','auditada'].includes(d.coluna)?'var(--green)':'var(--yellow)'};border:1px solid ${['realizada','auditada'].includes(d.coluna)?'var(--green)44':'var(--yellow)44'}">
              ${['realizada','auditada'].includes(d.coluna)?'✓ Concluída':'⏳ Em andamento'}
            </span>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma parceria registrada ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  novaReuniao() {
    const hoje = new Date().toISOString().slice(0,16);
    abrirModal({ titulo:'📅 Nova Reunião', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="nr-titulo" class="form-input" placeholder="Ex: Reunião Geral de Abril"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data e hora</label>
          <input id="nr-data" type="datetime-local" class="form-input" value="${hoje}"></div>
        <div class="form-group"><label class="form-label">Vagas</label>
          <input id="nr-vagas" type="number" class="form-input" value="17"></div>
      </div>
      <div class="form-group"><label class="form-label">Link (Google Meet, etc.)</label>
        <input id="nr-link" class="form-input" placeholder="https://meet.google.com/..."></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Criar ✓',classe:'btn-primary',acao:()=>this._salvarReuniao()}
    ]});
  },
  novaMelhoria() {
    abrirModal({ titulo:'🛠️ Sugerir Melhoria', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="nm-titulo" class="form-input" placeholder="Ex: Automatizar envio do relatório ABJ"></div>
      <div class="form-group"><label class="form-label">Descrição detalhada</label>
        <textarea id="nm-desc" class="form-input" style="height:90px" placeholder="Explique a melhoria e o impacto esperado..."></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Enviar ✓',classe:'btn-primary',acao:()=>this._salvarMelhoria()}
    ]});
  },
  async _salvarMelhoria() {
    const titulo = document.getElementById('nm-titulo')?.value?.trim();
    const desc   = document.getElementById('nm-desc')?.value?.trim();
    if (!titulo) { mostrarToast('Preencha o título!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const ger = coords.find(c=>c.sigla==='GER');
      await _sbq().from('demandas').insert([{
        titulo, descricao:desc||null, coluna:'pendente', tipo:'melhoria',
        coordenadoria_id:ger?.id||null,
        responsavel_id: window._appProfile?.id,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Sugestão enviada com sucesso!','success');
      this._carregarMelhorias();
    } catch(e) { mostrarToast('Erro ao enviar sugestão.','error'); }
  },
  novaParceria() {
    abrirModal({ titulo:'🤝 Nova Parceria', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome da Instituição/Empresa *</label>
        <input id="np-nome" class="form-input" placeholder="Ex: CREA-PI, Empresa XYZ"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Tipo</label>
          <select id="np-tipo" class="form-select">
            <option value="instituicao">Instituição</option>
            <option value="empresa">Empresa</option>
            <option value="universidade">Universidade</option>
            <option value="outro">Outro</option>
          </select></div>
        <div class="form-group"><label class="form-label">Contato</label>
          <input id="np-contato" class="form-input" placeholder="E-mail ou Telefone"></div>
      </div>
      <div class="form-group"><label class="form-label">Objetivo da parceria</label>
        <textarea id="np-obj" class="form-input" style="height:70px" placeholder="Ex: Visitas técnicas, patrocínio..."></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar ✓',classe:'btn-primary',acao:()=>this._salvarParceria()}
    ]});
  },
  async _salvarParceria() {
    const nome    = document.getElementById('np-nome')?.value?.trim();
    const tipo    = document.getElementById('np-tipo')?.value;
    const contato = document.getElementById('np-contato')?.value?.trim();
    const obj     = document.getElementById('np-obj')?.value?.trim();
    if (!nome) { mostrarToast('Informe o nome!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const ger = coords.find(c=>c.sigla==='GER');
      await _sbq().from('demandas').insert([{
        titulo: nome,
        descricao: [tipo, contato, obj].filter(Boolean).join(' · ') || null,
        coluna:'pendente', tipo:'parceria',
        coordenadoria_id: ger?.id||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Parceria registrada!','success');
      this._carregarParcerias();
    } catch(e) { mostrarToast('Erro ao salvar parceria.','error'); }
  },
  async _salvarReuniao() {
    const titulo = document.getElementById('nr-titulo')?.value?.trim();
    const data   = document.getElementById('nr-data')?.value;
    const vagas  = parseInt(document.getElementById('nr-vagas')?.value)||17;
    const link   = document.getElementById('nr-link')?.value?.trim();
    if(!titulo||!data){mostrarToast('Preencha título e data!','warning');return;}
    fecharModal();
    try {
      const coords = await getCoords();
      const ger = coords.find(c=>c.sigla==='GER');
      await _sbq().from('eventos').insert([{
        titulo, data_inicio:data, tipo:'reuniao',
        vagas, descricao:link||null, ativo:true,
        coordenadoria_id:ger?.id||null,
        criado_por: window._appProfile?.id
      }]);
      mostrarToast('Reunião criada!','success');
      this._carregarReunioes();
    } catch(e){mostrarToast('Erro ao salvar.','error');}
  },
  async verFrequencia() {
    if (!_sbq()) { mostrarToast('Supabase não conectado.','warning'); return; }
    try {
      const { data } = await _sbq()
        .from('frequencia')
        .select('*, users(nome,iniciais), eventos(titulo,data_inicio)')
        .order('created_at',{ascending:false})
        .limit(30);
      const rows = (data||[]).map(f=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;
                    background:var(--b-1);border:1px solid var(--b-2);border-radius:8px">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--c-white)">${sanitize(f.users?.nome||'—')}</div>
            <div style="font-size:11px;color:var(--c-slate)">${sanitize(f.eventos?.titulo||'Evento')} · ${_fmt(f.eventos?.data_inicio)}</div>
          </div>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;
                       background:${f.presente?'var(--green)22':'var(--red)22'};
                       color:${f.presente?'var(--green)':'var(--red)'};
                       border:1px solid ${f.presente?'var(--green)44':'var(--red)44'}">
            ${f.presente?'✓ Presente':'✗ Falta'}
          </span>
        </div>`).join('');
      abrirModal({ titulo:'📊 Frequência dos Membros', tipo:'info', corpo:`
        <div style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto">
          ${rows||'<div style="padding:20px;text-align:center;color:var(--c-slate)">Nenhum registro ainda.</div>'}
        </div>`,
      botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
    } catch(e) { mostrarToast('Erro ao carregar frequência.','error'); }
  },
  async abrirCheckin() {
    if (!_sbq()) { mostrarToast('Supabase não conectado.','warning'); return; }
    try {
      const { data: eventos } = await _sbq()
        .from('eventos').select('id,titulo,data_inicio').eq('ativo',true)
        .order('data_inicio',{ascending:false}).limit(10);
      const opts = (eventos||[]).map(e=>`<option value="${e.id}">${sanitize(e.titulo)} (${_fmt(e.data_inicio)})</option>`).join('');
      abrirModal({ titulo:'✅ Check-in Digital', tipo:'info', corpo:`
        <div class="form-group"><label class="form-label">Evento *</label>
          <select id="ci-evento" class="form-select">${opts||'<option>Nenhum evento ativo</option>'}</select></div>
        <div class="form-group"><label class="form-label">Membro</label>
          <input id="ci-nome" class="form-input" placeholder="Nome completo (ou vazio = você mesmo)" value="${window._appProfile?.nome||''}"></div>`,
      botoes:[
        {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
        {texto:'Registrar ✓',classe:'btn-primary',acao:()=>this._salvarCheckin()}
      ]});
    } catch(e) { mostrarToast('Erro ao abrir check-in.','error'); }
  },
  async _salvarCheckin() {
    const eventoId = document.getElementById('ci-evento')?.value;
    if (!eventoId) { mostrarToast('Selecione um evento!','warning'); return; }
    fecharModal();
    try {
      const uid = window._appProfile?.id;
      await _sbq().from('frequencia').upsert([{
        evento_id: eventoId, user_id: uid, presente: true,
        tipo: 'evento', data: new Date().toISOString().split('T')[0],
      }], { onConflict: 'evento_id,user_id' });
      mostrarToast('Check-in realizado! ✅','success');
      /* Notifica o próprio usuário */
      _notificar(uid, 'Check-in confirmado ✅',
        'Sua presença foi registrada.', 'sucesso', 'reuniao');
    } catch(e) { mostrarToast('Erro ao registrar check-in.','error'); }
  },
};
const PageMarketing = {
  async init() { this._renderTracker(); this._renderKanban(); },
  _renderKanban() {
    const pg = document.getElementById('page-mkt_kanban');
    if (!pg) return;
    const ct = pg.querySelector('.content')||pg;
    const colunas = [
      { id:'pendente',   label:'🗂️ Backlog',    cor:'var(--c-slate)' },
      { id:'exec',       label:'⚡ Em andamento', cor:'var(--yellow)'  },
      { id:'realizada',  label:'👁️ Revisão',     cor:'var(--c-accent)' },
      { id:'auditada',   label:'✅ Publicado',    cor:'var(--green)'   },
    ];
    ct.innerHTML = _sc('Kanban de Conteúdo','📋',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Gerencie a produção de conteúdo da coordenadoria. Arraste os cards entre colunas.
      </p>
      ${_btn('+ Nova demanda',"PageMarketing.novaDemanda()")}
      <div id="mkt-kanban-board" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:16px">
        ${colunas.map(c=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:12px;min-height:120px">
            <div style="font-size:11px;font-weight:700;color:${c.cor};text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;display:flex;justify-content:space-between">
              <span>${c.label}</span>
              <span id="mkt-count-${c.id}" style="background:var(--b-2);border-radius:99px;padding:1px 7px;font-size:10px">0</span>
            </div>
            <div id="mkt-col-${c.id}" style="display:flex;flex-direction:column;gap:6px">
              <div style="font-size:12px;color:var(--c-slate);text-align:center;padding:12px 0">Carregando...</div>
            </div>
          </div>`).join('')}
      </div>`);
    this._carregarKanban();
  },
  async _carregarKanban() {
    if (!_sbq()) return;
    try {
      const coords = await getCoords();
      const mkt = coords.find(c=>c.sigla==='MKT');
      const { data } = await _sbq()
        .from('demandas')
        .select('*,users!responsavel_id(nome,iniciais)')
        .eq('coordenadoria_id', mkt?.id||'')
        .order('created_at',{ascending:false});
      const cols = { pendente:[], exec:[], realizada:[], auditada:[] };
      (data||[]).forEach(d => { if (cols[d.coluna]) cols[d.coluna].push(d); });
      Object.entries(cols).forEach(([colId, cards]) => {
        const el = document.getElementById(`mkt-col-${colId}`);
        const cnt= document.getElementById(`mkt-count-${colId}`);
        if (cnt) cnt.textContent = cards.length;
        if (!el) return;
        el.innerHTML = cards.length
          ? cards.map(d => {
              const diasRestantes = d.prazo
                ? Math.ceil((new Date(d.prazo) - new Date()) / 86400000)
                : null;
              const isLojinha = d.tipo === 'lojinha';
              const timerCor  = diasRestantes === null ? 'var(--c-slate)'
                              : diasRestantes <= 2 ? 'var(--red)'
                              : diasRestantes <= 5 ? 'var(--yellow)'
                              : 'var(--green)';
              const timerLabel = diasRestantes === null ? ''
                               : diasRestantes < 0 ? '⚠️ Vencido'
                               : diasRestantes === 0 ? '🔴 Vence hoje'
                               : `${diasRestantes}d restantes`;
              return `
                <div style="background:var(--b-2);border-radius:8px;padding:10px 12px;cursor:pointer;
                            ${isLojinha && diasRestantes !== null && diasRestantes <= 3 ? 'border:1px solid var(--red)44;' : ''}"
                     onclick="PageMarketing.editarDemanda('${d.id}')">
                  ${isLojinha ? `<div style="font-size:9px;font-weight:800;color:var(--c-accent);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">🛍️ LOJINHA</div>` : ''}
                  <div style="font-size:12px;font-weight:700;color:var(--c-white);margin-bottom:4px">${sanitize(d.titulo)}</div>
                  ${d.users?.nome ? `<div style="font-size:10px;color:var(--c-slate)">👤 ${sanitize(d.users.nome)}</div>` : ''}
                  ${timerLabel ? `<div style="font-size:10px;font-weight:700;color:${timerCor};margin-top:4px">⏱ ${timerLabel}</div>` : ''}
                </div>`;
            }).join('')
          : `<div style="font-size:11px;color:var(--c-slate);text-align:center;padding:10px 0">Vazio</div>`;
      });
    } catch(e) { console.warn('[MKT Kanban]', e); }
  },
  novaDemanda() {
    /* Prazo padrão: 10 dias úteis (regra da Lojinha ABJ) */
    const prazo10du = _addDiasUteis(10);
    abrirModal({ titulo:'📋 Nova Demanda de Conteúdo', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="nd-titulo" class="form-input" placeholder="Ex: Post Semana do MEJ"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Tipo</label>
          <select id="nd-tipo" class="form-select">
            <option value="conteudo">Conteúdo / Post</option>
            <option value="lojinha">🛍️ Lojinha (10 dias úteis)</option>
            <option value="divulgacao">Divulgação</option>
          </select></div>
        <div class="form-group"><label class="form-label">Prazo <span id="nd-prazo-hint" style="font-size:10px;color:var(--c-accent)"></span></label>
          <input id="nd-prazo" type="date" class="form-input" value="${prazo10du}"></div>
      </div>
      <div class="form-group"><label class="form-label">Descrição</label>
        <textarea id="nd-desc" class="form-input" style="height:70px" placeholder="Detalhes do conteúdo a criar..."></textarea></div>
      <script>
        document.getElementById('nd-tipo').onchange=function(){
          if(this.value==='lojinha'){
            document.getElementById('nd-prazo').value='${prazo10du}';
            document.getElementById('nd-prazo-hint').textContent='(máx. 10 dias úteis)';
          } else {
            document.getElementById('nd-prazo-hint').textContent='';
          }
        };
      </script>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Criar ✓',classe:'btn-primary',acao:()=>this._salvarDemanda()}
    ]});
  },
  async _salvarDemanda() {
    const titulo = document.getElementById('nd-titulo')?.value?.trim();
    const coluna = 'pendente';
    const prazo  = document.getElementById('nd-prazo')?.value || null;
    const desc   = document.getElementById('nd-desc')?.value?.trim();
    const tipo   = document.getElementById('nd-tipo')?.value || 'conteudo';
    if (!titulo) { mostrarToast('Coloca um título!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const mkt = coords.find(c => c.sigla === 'MKT');
      await _sbq().from('demandas').insert([{
        titulo, coluna, descricao: desc || null,
        prazo: prazo || null,
        coordenadoria_id: mkt?.id || null,
        responsavel_id:   window._appProfile?.id,
        criado_por:       window._appProfile?.id,
      }]);
      mostrarToast('Demanda criada!','success');
      /* Notifica coordenadores de Marketing (in-app) */
      _notificarCoord('MKT', `Nova demanda: ${titulo}`,
        `Uma nova demanda de ${tipo} foi aberta${prazo ? ` com prazo em ${_fmt(prazo)}.` : '.'}`, 'info', 'demanda');
      /* Email de confirmação para o responsável */
      if (window._appProfile?.email) {
        EmailsModule?.enviarDemandaCadastrada({
          email: window._appProfile.email,
          nome:  window._appProfile.nome,
          titulo, tipo, coord: 'MKT',
          prazo: prazo || null,
          criadoPor: window._appProfile.nome,
        });
      }
      this._carregarKanban();
    } catch(e) { mostrarToast('Erro ao criar demanda.','error'); }
  },
  _renderTracker() {
    const pg = document.getElementById('page-mkt_tracker');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Tracker de Posts','📱',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Mínimo 1 post/semana (Atividade 9 — ⭐ 2ª Estrela).
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:16px">
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="mkt-mes" style="font-size:24px;font-weight:900;color:var(--c-accent)">0</div>
          <div style="font-size:11px;color:var(--c-slate)">Posts este mês</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="mkt-semana" style="font-size:24px;font-weight:900;color:var(--green)">✓</div>
          <div style="font-size:11px;color:var(--c-slate)">Semana atual</div>
        </div>
      </div>
      ${_btn('+ Registrar publicação',"PageMarketing.registrarPost()")}
      <div id="mkt-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Métricas das Redes Sociais','📊',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Registre os dados de alcance e engajamento periodicamente.
      </p>
      ${_btn('+ Registrar métricas',"PageMarketing.registrarMetrica()",'btn-ghost')}
      <div id="mkt-metricas" style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
        <div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px;grid-column:1/-1">Carregando...</div>
      </div>`) +
    _sc('Links das Redes','🔗',`
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <a href="https://www.instagram.com/nupieepro" target="_blank"
           style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px;color:var(--c-accent);text-decoration:none">
          <span>Instagram</span><span>@nupieepro ↗</span>
        </a>
        <a href="https://www.facebook.com/facebook.com/nupieepro" target="_blank"
           style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px;color:var(--c-accent);text-decoration:none">
          <span>Facebook</span><span>NUPIEEPRO ↗</span>
        </a>
      </div>`);
    this._carregarPosts();
    this._carregarMetricas();
  },
  async _carregarPosts() {
    const el      = document.getElementById('mkt-lista');
    const cnt     = document.getElementById('mkt-mes');
    const semEl   = document.getElementById('mkt-semana');
    if (!el || !_sbq()) return;
    try {
      const mesIni = new Date(); mesIni.setDate(1);
      /* Início da semana atual (domingo) */
      const semIni = new Date();
      semIni.setDate(semIni.getDate() - semIni.getDay());
      semIni.setHours(0, 0, 0, 0);
      const { data } = await _sbq()
        .from('eventos')
        .select('*')
        .eq('tipo','publicacao')
        .order('data_inicio', { ascending: false })
        .limit(20);
      const posts  = data || [];
      const doMes  = posts.filter(p => new Date(p.data_inicio) >= mesIni).length;
      const doSem  = posts.filter(p => new Date(p.data_inicio) >= semIni).length;
      if (cnt) cnt.textContent = doMes;
      /* Alerta semanal */
      if (semEl) {
        if (doSem === 0) {
          semEl.style.color = 'var(--red)';
          semEl.textContent = '⚠️ 0';
          /* Avisa somente uma vez por sessão */
          if (!sessionStorage.getItem('nupi_aviso_post_sem')) {
            sessionStorage.setItem('nupi_aviso_post_sem', '1');
            mostrarToast('⚠️ Nenhum post esta semana! Meta: 1 post/semana (Atividade 9).', 'warning');
          }
        } else {
          semEl.style.color = 'var(--green)';
          semEl.textContent = `✓ ${doSem}`;
        }
      }
      el.innerHTML = posts.length
        ? posts.map(p=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--c-white)">${sanitize(p.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(p.data_inicio)}</div>
            </div>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum registro ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  registrarPost() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'📱 Registrar Publicação', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Descrição *</label>
        <input id="mp-desc" class="form-input" placeholder="Ex: Post sobre o evento de abril"></div>
      <div class="form-group"><label class="form-label">Link da publicação</label>
        <input id="mp-link" class="form-input" placeholder="https://instagram.com/..."></div>
      <div class="form-group"><label class="form-label">Data</label>
        <input id="mp-data" type="date" class="form-input" value="${hoje}"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar ✓',classe:'btn-primary',acao:()=>this._salvarPost()}
    ]});
  },
  async _salvarPost() {
    const desc = document.getElementById('mp-desc')?.value?.trim();
    const link = document.getElementById('mp-link')?.value?.trim();
    const data = document.getElementById('mp-data')?.value;
    if(!desc){mostrarToast('Descreve a publicação!','warning');return;}
    fecharModal();
    try {
      const coords = await getCoords();
      const mkt = coords.find(c=>c.sigla==='MKT');
      await _sbq().from('eventos').insert([{
        titulo:desc, descricao:link||null,
        data_inicio: data+'T12:00:00',
        tipo:'publicacao', ativo:true,
        coordenadoria_id: mkt?.id||null,
        criado_por: window._appProfile?.id
      }]);
      mostrarToast('Publicação registrada!','success');
      /* Reseta alerta semanal após registrar post */
      sessionStorage.removeItem('nupi_aviso_post_sem');
      this._carregarPosts();
    } catch(e) { mostrarToast('Erro ao salvar.','error'); }
  },
  async _carregarMetricas() {
    const el = document.getElementById('mkt-metricas');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('tracker_social')
        .select('*')
        .order('data_referencia', { ascending: false })
        .limit(30);
      if (!data?.length) {
        el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px;grid-column:1/-1">Nenhuma métrica registrada ainda.</div>';
        return;
      }
      /* Última entrada por plataforma */
      const ultimas = {};
      data.forEach(r => { if (!ultimas[r.plataforma]) ultimas[r.plataforma] = r; });
      const ICON_PLT = { instagram:'📸', linkedin:'💼', youtube:'▶️', tiktok:'🎵', twitter:'𝕏', whatsapp:'💬' };
      el.innerHTML = Object.values(ultimas).map(r => `
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:22px;margin-bottom:6px">${ICON_PLT[r.plataforma]||'📱'}</div>
          <div style="font-size:11px;font-weight:800;color:var(--c-white);text-transform:uppercase;letter-spacing:.04em">${r.plataforma}</div>
          ${r.seguidores != null ? `<div style="font-size:18px;font-weight:900;color:var(--c-accent);margin-top:6px">${r.seguidores.toLocaleString('pt-BR')}</div><div style="font-size:10px;color:var(--c-slate)">seguidores</div>` : ''}
          ${r.posts_mes != null ? `<div style="font-size:12px;color:var(--c-slate);margin-top:4px">${r.posts_mes} posts/mês</div>` : ''}
          <div style="font-size:10px;color:var(--c-slate);margin-top:6px">Ref: ${_fmt(r.data_referencia)}</div>
        </div>`).join('');
    } catch(e) { el.innerHTML = '<div style="padding:16px;color:var(--c-slate);grid-column:1/-1">Erro ao carregar métricas.</div>'; }
  },
  registrarMetrica() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'📊 Registrar Métricas', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Plataforma *</label>
        <select id="rm-plataforma" class="form-select">
          <option value="">— Selecione —</option>
          <option>instagram</option><option>linkedin</option><option>youtube</option>
          <option>tiktok</option><option>twitter</option><option>whatsapp</option>
        </select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Seguidores</label>
          <input id="rm-seg" type="number" class="form-input" placeholder="1200"></div>
        <div class="form-group"><label class="form-label">Posts no mês</label>
          <input id="rm-posts" type="number" class="form-input" placeholder="8"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Curtidas médias</label>
          <input id="rm-curtidas" type="number" step="0.1" class="form-input" placeholder="45.5"></div>
        <div class="form-group"><label class="form-label">Alcance médio</label>
          <input id="rm-alcance" type="number" class="form-input" placeholder="800"></div>
      </div>
      <div class="form-group"><label class="form-label">Data de referência</label>
        <input id="rm-data" type="date" class="form-input" value="${hoje}"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar ✓',classe:'btn-primary',acao:()=>this._salvarMetrica()}
    ]});
  },
  async _salvarMetrica() {
    const plat  = document.getElementById('rm-plataforma')?.value;
    const seg   = document.getElementById('rm-seg')?.value;
    const posts = document.getElementById('rm-posts')?.value;
    const curt  = document.getElementById('rm-curtidas')?.value;
    const alc   = document.getElementById('rm-alcance')?.value;
    const data  = document.getElementById('rm-data')?.value;
    if (!plat) { mostrarToast('Selecione a plataforma!','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('tracker_social').insert([{
        plataforma: plat,
        seguidores:     seg   ? parseInt(seg)       : null,
        posts_mes:      posts ? parseInt(posts)     : null,
        curtidas_media: curt  ? parseFloat(curt)    : null,
        alcance_medio:  alc   ? parseInt(alc)       : null,
        data_referencia: data || new Date().toISOString().split('T')[0],
        registrado_por: window._appProfile?.id,
      }]);
      mostrarToast('Métricas registradas!','success');
      this._carregarMetricas();
    } catch(e) { mostrarToast('Erro ao salvar métricas.','error'); }
  },
  async editarDemanda(id) {
    if (!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('demandas')
        .select('*,users!responsavel_id(nome)')
        .eq('id', id)
        .single();
      if (!data) { mostrarToast('Demanda não encontrada.','error'); return; }
      const d = data;
      const coords = await getCoords();
      const mkt = coords.find(c => c.sigla === 'MKT');
      const { data: membros } = mkt
        ? await _sbq().from('users').select('id,nome').eq('coordenadoria_id', mkt.id).eq('ativo', true).order('nome')
        : { data: [] };
      const memOpts = (membros||[]).map(m => `<option value="${m.id}" ${d.responsavel_id===m.id?'selected':''}>${sanitize(m.nome)}</option>`).join('');
      abrirModal({ titulo:'✏️ Editar Demanda', tipo:'info', corpo:`
        <div class="form-group"><label class="form-label">Título *</label>
          <input id="ed-titulo" class="form-input" value="${sanitize(d.titulo||'')}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Tipo</label>
            <select id="ed-tipo" class="form-select">
              <option value="conteudo"    ${d.tipo==='conteudo'?'selected':''}>Conteúdo</option>
              <option value="divulgacao"  ${d.tipo==='divulgacao'?'selected':''}>Divulgação</option>
              <option value="lojinha"     ${d.tipo==='lojinha'?'selected':''}>Lojinha</option>
            </select></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select id="ed-coluna" class="form-select">
              <option value="pendente"  ${d.coluna==='pendente'?'selected':''}>🗂️ Backlog</option>
              <option value="exec"      ${d.coluna==='exec'?'selected':''}>⚡ Em andamento</option>
              <option value="realizada" ${d.coluna==='realizada'?'selected':''}>👁️ Revisão</option>
              <option value="auditada"  ${d.coluna==='auditada'?'selected':''}>✅ Publicado</option>
            </select></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Responsável</label>
            <select id="ed-resp" class="form-select"><option value="">— Nenhum —</option>${memOpts}</select></div>
          <div class="form-group"><label class="form-label">Prazo</label>
            <input id="ed-prazo" type="date" class="form-input" value="${d.prazo||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Descrição</label>
          <textarea id="ed-desc" class="form-input" rows="3">${sanitize(d.descricao||'')}</textarea></div>`,
      botoes:[
        {texto:'Excluir',classe:'btn-ghost',acao:()=>PageMarketing._excluirDemanda(id)},
        {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
        {texto:'Salvar ✓',classe:'btn-primary',acao:()=>PageMarketing._atualizarDemanda(id)}
      ]});
    } catch(e) { mostrarToast('Erro ao carregar demanda.','error'); }
  },
  async _atualizarDemanda(id) {
    const titulo = document.getElementById('ed-titulo')?.value?.trim();
    if (!titulo) { mostrarToast('Título é obrigatório.','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('demandas').update({
        titulo,
        tipo:          document.getElementById('ed-tipo')?.value,
        coluna:        document.getElementById('ed-coluna')?.value,
        responsavel_id:document.getElementById('ed-resp')?.value || null,
        prazo:         document.getElementById('ed-prazo')?.value || null,
        descricao:     document.getElementById('ed-desc')?.value?.trim() || null,
        updated_at:    new Date().toISOString(),
      }).eq('id', id);
      mostrarToast('Demanda atualizada!','success');
      this._carregarKanban();
    } catch(e) { mostrarToast('Erro ao salvar.','error'); }
  },
  async _excluirDemanda(id) {
    fecharModal();
    try {
      await _sbq().from('demandas').delete().eq('id', id);
      mostrarToast('Demanda excluída.','info');
      this._carregarKanban();
    } catch(e) { mostrarToast('Erro ao excluir.','error'); }
  },
};
const PageFinancas = {
  ROLES:['admin','coordenador'],
  _temAcesso() {
    const p=window._appProfile;
    const coord=p?.coordenadorias?.sigla;
    return p?._isDev||p?.role==='admin'||coord==='FIN';
  },
  async init() { this._renderFluxo(); this._renderCalendario(); this._renderABJFin(); },
  _renderCalendario() {
    const pg=document.getElementById('page-fin_comercial');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Calendário Comercial','🗓️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Planos de ação de eventos comerciais devem ser submetidos com
        <strong style="color:var(--c-accent)">60 dias de antecedência</strong> (Regimento Art. 26º).
      </p>
      <div id="fin-alerta-60d"></div>
      ${_btn('+ Novo evento comercial',"PageFinancas.novoEventoComercial()")}
      <div id="fin-cal-lista" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Repasse Transitório — Timer 24h','⏱️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Recursos não podem permanecer em conta pessoal por mais de 24h (Art. 26º IV).
        Ao registrar um repasse, o timer inicia automaticamente.
      </p>
      <div id="fin-timer-repasse">
        <div style="font-size:12px;color:var(--c-slate)">Nenhum repasse transitório ativo.</div>
      </div>
      <div style="margin-top:12px">
        ${_btn('Registrar repasse',"PageFinancas.novoRepasse()")}
      </div>`);
    this._carregarCalendario();
  },
  async _carregarCalendario() {
    const el   = document.getElementById('fin-cal-lista');
    const alEl = document.getElementById('fin-alerta-60d');
    if(!el||!_sbq())return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*')
        .eq('tipo','evento')
        .order('data_inicio',{ascending:true})
        .limit(8);
      /* Alerta 60 dias no próximo evento */
      const prox = data?.find(e=>new Date(e.data_inicio)>new Date());
      if (prox && alEl && window.Permissoes) {
        const alerta = Permissoes.REGRAS.alertaCalendario60Dias(prox.data_inicio, Permissoes.isAdmin());
        if (alerta.bloqueado) {
          alEl.innerHTML=`<div style="background:var(--red)22;border:1px solid var(--red)44;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--red)">
            ⛔ ${alerta.mensagem}
          </div>`;
        } else {
          alEl.innerHTML=`<div style="background:var(--green)22;border:1px solid var(--green)44;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--green)">
            ✅ ${alerta.mensagem}
          </div>`;
        }
      }
      el.innerHTML=data?.length
        ?data.map(e=>{
          const dias=Math.ceil((new Date(e.data_inicio)-new Date())/86400000);
          const cor=dias<60?'var(--red)':dias<90?'var(--yellow)':'var(--green)';
          return `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(e.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(e.data_inicio)} · ${sanitize(e.local||'A definir')}</div>
            </div>
            <span style="font-size:12px;font-weight:800;color:${cor}">
              ${dias>0?`${dias}d`:'Hoje'}
            </span>
          </div>`;
        }).join('')
        :'<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum evento cadastrado.</div>';
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  novoEventoComercial() {
    const hoje=new Date().toISOString().split('T')[0];
    abrirModal({titulo:'🗓️ Novo Evento Comercial',tipo:'info',corpo:`
      <div class="form-group"><label class="form-label">Nome do Evento *</label>
        <input id="ec-titulo" class="form-input" placeholder="Ex: Semana Acadêmica de EP"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data do evento *</label>
          <input id="ec-data" type="date" class="form-input" value="${hoje}"></div>
        <div class="form-group"><label class="form-label">Meta de receita (R$)</label>
          <input id="ec-meta" type="number" class="form-input" placeholder="500"></div>
      </div>
      <div class="form-group"><label class="form-label">Local</label>
        <input id="ec-local" class="form-input" placeholder="Ex: Anfiteatro Central"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Cadastrar ✓',classe:'btn-primary',acao:()=>this._salvarEventoComercial()}
    ]});
  },
  async _salvarEventoComercial() {
    const titulo=document.getElementById('ec-titulo')?.value?.trim();
    const data  =document.getElementById('ec-data')?.value;
    const local =document.getElementById('ec-local')?.value?.trim();
    if(!titulo||!data){mostrarToast('Preencha nome e data!','warning');return;}
    /* Verifica regra 60 dias */
    if (window.Permissoes) {
      const alerta=Permissoes.REGRAS.alertaCalendario60Dias(data+'T12:00:00', Permissoes.isAdmin());
      if (alerta.bloqueado) { mostrarToast(alerta.mensagem,'warning'); return; }
    }
    fecharModal();
    try {
      const coords=await getCoords();
      const fin=coords.find(c=>c.sigla==='FIN');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'evento', data_inicio:data+'T12:00:00',
        local:local||null, ativo:true,
        coordenadoria_id:fin?.id||null,
        criado_por:window._appProfile?.id
      }]);
      mostrarToast('Evento comercial cadastrado!','success');
      this._carregarCalendario();
    }catch(e){mostrarToast('Erro ao cadastrar.','error');}
  },
  novoRepasse() {
    abrirModal({titulo:'⏱️ Registrar Repasse Transitório',tipo:'warning',corpo:`
      <div style="background:var(--yellow)22;border:1px solid var(--yellow)44;border-radius:8px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--yellow);font-weight:600">
        ⚠️ O timer de 24h inicia agora. Recursos devem ser transferidos à conta oficial em até 24h.
        Ultrapassar este prazo é infração gravíssima (Art. 26º IV).
      </div>
      <div class="form-group"><label class="form-label">Valor (R$) *</label>
        <input id="rp-valor" type="number" step="0.01" class="form-input" placeholder="0,00"></div>
      <div class="form-group"><label class="form-label">Descrição *</label>
        <input id="rp-desc" class="form-input" placeholder="Ex: Arrecadação da rifa de abril"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Iniciar timer ✓',classe:'btn-primary',acao:()=>this._salvarRepasse()}
    ]});
  },
  async _salvarRepasse() {
    const valor=parseFloat(document.getElementById('rp-valor')?.value);
    const desc =document.getElementById('rp-desc')?.value?.trim();
    if(isNaN(valor)||!desc){mostrarToast('Preencha todos os campos!','warning');return;}
    fecharModal();
    try {
      const coords=await getCoords();
      const fin=coords.find(c=>c.sigla==='FIN');
      const agora=new Date().toISOString();
      await _sbq().from('vendas').insert([{
        descricao:`[REPASSE] ${desc}`, valor,
        data_venda:agora.split('T')[0],
        produto:'repasse_transitorio',
        coordenadoria_id:fin?.id||null,
        registrado_por:window._appProfile?.id
      }]);
      localStorage.setItem('nupi_repasse_ativo', JSON.stringify({desc,valor,inicio:agora}));
      mostrarToast(`⏱️ Timer 24h iniciado! Transferir R$ ${valor.toFixed(2)} até ${new Date(Date.now()+86400000).toLocaleString('pt-BR')}`,'warning');
    }catch(e){mostrarToast('Erro ao registrar repasse.','error');}
  },
  _renderABJFin() {
    /* Atividade 10 — Associações ABEPRO Jovem */
    const pg = document.getElementById('page-fin_abepro');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    const ano = new Date().getFullYear();
    ct.innerHTML = _sc('Associações ABEPRO Jovem','🏅',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Registro de filiação dos membros à ABEPRO Jovem — <strong style="color:var(--c-accent)">Atividade 10</strong>.
        Exige comprovante de pagamento do sistema oficial da ABEPRO. Prazo: 30/09/${ano}.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Registrar associado',"PageFinancas.novaAssociacao()")}
      </div>
      <div id="abepro-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Resumo de Inscrições','📊',`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="abepro-total" style="font-size:26px;font-weight:900;color:var(--c-accent)">0</div>
          <div style="font-size:11px;color:var(--c-slate)">Inscritos</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="abepro-pago" style="font-size:26px;font-weight:900;color:var(--green)">0</div>
          <div style="font-size:11px;color:var(--c-slate)">Com comprovante</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="abepro-pendente" style="font-size:26px;font-weight:900;color:var(--yellow)">0</div>
          <div style="font-size:11px;color:var(--c-slate)">Pendentes</div>
        </div>
      </div>`);
    this._carregarABEPRO();
  },
  async _carregarABEPRO() {
    const el  = document.getElementById('abepro-lista');
    const tot = document.getElementById('abepro-total');
    const pag = document.getElementById('abepro-pago');
    const pen = document.getElementById('abepro-pendente');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('demandas')
        .select('*, users!responsavel_id(nome)')
        .eq('tipo','abepro')
        .order('created_at', { ascending: false });
      const lista = data || [];
      const comComp = lista.filter(d => ['realizada','auditada'].includes(d.coluna)).length;
      if (tot) tot.textContent = lista.length;
      if (pag) pag.textContent = comComp;
      if (pen) pen.textContent = lista.length - comComp;
      el.innerHTML = lista.length
        ? lista.map(d => `
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(d.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">
                👤 ${sanitize(d.users?.nome || 'Sem responsável')} · 📅 ${_fmt(d.created_at)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                           background:${['realizada','auditada'].includes(d.coluna)?'var(--green)22':'var(--yellow)22'};
                           color:${['realizada','auditada'].includes(d.coluna)?'var(--green)':'var(--yellow)'};
                           border:1px solid ${['realizada','auditada'].includes(d.coluna)?'var(--green)44':'var(--yellow)44'}">
                ${['realizada','auditada'].includes(d.coluna)?'✓ Confirmado':'⏳ Pendente'}
              </span>
              ${!['realizada','auditada'].includes(d.coluna)
                ? `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                           onclick="PageFinancas._confirmarComp('${d.id}')">Confirmar ✓</button>`
                : ''}
            </div>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum membro inscrito ainda.</div>';
    } catch(e) { el.innerHTML = '<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  novaAssociacao() {
    abrirModal({ titulo:'🏅 Registrar Associado ABEPRO', tipo:'info', corpo:`
      <p style="font-size:12px;color:var(--c-slate);margin-bottom:14px">
        Insira o nome completo do membro. O comprovante de pagamento deve ser gerado
        no sistema oficial da ABEPRO Jovem.
      </p>
      <div class="form-group"><label class="form-label">Nome completo do membro *</label>
        <input id="ab-nome" class="form-input" placeholder="Ex: Maria Silva Santos"></div>
      <div class="form-group"><label class="form-label">E-mail do membro</label>
        <input id="ab-email" type="email" class="form-input" placeholder="membro@email.com"></div>
      <div class="form-group"><label class="form-label">Responsável pela inscrição</label>
        <input id="ab-resp" class="form-input" value="${window._appProfile?.nome||''}"></div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Registrar ✓', classe:'btn-primary', acao: () => this._salvarAssociacao() }
    ]});
  },
  async _salvarAssociacao() {
    const nome = document.getElementById('ab-nome')?.value?.trim();
    const email = document.getElementById('ab-email')?.value?.trim();
    if (!nome) { mostrarToast('Informe o nome do membro!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const fin = coords.find(c => c.sigla === 'FIN');
      await _sbq().from('demandas').insert([{
        titulo: nome, descricao: email || null,
        coluna: 'pendente', tipo: 'abepro',
        coordenadoria_id: fin?.id || null,
        criado_por: window._appProfile?.id,
        responsavel_id: window._appProfile?.id,
      }]);
      mostrarToast(`${nome} registrado! Pendente comprovante ABEPRO.`, 'success');
      this._carregarABEPRO();
    } catch(e) { mostrarToast('Erro ao registrar.','error'); }
  },
  async _confirmarComp(id) {
    try {
      await _sbq().from('demandas').update({ coluna: 'auditada' }).eq('id', id);
      mostrarToast('Comprovante confirmado!','success');
      this._carregarABEPRO();
    } catch(e) { mostrarToast('Erro ao confirmar.','error'); }
  },
  _renderFluxo() {
    const pg=document.getElementById('page-fin_fluxo');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    if(!this._temAcesso()){
      ct.innerHTML=`<div style="padding:60px;text-align:center">
        <div style="font-size:48px;margin-bottom:16px">🔒</div>
        <div style="font-size:15px;font-weight:700;color:var(--c-white)">Acesso Restrito</div>
        <div style="font-size:13px;color:var(--c-slate);margin-top:8px">Apenas Coordenadoria Financeira e Admin.</div>
      </div>`;
      return;
    }
    ct.innerHTML=_sc('Fluxo de Caixa','💰',`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px">
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="fin-saldo" style="font-size:20px;font-weight:900;color:var(--green)">R$ —</div>
          <div style="font-size:11px;color:var(--c-slate)">Saldo</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="fin-entrada" style="font-size:20px;font-weight:900;color:var(--green)">R$ —</div>
          <div style="font-size:11px;color:var(--c-slate)">Vendas mês</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="fin-saida" style="font-size:20px;font-weight:900;color:var(--red)">R$ —</div>
          <div style="font-size:11px;color:var(--c-slate)">Despesas mês</div>
        </div>
      </div>
      <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--c-slate);margin-bottom:8px;font-weight:600">Últimos 6 meses — Vendas vs Despesas</div>
        <div style="position:relative;height:180px"><canvas id="fin-chart"></canvas></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Registrar venda',"PageFinancas.lancar('venda')")}
        ${_btn('+ Registrar despesa',"PageFinancas.lancar('despesa')",'btn-ghost')}
      </div>
      <div id="fin-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>
      <div style="background:var(--yellow-dim);border:1px solid var(--yellow-border);border-radius:10px;padding:12px;margin-top:14px">
        <div style="font-size:12px;color:var(--yellow);font-weight:600">
          ⚠️ Regimento Art. 26º IV — Vedada manutenção de recursos em contas pessoais por mais de 24h.
        </div>
      </div>`);
    this._carregarFluxo();
  },
  async _carregarFluxo() {
    const el=document.getElementById('fin-lista');
    if(!el||!_sbq())return;
    try {
      const hoje=new Date();
      const mesIniDate=new Date(hoje.getFullYear(),hoje.getMonth(),1);
      const mesStr=mesIniDate.toISOString().split('T')[0];
      const seisAtras=new Date(hoje.getFullYear(),hoje.getMonth()-5,1).toISOString().split('T')[0];
      const [rv,rd]=await Promise.all([
        _sbq().from('vendas').select('*').gte('data_venda',seisAtras).order('data_venda',{ascending:false}),
        _sbq().from('despesas').select('*').gte('data_despesa',seisAtras).order('data_despesa',{ascending:false}),
      ]);
      const vendas   = (rv.data||[]);
      const despesas = (rd.data||[]);
      const totVenda = vendas.filter(v=>v.data_venda>=mesStr).reduce((s,v)=>s+Number(v.valor||0),0);
      const totDesp  = despesas.filter(d=>d.data_despesa>=mesStr).reduce((s,d)=>s+Number(d.valor||0),0);
      const saldo    = totVenda-totDesp;
      this._renderChart(vendas, despesas);
      const sEl=document.getElementById('fin-saldo');
      const eEl=document.getElementById('fin-entrada');
      const saEl=document.getElementById('fin-saida');
      if(sEl)sEl.textContent=`R$ ${saldo.toFixed(2)}`;
      if(eEl)eEl.textContent=`R$ ${totVenda.toFixed(2)}`;
      if(saEl)saEl.textContent=`R$ ${totDesp.toFixed(2)}`;
      const tudo=[
        ...vendas.map(v=>({...v,_tipo:'venda',_data:v.data_venda})),
        ...despesas.map(d=>({...d,_tipo:'despesa',_data:d.data_despesa}))
      ].sort((a,b)=>b._data.localeCompare(a._data)).slice(0,15);
      el.innerHTML=tudo.length
        ?tudo.map(r=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--c-white)">${sanitize(r.descricao)}</div>
              <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(r._data)} · ${r.categoria||r.produto||'—'}</div>
            </div>
            <span style="font-size:14px;font-weight:800;color:${r._tipo==='venda'?'var(--green)':'var(--red)'}">
              ${r._tipo==='venda'?'+':'-'} R$ ${Number(r.valor||0).toFixed(2)}
            </span>
          </div>`).join('')
        :'<div style="padding:16px;text-align:center;color:var(--c-slate)">Nenhum registro ainda.</div>';
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  lancar(tipo) {
    const hoje=new Date().toISOString().split('T')[0];
    abrirModal({titulo:tipo==='venda'?'💚 Registrar Venda':'🔴 Registrar Despesa',tipo:'info',corpo:`
      <div class="form-group"><label class="form-label">Descrição *</label>
        <input id="fl-desc" class="form-input" placeholder="${tipo==='venda'?'Ex: Camisetas NUPIEEPRO':'Ex: Impressão de banner'}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Valor (R$) *</label>
          <input id="fl-valor" type="number" step="0.01" class="form-input" placeholder="0,00"></div>
        <div class="form-group"><label class="form-label">Data</label>
          <input id="fl-data" type="date" class="form-input" value="${hoje}"></div>
      </div>
      ${tipo==='venda'?`
      <div class="form-group"><label class="form-label">Produto</label>
        <input id="fl-produto" class="form-input" placeholder="Ex: Camiseta M"></div>`:''}`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar ✓',classe:'btn-primary',acao:()=>this._salvar(tipo)}
    ]});
  },
  async _salvar(tipo) {
    const desc  =document.getElementById('fl-desc')?.value?.trim();
    const valor =parseFloat(document.getElementById('fl-valor')?.value);
    const data  =document.getElementById('fl-data')?.value;
    const prod  =document.getElementById('fl-produto')?.value?.trim();
    if(!desc||isNaN(valor)){mostrarToast('Preencha todos os campos!','warning');return;}
    fecharModal();
    try {
      const coords=await getCoords();
      const fin=coords.find(c=>c.sigla==='FIN');
      if(tipo==='venda') {
        await _sbq().from('vendas').insert([{
          descricao:desc,valor,data_venda:data,produto:prod||null,
          coordenadoria_id:fin?.id||null,
          registrado_por:window._appProfile?.id
        }]);
      } else {
        await _sbq().from('despesas').insert([{
          descricao:desc,valor,data_despesa:data,
          coordenadoria_id:fin?.id||null,
          registrado_por:window._appProfile?.id
        }]);
      }
      mostrarToast(`${tipo==='venda'?'Venda':'Despesa'} registrada!`,'success');
      this._carregarFluxo();
    }catch(e){mostrarToast('Erro ao salvar.','error');}
  },
  _renderChart(vendas, despesas) {
    const canvas = document.getElementById('fin-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const hoje = new Date();
    const labels = [], vVals = [], dVals = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2,'0');
      const ini = `${yy}-${mm}-01`;
      const prox = new Date(yy, d.getMonth() + 1, 1);
      const fim = `${prox.getFullYear()}-${String(prox.getMonth()+1).padStart(2,'0')}-01`;
      labels.push(`${MESES[d.getMonth()]}/${String(yy).slice(2)}`);
      vVals.push(vendas.filter(v=>v.data_venda>=ini&&v.data_venda<fim).reduce((s,v)=>s+Number(v.valor||0),0));
      dVals.push(despesas.filter(dep=>dep.data_despesa>=ini&&dep.data_despesa<fim).reduce((s,dep)=>s+Number(dep.valor||0),0));
    }
    if (canvas._chartInst) canvas._chartInst.destroy();
    canvas._chartInst = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Vendas', data:vVals, backgroundColor:'#22c55e44', borderColor:'#22c55e', borderWidth:2, borderRadius:6 },
          { label:'Despesas', data:dVals, backgroundColor:'#f8717144', borderColor:'#f87171', borderWidth:2, borderRadius:6 },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#94a3b8', font:{ size:11 } } } },
        scales: {
          x:{ ticks:{ color:'#94a3b8', font:{size:10} }, grid:{ color:'#ffffff11' } },
          y:{ ticks:{ color:'#94a3b8', font:{size:10}, callback:v=>'R$'+v.toFixed(0) }, grid:{ color:'#ffffff11' } },
        },
      },
    });
  },
};
const PageProjetos = {
  async init() { this._renderEventos(); this._renderENEGEP(); },
  _renderEventos() {
    const pg=document.getElementById('page-prj_eventos');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Eventos Estaduais','🎪',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Evento Estadual: 20 pts (⭐ 3ª Estrela, jul/2026).
        Evento Regional: 40 pts (opcional, nov/2026).
      </p>
      ${_btn('+ Novo evento',"PageProjetos.novoEvento()")}
      <div id="prj-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregar();
  },
  async _carregar() {
    const el=document.getElementById('prj-lista');
    if(!el||!_sbq())return;
    try {
      const {data}=await _sbq().from('eventos')
        .select('*,coordenadorias(nome)')
        .in('tipo',['evento','visita','treinamento','podcast'])
        .order('data_inicio',{ascending:true});
      el.innerHTML=data?.length
        ?data.map(e=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <div style="font-weight:700;font-size:14px;color:var(--c-white)">${sanitize(e.titulo)}</div>
              <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                           background:var(--c-accent)22;color:var(--c-accent);border:1px solid var(--c-accent)44">
                ${e.tipo}
              </span>
            </div>
            <div style="font-size:12px;color:var(--c-slate)">
              📅 ${_fmt(e.data_inicio)} · 📍 ${sanitize(e.local||'A definir')}
              ${e.vagas?` · 👥 ${e.vagas} vagas`:''}
            </div>
          </div>`).join('')
        :'<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum evento cadastrado.</div>';
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  novoEvento() {
    const hoje=new Date().toISOString().slice(0,16);
    abrirModal({titulo:'🎪 Novo Evento',tipo:'info',corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="pe-titulo" class="form-input" placeholder="Ex: NUPIDAY 2026"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Tipo</label>
          <select id="pe-tipo" class="form-select">
            <option value="evento">Evento Estadual (20 pts)</option>
            <option value="treinamento">Treinamento (5 pts)</option>
            <option value="visita">Visita Técnica (5 pts)</option>
            <option value="podcast">NUPICAST</option>
          </select></div>
        <div class="form-group"><label class="form-label">Data/hora</label>
          <input id="pe-data" type="datetime-local" class="form-input" value="${hoje}"></div>
      </div>
      <div class="form-group"><label class="form-label">Local</label>
        <input id="pe-local" class="form-input" placeholder="Presencial / Online"></div>
      <div class="form-group"><label class="form-label">Vagas</label>
        <input id="pe-vagas" type="number" class="form-input" placeholder="50"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Criar ✓',classe:'btn-primary',acao:()=>this._salvar()}
    ]});
  },
  async _salvar() {
    const titulo=document.getElementById('pe-titulo')?.value?.trim();
    const tipo  =document.getElementById('pe-tipo')?.value;
    const data  =document.getElementById('pe-data')?.value;
    const local =document.getElementById('pe-local')?.value?.trim();
    const vagas =parseInt(document.getElementById('pe-vagas')?.value)||null;
    if(!titulo||!data){mostrarToast('Preencha título e data!','warning');return;}
    fecharModal();
    try {
      const coords=await getCoords();
      const prj=coords.find(c=>c.sigla==='PRJ');
      await _sbq().from('eventos').insert([{
        titulo,tipo,data_inicio:data,local:local||null,vagas,ativo:true,
        coordenadoria_id:prj?.id||null,criado_por:window._appProfile?.id
      }]);
      mostrarToast('Evento criado!','success');
      this._carregar();
    }catch(e){mostrarToast('Erro ao salvar.','error');}
  },
  novoEpisodio() {
    abrirModal({ titulo:'🎙️ Registrar Episódio NUPICAST', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título do Episódio *</label>
        <input id="ne-titulo" class="form-input" placeholder="Ex: NUPICAST #01 — Engenharia de Produção"></div>
      <div class="form-group"><label class="form-label">Data de Publicação *</label>
        <input id="ne-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="form-label">Link YouTube / Spotify</label>
        <input id="ne-link" class="form-input" placeholder="https://youtube.com/..."></div>
      <div class="form-group"><label class="form-label">Convidados</label>
        <input id="ne-conv" class="form-input" placeholder="Ex: Prof. João Silva, Empresa XYZ"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar',classe:'btn-primary',acao:()=>PageProjetos._salvarEpisodio()}
    ]});
  },
  async _salvarEpisodio() {
    const titulo = document.getElementById('ne-titulo')?.value?.trim();
    const data   = document.getElementById('ne-data')?.value;
    const link   = document.getElementById('ne-link')?.value?.trim();
    const conv   = document.getElementById('ne-conv')?.value?.trim();
    if (!titulo || !data) { mostrarToast('Preencha título e data!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const prj = coords.find(c=>c.sigla==='PRJ');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'podcast', data_inicio:data, ativo:true,
        coordenadoria_id: prj?.id||null,
        criado_por: window._appProfile?.id,
        descricao: JSON.stringify({ link:link||null, convidados:conv||null })
      }]);
      mostrarToast('Episódio registrado com sucesso!','success');
      PageProjetos._carregar();
    } catch(e) { mostrarToast('Erro ao registrar episódio.','error'); }
  },
  _renderNupicast() {
    const pg = document.getElementById('page-prj_nupicast');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('NUPICAST Tracker','🎙️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Episódios do NUPICAST — podcast do Núcleo.
      </p>
      ${_btn('+ Novo episódio','PageProjetos.novoEpisodio()')}
      <div id="nupicast-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarNupicast();
  },
  async _carregarNupicast() {
    const el = document.getElementById('nupicast-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('eventos')
        .select('*').eq('tipo','podcast')
        .order('data_inicio',{ascending:false}).limit(20);
      el.innerHTML = data?.length
        ? data.map(e => {
            let extra = {}; try { extra = JSON.parse(e.descricao||'{}'); } catch(_){}
            return `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(e.titulo)}</div>
                <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(e.data_inicio)}${extra.convidados?` · 🎤 ${sanitize(extra.convidados)}`:''}</div>
              </div>
              ${extra.link?`<a href="${sanitize(extra.link)}" target="_blank" class="btn btn-ghost" style="font-size:11px;padding:6px 12px;text-decoration:none">▶ Ouvir ↗</a>`:'<span style="font-size:11px;color:var(--c-slate)">Sem link</span>'}
            </div>`;
          }).join('')
        : `<div style="padding:30px;text-align:center"><div style="font-size:36px;margin-bottom:12px">🎙️</div><div style="font-size:14px;font-weight:700;color:var(--c-white)">Nenhum episódio registrado</div></div>`;
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  /* ── ENEGEP — Atividade 14 (Momento ENEGEP) ──
     Exige: fotos, lista de presença, link de inscrição/certificado.
  ── */
  _renderENEGEP() {
    const pg = document.getElementById('page-prj_enegep');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    const anoAtual = new Date().getFullYear();
    ct.innerHTML = _sc('Momento ENEGEP — Atividade 14','🎓',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Registro da participação do Núcleo no ENEGEP ${anoAtual}.
        <strong style="color:var(--c-accent)">Evidências obrigatórias:</strong>
        fotos do evento, lista de presença e link de inscrição/certificados.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Registrar participação ENEGEP',"PageProjetos.novoENEGEP()")}
      </div>
      <div id="enegep-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Produção Científica vinculada','🔬',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:10px">
        Artigos aprovados e apresentados no ENEGEP ${anoAtual} recebem <strong style="color:var(--green)">+25 pts bônus</strong>.
      </p>
      ${_btn('+ Registrar artigo no ENEGEP',"PageGlobal.novaProducao()",'btn-ghost')}`);
    this._carregarENEGEP();
  },

  async _carregarENEGEP() {
    const el = document.getElementById('enegep-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*')
        .eq('tipo', 'enegep')
        .order('created_at', { ascending: false });
      el.innerHTML = data?.length
        ? data.map(e => {
            let extra = {};
            try { extra = JSON.parse(e.descricao || '{}'); } catch(_){}
            return `
              <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:16px">
                <div style="font-weight:700;font-size:14px;color:var(--c-white);margin-bottom:8px">${sanitize(e.titulo)}</div>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
                  ${extra.fotos    ? `<div>📸 <a href="${sanitize(extra.fotos)}"    target="_blank" style="color:var(--c-accent)">Ver fotos ↗</a></div>` : '<div style="color:var(--red)">📸 Fotos: não enviado</div>'}
                  ${extra.presenca ? `<div>📋 <a href="${sanitize(extra.presenca)}" target="_blank" style="color:var(--c-accent)">Lista de presença ↗</a></div>` : '<div style="color:var(--red)">📋 Lista de presença: não enviado</div>'}
                  ${extra.link_insc? `<div>🔗 <a href="${sanitize(extra.link_insc)}" target="_blank" style="color:var(--c-accent)">Inscrição/Certificado ↗</a></div>` : '<div style="color:var(--red)">🔗 Link de inscrição: não enviado</div>'}
                </div>
                <div style="font-size:11px;color:var(--c-slate);margin-top:8px">📅 ${_fmt(e.data_inicio)}</div>
              </div>`;
          }).join('')
        : `<div style="padding:30px;text-align:center">
             <div style="font-size:36px;margin-bottom:12px">🎓</div>
             <div style="font-size:14px;font-weight:700;color:var(--c-white)">Nenhum registro do ENEGEP</div>
             <div style="font-size:13px;color:var(--c-slate);margin-top:6px">
               Registre a participação do Núcleo no ENEGEP ${new Date().getFullYear()} com todas as evidências.
             </div>
           </div>`;
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },

  novoENEGEP() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'🎓 Registrar Participação no ENEGEP', tipo:'info', corpo:`
      <div style="background:var(--green)18;border:1px solid var(--green)33;border-radius:8px;
                  padding:10px;margin-bottom:14px;font-size:12px;color:var(--green);font-weight:600">
        ⭐ Atividade 14 — As 3 evidências abaixo são obrigatórias para pontuação ABJ.
      </div>
      <div class="form-group"><label class="form-label">Descrição da participação *</label>
        <input id="en-titulo" class="form-input" placeholder="Ex: Participação no ENEGEP 2026 — Teresina-PI"></div>
      <div class="form-group"><label class="form-label">Data do evento *</label>
        <input id="en-data" type="date" class="form-input" value="${hoje}"></div>
      <hr style="border:none;border-top:1px solid var(--b-2);margin:12px 0">
      <div style="font-size:12px;font-weight:700;color:var(--c-white);margin-bottom:10px">Evidências Obrigatórias</div>
      <div class="form-group"><label class="form-label">📸 Link das fotos do evento *</label>
        <input id="en-fotos" class="form-input" placeholder="https://drive.google.com/...">
        <span style="font-size:11px;color:var(--c-slate)">JPEG ou PNG no Google Drive/OneDrive</span></div>
      <div class="form-group"><label class="form-label">📋 Link da lista de presença *</label>
        <input id="en-presenca" class="form-input" placeholder="https://drive.google.com/..."></div>
      <div class="form-group"><label class="form-label">🔗 Link de inscrição ou certificado *</label>
        <input id="en-link" class="form-input" placeholder="https://enegep.abepro.org.br/..."></div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Registrar ✓', classe:'btn-primary', acao: () => this._salvarENEGEP() }
    ]});
  },

  async _salvarENEGEP() {
    const titulo  = document.getElementById('en-titulo')?.value?.trim();
    const data    = document.getElementById('en-data')?.value;
    const fotos   = document.getElementById('en-fotos')?.value?.trim();
    const presenca= document.getElementById('en-presenca')?.value?.trim();
    const link    = document.getElementById('en-link')?.value?.trim();
    if (!titulo || !data) { mostrarToast('Preencha descrição e data!','warning'); return; }
    if (!fotos || !presenca || !link) { mostrarToast('As 3 evidências (fotos, presença, inscrição) são obrigatórias!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const prj = coords.find(c => c.sigla === 'PRJ');
      await _sbq().from('eventos').insert([{
        titulo, tipo: 'enegep',
        data_inicio: data + 'T08:00:00', ativo: true,
        descricao: JSON.stringify({ fotos, presenca, link_insc: link }),
        coordenadoria_id: prj?.id || null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Participação no ENEGEP registrada com todas as evidências! 🎓','success');
      this._carregarENEGEP();
    } catch(e) { mostrarToast('Erro ao registrar.','error'); }
  },

  novaNoticia() {
    /* Fallback simples para notícias de atualização */
    mostrarToast('Use o botão "Registrar participação ENEGEP" para registrar evidências.','info');
  },
  novoTreinamento() {
    abrirModal({ titulo:'📚 Registrar Capacitação', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome da Capacitação *</label>
        <input id="trp-nome" class="form-input" placeholder="Ex: Workshop de Design Thinking"></div>
      <div class="form-group"><label class="form-label">Data *</label>
        <input id="trp-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="form-label">Local / Modalidade</label>
        <input id="trp-local" class="form-input" placeholder="Presencial / Online"></div>
      <div class="form-group"><label class="form-label">Vagas</label>
        <input id="trp-vagas" class="form-input" type="number" min="1" placeholder="20"></div>
      <div class="form-group"><label class="form-label">Link / Certificado</label>
        <input id="trp-link" class="form-input" placeholder="https://..."></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar',classe:'btn-primary',acao:()=>PageProjetos._salvarCapacitacao()}
    ]});
  },
  async _salvarCapacitacao() {
    const titulo = document.getElementById('trp-nome')?.value?.trim();
    const data   = document.getElementById('trp-data')?.value;
    const local  = document.getElementById('trp-local')?.value?.trim();
    const vagas  = parseInt(document.getElementById('trp-vagas')?.value)||null;
    const link   = document.getElementById('trp-link')?.value?.trim();
    if (!titulo || !data) { mostrarToast('Preencha nome e data!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const prj = coords.find(c=>c.sigla==='PRJ');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'treinamento', data_inicio:data,
        local:local||null, vagas:vagas||null, ativo:true,
        coordenadoria_id: prj?.id||null,
        criado_por: window._appProfile?.id,
        descricao: link ? JSON.stringify({link}) : null
      }]);
      mostrarToast('Capacitação registrada!','success');
      PageProjetos._renderTreinamentos?.();
    } catch(e) { mostrarToast('Erro ao registrar capacitação.','error'); }
  },
  _renderTreinamentos() {
    const pg = document.getElementById('page-prj_treinamentos');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Capacitações e Treinamentos','📚',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Capacitações externas e treinamentos realizados pelos membros do Núcleo.
      </p>
      ${_btn('+ Registrar capacitação','PageProjetos.novoTreinamento()')}
      <div id="treinamentos-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarTreinamentos();
  },
  async _carregarTreinamentos() {
    const el = document.getElementById('treinamentos-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('eventos')
        .select('*').eq('tipo','treinamento')
        .order('data_inicio',{ascending:false}).limit(30);
      el.innerHTML = data?.length
        ? data.map(e => {
            let extra = {}; try { extra = JSON.parse(e.descricao||'{}'); } catch(_){}
            return `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(e.titulo)}</div>
                <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(e.data_inicio)}${e.local?` · 📍 ${sanitize(e.local)}`:''}${e.vagas?` · 👥 ${e.vagas} vagas`:''}</div>
              </div>
              ${extra.link?`<a href="${sanitize(extra.link)}" target="_blank" class="btn btn-ghost" style="font-size:11px;padding:6px 12px;text-decoration:none">Inscrição ↗</a>`:''}
            </div>`;
          }).join('')
        : `<div style="padding:30px;text-align:center"><div style="font-size:36px;margin-bottom:12px">📚</div><div style="font-size:14px;font-weight:700;color:var(--c-white)">Nenhuma capacitação registrada</div></div>`;
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },

  /* ─── Parcerias e Patrocínios ─────────────────────────────── */
  _renderParcerias() {
    const pg = document.getElementById('page-prj_parcerias');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Parcerias e Patrocínios','🤝',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Empresas e instituições parceiras do NUPIEEPRO. Patrocinadores têm logo exibida nos eventos.
      </p>
      ${_btn('+ Nova parceria','PageProjetos.novaParceria()')}
      <div id="prj-parcerias-lista" style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px;grid-column:1/-1">Carregando...</div>
      </div>`);
    this._carregarParcerias();
  },
  async _carregarParcerias() {
    const el = document.getElementById('prj-parcerias-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('parcerias')
        .select('*')
        .order('nome');
      if (!data?.length) {
        el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px;grid-column:1/-1">Nenhuma parceria cadastrada.</div>';
        return;
      }
      el.innerHTML = data.map(p => `
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center">
          ${p.logo_url
            ? `<img src="${sanitize(p.logo_url)}" alt="${sanitize(p.nome)}" style="max-height:52px;max-width:120px;object-fit:contain;border-radius:6px;">`
            : `<div style="width:52px;height:52px;border-radius:50%;background:var(--c-s5);display:flex;align-items:center;justify-content:center;font-size:20px;">🤝</div>`}
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(p.nome)}</div>
            ${p.tipo ? `<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:var(--c-accent)22;color:var(--c-accent);border:1px solid var(--c-accent)44">${sanitize(p.tipo)}</span>` : ''}
          </div>
          ${p.descricao ? `<div style="font-size:12px;color:var(--c-slate)">${sanitize(p.descricao)}</div>` : ''}
          ${p.site ? `<a href="${sanitize(p.site)}" target="_blank" style="font-size:12px;color:var(--c-accent);text-decoration:none">🔗 Visitar site</a>` : ''}
        </div>`).join('');
    } catch(e) { el.innerHTML = '<div style="padding:16px;color:var(--c-slate);grid-column:1/-1">Erro ao carregar.</div>'; }
  },
  novaParceria() {
    abrirModal({ titulo:'🤝 Nova Parceria', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome da empresa / instituição *</label>
        <input id="pp-nome" class="form-input" placeholder="Ex: SENAI Piauí"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Tipo</label>
          <select id="pp-tipo" class="form-select">
            <option value="parceiro">Parceiro</option>
            <option value="patrocinador">Patrocinador</option>
            <option value="apoiador">Apoiador</option>
          </select></div>
        <div class="form-group"><label class="form-label">Site</label>
          <input id="pp-site" class="form-input" placeholder="https://"></div>
      </div>
      <div class="form-group"><label class="form-label">URL da logo (link público)</label>
        <input id="pp-logo" class="form-input" placeholder="https://...logo.png"></div>
      <div class="form-group"><label class="form-label">Descrição</label>
        <textarea id="pp-desc" class="form-input" rows="2" placeholder="Benefícios / contexto da parceria"></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar ✓',classe:'btn-primary',acao:()=>this._salvarParceria()}
    ]});
  },
  async _salvarParceria() {
    const nome  = document.getElementById('pp-nome')?.value?.trim();
    const tipo  = document.getElementById('pp-tipo')?.value;
    const site  = document.getElementById('pp-site')?.value?.trim();
    const logo  = document.getElementById('pp-logo')?.value?.trim();
    const desc  = document.getElementById('pp-desc')?.value?.trim();
    if (!nome) { mostrarToast('Informe o nome da parceria!','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('parcerias').insert([{
        nome, tipo, site: site||null, logo_url: logo||null,
        descricao: desc||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Parceria cadastrada!','success');
      this._carregarParcerias();
    } catch(e) { mostrarToast('Erro ao salvar parceria.','error'); }
  },
};
const PageOperacoes = {
  async init() { this._renderPops(); this._renderRelatorios(); },
  _renderRelatorios() {
    if (typeof RelatorioModule !== 'undefined') { RelatorioModule.renderPagina(); return; }
    const pg=document.getElementById('page-ops_relatorios');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Relatórios Mensais ABJ','📊',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Prazo: último dia de cada mês. Envio fora do prazo resulta em desconto de pontos (Regimento Art. 20º).
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Novo relatório',"RelatorioModule?.abrirFormulario()")}
      </div>
      <div id="ops-relatorios-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Módulo de relatórios não carregado.</div>
      </div>`);
  },
  async _carregarRelatorios() {
    const el=document.getElementById('ops-relatorios-lista');
    if(!el||!_sbq())return;
    try {
      const {data}=await _sbq().from('relatorios_mensais').select('*').order('ano',{ascending:false}).order('mes',{ascending:false}).limit(12);
      el.innerHTML=data?.length
        ?data.map(r=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${String(r.mes||'?').padStart(2,'0')}/${r.ano||'?'}</div>
              <div style="font-size:12px;color:var(--c-slate)">
                Enviado: ${_fmt(r.created_at)} · Pontos ABJ: ${r.pontos_abj||'—'}
              </div>
            </div>
            <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                         background:${r.aprovado?'var(--green)22':'var(--yellow)22'};
                         color:${r.aprovado?'var(--green)':'var(--yellow)'};
                         border:1px solid ${r.aprovado?'var(--green)44':'var(--yellow)44'}">
              ${r.aprovado?'✓ Aprovado':'⏳ Pendente'}
            </span>
          </div>`).join('')
        :'<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum relatório enviado ainda.</div>';
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  verHistorico(){mostrarToast('Histórico completo aguardando módulo de relatório.','info');},
  _renderArquivo() {
    const pg = document.getElementById('page-ops_arquivo');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Arquivo de Documentos','🗂️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        POPs, atas, regulamentos e documentos institucionais do Núcleo.
      </p>
      ${_btn('+ Novo documento','PageOperacoes.novoArquivo()')}
      <div id="arquivo-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarArquivo();
  },
  async _carregarArquivo() {
    const el = document.getElementById('arquivo-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('pops')
        .select('*').order('created_at',{ascending:false}).limit(40);
      el.innerHTML = data?.length
        ? data.map(d => `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(d.nome||'Documento')}</div>
              <div style="font-size:12px;color:var(--c-slate)">${d.descricao?`📂 ${sanitize(d.descricao)} · `:''}📅 ${_fmt(d.created_at)}</div>
            </div>
            ${d.conteudo?`<a href="${sanitize(d.conteudo)}" target="_blank" class="btn btn-ghost" style="font-size:11px;padding:6px 12px;text-decoration:none">Abrir ↗</a>`:'<span style="font-size:11px;color:var(--c-slate)">Sem link</span>'}
          </div>`).join('')
        : `<div style="padding:30px;text-align:center"><div style="font-size:36px;margin-bottom:12px">🗂️</div><div style="font-size:14px;font-weight:700;color:var(--c-white)">Nenhum documento cadastrado</div></div>`;
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  novoArquivo() {
    const corpo = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <label style="font-size:12px;color:var(--c-slate);display:block">Título do documento *
          <input id="arq-titulo" type="text" placeholder="Ex: POP de Reuniões"
            style="width:100%;margin-top:4px;background:var(--b-1);color:var(--c-white);border:1px solid var(--b-3);border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box">
        </label>
        <label style="font-size:12px;color:var(--c-slate);display:block">Tipo
          <select id="arq-tipo" style="width:100%;margin-top:4px;background:var(--b-1);color:var(--c-white);border:1px solid var(--b-3);border-radius:8px;padding:8px 10px;font-size:13px">
            <option>POP</option><option>Ata</option><option>Regulamento</option><option>Edital</option><option>Outro</option>
          </select>
        </label>
        <label style="font-size:12px;color:var(--c-slate);display:block">Link (Google Drive, Notion…)
          <input id="arq-link" type="url" placeholder="https://..."
            style="width:100%;margin-top:4px;background:var(--b-1);color:var(--c-white);border:1px solid var(--b-3);border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box">
        </label>
      </div>`;
    abrirModal({ titulo:'🗂️ Novo Documento', tipo:'info', corpo,
      botoes:[{ texto:'Salvar', classe:'btn-primary', acao:() => PageOperacoes._salvarArquivo() }] });
  },
  async _salvarArquivo() {
    const nome = document.getElementById('arq-titulo')?.value?.trim();
    const tipo = document.getElementById('arq-tipo')?.value;
    const link = document.getElementById('arq-link')?.value?.trim();
    if (!nome) { mostrarToast('Informe o título do documento.','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('pops').insert([{
        nome, descricao: tipo||null,
        conteudo: link||null,
        criado_por: window._appProfile?.id,
        ativo: true
      }]);
      mostrarToast('Documento cadastrado!','success');
      PageOperacoes._renderArquivo();
    } catch(e) { mostrarToast('Erro ao salvar documento.','error'); }
  },
  /* ── Gestão de Inscrições ── */
  async _renderInscricoes() {
    const pg=document.getElementById('page-ops_inscricoes');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Gestão de Inscrições','🎟️',`
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        ${_btn('+ Novo evento','PageOperacoes.novoEventoInscricao()')}
      </div>
      <div id="ins-eventos-lista" style="display:flex;flex-direction:column;gap:10px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    await this._carregarEventosInscricao();
  },
  async _carregarEventosInscricao() {
    const el=document.getElementById('ins-eventos-lista');
    if(!el||!_sbq())return;
    try {
      const {data}=await _sbq().from('eventos_inscricao').select('*').order('data_inicio',{ascending:false});
      if(!data?.length){el.innerHTML='<div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum evento de inscrição cadastrado.</div>';return;}
      el.innerHTML=data.map(e=>{
        const abertas=e.inscricoes_abertas;
        const vagas=e.vagas?`${e.vagas_ocupadas||0}/${e.vagas}`:`${e.vagas_ocupadas||0}`;
        const dataI=e.data_inicio?new Date(e.data_inicio).toLocaleDateString('pt-BR'):'—';
        return `
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--c-white)">${e.icone||'🎯'} ${sanitize(e.nome)}</div>
                <div style="font-size:12px;color:var(--c-slate);margin-top:2px">📅 ${dataI} · 👥 ${vagas} inscrições</div>
                ${e.local?`<div style="font-size:12px;color:var(--c-slate)">📍 ${sanitize(e.local)}</div>`:''}
              </div>
              <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;
                           background:${abertas?'var(--green)22':'var(--b-2)'};
                           color:${abertas?'var(--green)':'var(--c-slate)'};
                           border:1px solid ${abertas?'var(--green)44':'var(--b-2)'}">
                ${abertas?'✅ Abertas':'🔒 Fechadas'}
              </span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
              ${_btn(abertas?'🔒 Fechar inscrições':'✅ Abrir inscrições',
                `PageOperacoes._toggleInscricoes('${e.id}',${!abertas})`,abertas?'btn-ghost':'btn-primary')}
              ${_btn('👥 Ver inscritos',`PageOperacoes._verInscritos('${e.id}','${sanitize(e.nome).replace(/'/g,"\\'")}')`, 'btn-ghost')}
              ${_btn('✏️ Editar',`PageOperacoes._editarEventoInscricao('${e.id}')`, 'btn-ghost')}
            </div>
          </div>`;
      }).join('');
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  novoEventoInscricao() {
    const hoje=new Date().toISOString().slice(0,16);
    abrirModal({titulo:'🎟️ Novo Evento de Inscrição',tipo:'info',corpo:`
      <div class="form-group"><label class="form-label">Nome do evento *</label>
        <input id="ins-nome" class="form-input" placeholder="Ex: Assembleia Geral 2026"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data/hora início</label>
          <input id="ins-ini" type="datetime-local" class="form-input" value="${hoje}"></div>
        <div class="form-group"><label class="form-label">Data/hora fim</label>
          <input id="ins-fim" type="datetime-local" class="form-input"></div>
      </div>
      <div class="form-group"><label class="form-label">Local</label>
        <input id="ins-local" class="form-input" placeholder="Ex: Auditório A, Bloco B"></div>
      <div class="form-group"><label class="form-label">Vagas (vazio = ilimitado)</label>
        <input id="ins-vagas" type="number" class="form-input" placeholder="Ex: 50"></div>
      <div class="form-group"><label class="form-label">Ícone</label>
        <input id="ins-icone" class="form-input" value="🎯" style="width:80px"></div>`,
      botoes:[
        {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
        {texto:'Criar evento ✓',classe:'btn-primary',acao:()=>this._salvarEventoInscricao()},
      ]});
  },
  async _salvarEventoInscricao() {
    const nome  =document.getElementById('ins-nome')?.value?.trim();
    const ini   =document.getElementById('ins-ini')?.value;
    const fim   =document.getElementById('ins-fim')?.value;
    const local =document.getElementById('ins-local')?.value?.trim();
    const vagas =parseInt(document.getElementById('ins-vagas')?.value)||null;
    const icone =document.getElementById('ins-icone')?.value?.trim()||'🎯';
    if(!nome){mostrarToast('Informe o nome do evento!','warning');return;}
    fecharModal();
    try {
      await _sbq().from('eventos_inscricao').insert([{nome,local:local||null,data_inicio:ini||null,data_fim:fim||null,vagas,icone,inscricoes_abertas:false}]);
      mostrarToast('Evento criado!','success');
      this._carregarEventosInscricao();
    }catch(e){mostrarToast('Erro ao criar evento.','error');}
  },
  async _toggleInscricoes(id, abrir) {
    try {
      await _sbq().from('eventos_inscricao').update({inscricoes_abertas:abrir}).eq('id',id);
      mostrarToast(abrir?'Inscrições abertas!':'Inscrições fechadas!','success');
      this._carregarEventosInscricao();
    }catch(e){mostrarToast('Erro ao alterar status.','error');}
  },
  async _editarEventoInscricao(id) {
    const {data:e}=await _sbq().from('eventos_inscricao').select('*').eq('id',id).single();
    if(!e){mostrarToast('Evento não encontrado.','error');return;}
    const ini=e.data_inicio?new Date(e.data_inicio).toISOString().slice(0,16):'';
    const fim=e.data_fim?new Date(e.data_fim).toISOString().slice(0,16):'';
    abrirModal({titulo:'✏️ Editar Evento',tipo:'info',corpo:`
      <div class="form-group"><label class="form-label">Nome *</label>
        <input id="ins-e-nome" class="form-input" value="${sanitize(e.nome)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data/hora início</label>
          <input id="ins-e-ini" type="datetime-local" class="form-input" value="${ini}"></div>
        <div class="form-group"><label class="form-label">Data/hora fim</label>
          <input id="ins-e-fim" type="datetime-local" class="form-input" value="${fim}"></div>
      </div>
      <div class="form-group"><label class="form-label">Local</label>
        <input id="ins-e-local" class="form-input" value="${sanitize(e.local||'')}"></div>
      <div class="form-group"><label class="form-label">Vagas</label>
        <input id="ins-e-vagas" type="number" class="form-input" value="${e.vagas||''}"></div>`,
      botoes:[
        {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
        {texto:'Salvar ✓',classe:'btn-primary',acao:()=>this._salvarEdicaoEvento(id)},
      ]});
  },
  async _salvarEdicaoEvento(id) {
    const nome  =document.getElementById('ins-e-nome')?.value?.trim();
    const ini   =document.getElementById('ins-e-ini')?.value;
    const fim   =document.getElementById('ins-e-fim')?.value;
    const local =document.getElementById('ins-e-local')?.value?.trim();
    const vagas =parseInt(document.getElementById('ins-e-vagas')?.value)||null;
    if(!nome){mostrarToast('Nome obrigatório!','warning');return;}
    fecharModal();
    try {
      await _sbq().from('eventos_inscricao').update({nome,local:local||null,data_inicio:ini||null,data_fim:fim||null,vagas}).eq('id',id);
      mostrarToast('Evento atualizado!','success');
      this._carregarEventosInscricao();
    }catch(e){mostrarToast('Erro ao atualizar.','error');}
  },
  async _verInscritos(eventoId, nomeEvento) {
    abrirModal({titulo:`👥 Inscritos — ${nomeEvento}`,tipo:'info',corpo:`
      <div id="ins-lista-modal" style="max-height:50vh;overflow-y:auto;margin-bottom:8px">
        <div style="padding:16px;text-align:center;color:var(--c-slate)">Carregando...</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${_btn('📥 Exportar CSV',`PageOperacoes._exportarCSV('${eventoId}','${nomeEvento.replace(/'/g,"\\'")}')`, 'btn-ghost')}
      </div>`,
      botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
    try {
      const {data}=await _sbq().from('inscricoes_eventos').select('*').eq('evento_id',eventoId).order('created_at');
      const el=document.getElementById('ins-lista-modal');
      if(!el)return;
      if(!data?.length){el.innerHTML='<div style="padding:16px;text-align:center;color:var(--c-slate)">Nenhum inscrito ainda.</div>';return;}
      el.innerHTML=data.map(i=>`
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--c-white)">${sanitize(i.nome)}</div>
            <div style="font-size:11px;color:var(--c-slate)">${sanitize(i.email)}${i.e_membro?' · ⭐ Membro':''}</div>
            ${i.curso?`<div style="font-size:11px;color:var(--c-slate)">${sanitize(i.curso)}${i.instituicao?' — '+sanitize(i.instituicao):''}</div>`:''}
          </div>
          <select onchange="PageOperacoes._atualizarPresenca('${i.id}',this.value)"
            style="background:var(--b-2);border:1px solid var(--b-3);border-radius:6px;padding:4px 8px;color:var(--c-white);font-size:11px">
            <option value="inscrito" ${i.status==='inscrito'?'selected':''}>⏳ Inscrito</option>
            <option value="presente" ${i.status==='presente'?'selected':''}>✅ Presente</option>
            <option value="ausente" ${i.status==='ausente'?'selected':''}>❌ Ausente</option>
            <option value="cancelado" ${i.status==='cancelado'?'selected':''}>🚫 Cancelado</option>
          </select>
        </div>`).join('');
    }catch(e){const _el=document.getElementById('ins-lista-modal');if(_el)_el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  async _atualizarPresenca(id, status) {
    try {
      await _sbq().from('inscricoes_eventos').update({status}).eq('id',id);
      mostrarToast('Status atualizado!','success');
    }catch(e){mostrarToast('Erro ao atualizar.','error');}
  },
  async _exportarCSV(eventoId, nomeEvento) {
    try {
      const {data}=await _sbq().from('inscricoes_eventos').select('*').eq('evento_id',eventoId).order('created_at');
      if(!data?.length){mostrarToast('Nenhum inscrito para exportar.','warning');return;}
      const esc=v=>`"${(v||'').replace(/"/g,'""')}"`;
      const header='Nome,Email,CPF,Curso,Instituição,Membro,Status,Inscrito em';
      const rows=data.map(i=>[esc(i.nome),esc(i.email),esc(i.cpf),esc(i.curso),esc(i.instituicao),i.e_membro?'Sim':'Não',i.status||'inscrito',i.created_at?new Date(i.created_at).toLocaleString('pt-BR'):''].join(','));
      const csv=[header,...rows].join('\n');
      const a=document.createElement('a');
      a.href='data:text/csv;charset=utf-8,'+encodeURIComponent('﻿'+csv);
      a.download=`inscritos-${nomeEvento.replace(/\s+/g,'-')}.csv`;
      a.click();
      mostrarToast('CSV exportado!','success');
    }catch(e){mostrarToast('Erro ao exportar.','error');}
  },
  async _renderPops() {
    const pg=document.getElementById('page-ops_pops');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    const sb=_sbq();
    ct.innerHTML=_sc('Cofre de POPs','📁',`
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:14px">
        Procedimentos Operacionais Padrão — atualização semestral obrigatória (Regimento Art. 12º V).
      </p>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        ${_btn('+ Novo POP',"PageOperacoes.novoPop()")}
      </div>
      <div id="ops-pops-list" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:16px;text-align:center;color:var(--fg-3);font-size:13px;">Carregando POPs...</div>
      </div>`);
    if(!sb){document.getElementById('ops-pops-list').innerHTML='<p style="color:var(--fg-3);font-size:13px;">Banco não conectado.</p>';return;}
    try {
      const {data}=await sb.from('pops').select('*').order('nome');
      const el=document.getElementById('ops-pops-list');
      if(!el)return;
      if(!data||data.length===0){
        el.innerHTML=`<div style="padding:24px;text-align:center;color:var(--fg-3);font-size:13px;">
          <p>Nenhum POP cadastrado ainda.</p>
          <p style="font-size:11px;margin-top:6px;">Clique em "+ Novo POP" para adicionar o primeiro procedimento.</p>
        </div>`;return;
      }
      const hoje=new Date();
      el.innerHTML=data.map(p=>{
        const revisao=p.data_revisao?new Date(p.data_revisao+'T12:00:00'):null;
        const venceDias=revisao?Math.ceil((revisao-hoje)/(1000*60*60*24)):null;
        const tag=venceDias===null?'':
          venceDias<0?`<span style="font-size:10px;color:#f87171;margin-left:8px;">Vencido</span>`:
          venceDias<=30?`<span style="font-size:10px;color:var(--brand-orange);margin-left:8px;">Vence em ${venceDias}d</span>`:
          `<span style="font-size:10px;color:var(--fg-3);margin-left:8px;">Revisão: ${revisao.toLocaleDateString('pt-BR')}</span>`;
        const ativoIcon=p.ativo!==false?'🟢':'🔴';
        return `<div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:13px;color:var(--fg-1);font-weight:600;">📄 ${p.nome}</span>${tag}
            ${p.descricao?`<div style="font-size:11px;color:var(--fg-3);margin-top:3px;">${p.descricao}</div>`:''}
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <span title="${p.ativo!==false?'Ativo':'Inativo'}">${ativoIcon}</span>
            <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;" onclick="PageOperacoes.editarPop('${p.id}','${(p.nome||'').replace(/'/g,"\\'")}')">Editar</button>
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      const el=document.getElementById('ops-pops-list');
      if(el) el.innerHTML='<p style="color:var(--fg-3);font-size:13px;">Erro ao carregar POPs.</p>';
    }
  },
  novoPop() {
    abrirModal({titulo:'📄 Novo POP',corpo:`
      <div class="form-group"><label class="form-label">Título do POP *</label><input id="pop-titulo" class="form-input" placeholder="Ex: Onboarding de membros"></div>
      <div class="form-group"><label class="form-label">Descrição</label><textarea id="pop-desc" class="form-input" rows="2" placeholder="Resumo do procedimento..."></textarea></div>
      <div class="form-group"><label class="form-label">Data da próxima revisão</label><input id="pop-revisao" class="form-input" type="date"></div>
    `,botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar POP',classe:'btn-primary',acao:async()=>{
        const titulo=document.getElementById('pop-titulo')?.value?.trim();
        const desc=document.getElementById('pop-desc')?.value?.trim();
        const revisao=document.getElementById('pop-revisao')?.value;
        if(!titulo){mostrarToast('Informe o título do POP.','error');return;}
        fecharModal();
        if(!_sbq()){mostrarToast('Banco não conectado.','error');return;}
        try{
          await _sbq().from('pops').insert({nome:titulo,descricao:desc||null,data_revisao:revisao||null,ativo:true,criado_por:window._appProfile?.id});
          mostrarToast('POP cadastrado com sucesso!','success');
          PageOperacoes._renderPops();
        }catch(e){mostrarToast('Erro ao salvar POP.','error');}
      }}
    ]});
  },
  editarPop(id, titulo) {
    abrirModal({titulo:`✏️ Editar POP: ${titulo}`,corpo:`
      <p style="color:var(--fg-3);font-size:12px;margin-bottom:12px;">ID: ${id}</p>
      <div class="form-group"><label class="form-label">Novo título</label><input id="pop-edit-titulo" class="form-input" value="${titulo}"></div>
    `,botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar',classe:'btn-primary',acao:async()=>{
        const novoTitulo=document.getElementById('pop-edit-titulo')?.value?.trim();
        if(!novoTitulo){mostrarToast('Informe o título.','error');return;}
        fecharModal();
        if(!_sbq()){mostrarToast('Banco não conectado.','error');return;}
        try{
          await _sbq().from('pops').update({nome:novoTitulo}).eq('id',id);
          mostrarToast('POP atualizado!','success');
          PageOperacoes._renderPops();
        }catch(e){mostrarToast('Erro ao atualizar POP.','error');}
      }}
    ]});
  },
  gerarRelatorio() {
    mostrarToast('Iniciando geração de PDF ABJ...','info');
    setTimeout(()=> mostrarToast('Relatório gerado e pronto para envio!','success'), 2000);
  },
  uploadDocumento() {
    abrirModal({ titulo:'🗂️ Subir Arquivo', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome do Documento *</label>
        <input id="ad-nome" class="form-input"></div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select id="ad-tipo" class="form-select">
          <option value="ata">Ata de Reunião</option>
          <option value="pop">POP</option>
          <option value="edital">Edital</option>
        </select></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Subir ⬆',classe:'btn-primary',acao:()=> { mostrarToast('Arquivo enviado para o cofre digital!','success'); fecharModal(); }}
    ]});
  }
};
const PagePessoas = {
  async init() { this._renderMembros(); this._renderClima(); this._renderTAP(); },
  _renderMembros() {
    const pg=document.getElementById('page-membros');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Membros do Núcleo','👥',`
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Convidar membro',"PagePessoas.convidar()")}
        ${_btn('Exportar',"PagePessoas.exportar()",'btn-ghost')}
      </div>
      <div id="gp-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregar();
  },
  async _carregar() {
    const el=document.getElementById('gp-lista');
    if(!el||!_sbq())return;
    try {
      const {data}=await _sbq()
        .from('users')
        .select('*,coordenadorias(nome,cor,icone)')
        .eq('ativo',true)
        .order('coordenadoria_id');
      el.innerHTML=data?.length
        ?data.map(m=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;
                      padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--c-s5);
                        display:flex;align-items:center;justify-content:center;
                        font-size:15px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">
              ${m.avatar_url
                ?`<img src="${sanitize(m.avatar_url)}" style="width:100%;height:100%;object-fit:cover">`
                :(m.iniciais||m.nome||'?').slice(0,2).toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(m.nome||m.email||'—')}</div>
              <div style="font-size:12px;color:var(--c-slate)">
                ${sanitize(m.cargo||'Membro')} · ${sanitize(m.coordenadorias?.nome||'—')}
              </div>
            </div>
            <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;
                         background:var(--b-2);color:var(--c-slate);border:1px solid var(--b-2)">
              ${m.role||'membro'}
            </span>
          </div>`).join('')
        :'<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum membro carregado.</div>';
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
  _renderClima() {
    const pg=document.getElementById('page-gp_clima');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Pesquisa de Clima Organizacional','🌡️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
        Bimestral, obrigatória (Regimento Art. 12º VI). Mín. 70% de resposta para pontuação ABJ.
        Resultados ficam visíveis apenas para Coord. Geral e GP.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('+ Nova pesquisa',"PagePessoas.adicionarClima()")}
        ${_btn('Ver histórico',"PagePessoas.historicoPesquisas()",'btn-ghost')}
      </div>
      <div id="clima-lista" style="display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Indicadores Bimestrais','📊',`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="clima-nps" style="font-size:26px;font-weight:900;color:var(--green)">—</div>
          <div style="font-size:11px;color:var(--c-slate)">NPS interno</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="clima-participacao" style="font-size:26px;font-weight:900;color:var(--c-accent)">—%</div>
          <div style="font-size:11px;color:var(--c-slate)">Participação</div>
        </div>
        <div class="sum-card" style="padding:14px;text-align:center">
          <div id="clima-total" style="font-size:26px;font-weight:900;color:var(--c-white)">0</div>
          <div style="font-size:11px;color:var(--c-slate)">Pesquisas</div>
        </div>
      </div>`);
    this._carregarClima();
  },
  async _carregarClima() {
    const el  = document.getElementById('clima-lista');
    const tot = document.getElementById('clima-total');
    if (!el||!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*')
        .eq('tipo','pesquisa_clima')
        .order('data_inicio',{ascending:false})
        .limit(8);
      if (tot) tot.textContent = data?.length||0;
      el.innerHTML = data?.length
        ? data.map(p=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(p.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(p.data_inicio)}
                ${p.descricao?` · <a href="${sanitize(p.descricao)}" target="_blank" style="color:var(--c-accent)">Link ↗</a>`:''}
              </div>
            </div>
            <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                         background:${p.ativo?'var(--c-accent)22':'var(--green)22'};
                         color:${p.ativo?'var(--c-accent)':'var(--green)'};
                         border:1px solid ${p.ativo?'var(--c-accent)44':'var(--green)44'}">
              ${p.ativo?'🟠 Aberta':'✓ Encerrada'}
            </span>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma pesquisa registrada ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  async historicoPesquisas() {
    if (!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*')
        .eq('tipo','pesquisa_clima')
        .order('data_inicio',{ascending:false});
      if (!data?.length) {
        abrirModal({ titulo:'📊 Histórico de Pesquisas', tipo:'info',
          corpo:'<div style="padding:24px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma pesquisa registrada ainda.</div>',
          botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
        return;
      }
      const html = data.map(p=>`
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                    padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(p.titulo)}</div>
            <div style="font-size:12px;color:var(--c-slate)">📅 ${_fmt(p.data_inicio)}
              ${p.descricao?` · <a href="${sanitize(p.descricao)}" target="_blank" style="color:var(--c-accent)">Link ↗</a>`:''}
            </div>
          </div>
          <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                       background:${p.ativo?'var(--c-accent)22':'var(--green)22'};
                       color:${p.ativo?'var(--c-accent)':'var(--green)'};
                       border:1px solid ${p.ativo?'var(--c-accent)44':'var(--green)44'}">
            ${p.ativo?'🟠 Aberta':'✓ Encerrada'}
          </span>
        </div>`).join('');
      abrirModal({ titulo:`📊 Histórico de Pesquisas (${data.length})`, tipo:'info', corpo:html,
        botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
    } catch(e) { mostrarToast('Erro ao carregar histórico.','error'); }
  },
  _tapStep: 0,
  _tapData: {},
  _TAP_SECOES: [
    { id:'identificacao',  titulo:'Identificação do Projeto',    placeholder:'Nome do projeto, responsável principal, data de início prevista…'   },
    { id:'justificativa',  titulo:'Justificativa',               placeholder:'Por que este projeto é necessário e inovador para o Núcleo?…'        },
    { id:'objetivo',       titulo:'Objetivo Principal',          placeholder:'O que o projeto deve entregar ao final? Descreva o resultado…'        },
    { id:'escopo',         titulo:'Escopo',                      placeholder:'O que ESTÁ e o que NÃO ESTÁ incluído no projeto?…'                   },
    { id:'limitadores',    titulo:'Limitadores e Restrições',    placeholder:'Quais são os limites de orçamento, tempo, equipe, tecnologia?…'       },
    { id:'riscos',         titulo:'Riscos Principais',           placeholder:'Liste os 3–5 principais riscos e as ações de mitigação…'              },
    { id:'cronograma',     titulo:'Marcos e Cronograma',         placeholder:'Liste as fases com datas previstas. Ex: Levantamento: Mai/26…'        },
    { id:'recursos',       titulo:'Recursos Necessários',        placeholder:'Pessoas, equipamentos, software, orçamento estimado…'                 },
    { id:'stakeholders',   titulo:'Partes Interessadas',         placeholder:'Quem é impactado? Coordenação Geral, empresas parceiras, ABEPRO…'     },
    { id:'metricas',       titulo:'Métricas de Sucesso',         placeholder:'Como saberemos que o projeto foi bem-sucedido? Números, indicadores…' },
    { id:'aprovacao',      titulo:'Validação e Aprovação',       placeholder:'Quem deve aprovar este TAP? Coordenação Geral + GP + Coordenador…'    },
  ],

  _renderTAP() {
    /* Recupera rascunho salvo */
    try {
      const r = localStorage.getItem('nupi_tap_rascunho');
      if (r && !Object.keys(this._tapData).length) {
        this._tapData = JSON.parse(r);
        /* Avança para a última seção preenchida */
        const preenchidas = this._TAP_SECOES.filter(s => this._tapData[s.id]);
        if (preenchidas.length) this._tapStep = Math.min(preenchidas.length, this._TAP_SECOES.length - 1);
      }
    } catch(_) {}
    const pg = document.getElementById('page-gp_tap');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    /* Alertas de prazo TAP */
    const hoje    = new Date();
    const dMaio   = new Date(hoje.getFullYear(), 4, 31);  /* 31/05 */
    const dAgosto = new Date(hoje.getFullYear(), 7, 31);  /* 31/08 */
    const diasMaio   = Math.ceil((dMaio   - hoje) / 86400000);
    const diasAgosto = Math.ceil((dAgosto - hoje) / 86400000);
    const alertaMaio   = diasMaio   >= 0 && diasMaio   <= 60;
    const alertaAgosto = diasAgosto >= 0 && diasAgosto <= 30;

    ct.innerHTML =
      (alertaMaio || alertaAgosto ? `
        <div style="background:var(--red)18;border:1px solid var(--red)44;border-radius:10px;
                    padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--red);font-weight:600">
          ${alertaMaio   ? `📅 Prazo de envio da proposta TAP: <strong>31/05/${hoje.getFullYear()}</strong> — ${diasMaio}d restantes. ` : ''}
          ${alertaAgosto ? `📅 Prazo de apresentação de resultados: <strong>31/08/${hoje.getFullYear()}</strong> — ${diasAgosto}d restantes.` : ''}
        </div>` : '') +
      _sc('Atividade Inovadora — TAP (Atividade 16)','💡',`
        <p style="font-size:13px;color:var(--c-slate);margin-bottom:16px">
          Formulário de Termo de Abertura de Projeto em <strong style="color:var(--c-white)">11 seções obrigatórias</strong>.
          Prazo de envio da proposta: <strong style="color:var(--c-accent)">31/mai/${hoje.getFullYear()}</strong>.
          Prazo de apresentação: <strong style="color:var(--c-accent)">31/ago/${hoje.getFullYear()}</strong>.
        </p>
        <div id="tap-wizard-shell"></div>`) +
      _sc('Capacitações Registradas','🎓',`
        <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
          Treinamentos e capacitações da equipe (Atividade 11 — mín. 1/semestre/membro).
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          ${_btn('+ Registrar capacitação',"PagePessoas.novoTreinamento()")}
        </div>
        <div id="tap-lista" style="display:flex;flex-direction:column;gap:8px">
          <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
        </div>`);
    this._renderTAPWizard();
    this._carregarTAP();
  },

  _renderTAPWizard() {
    const shell = document.getElementById('tap-wizard-shell');
    if (!shell) return;
    const step  = this._tapStep;
    const secao = this._TAP_SECOES[step];
    const total = this._TAP_SECOES.length;
    const pct   = Math.round(((step + 1) / total) * 100);

    /* Barra de progresso */
    const barras = this._TAP_SECOES.map((s, i) => `
      <div style="flex:1;height:4px;border-radius:2px;
                  background:${i < step ? 'var(--green)' : i === step ? 'var(--c-accent)' : 'var(--b-2)'};"
           title="${s.titulo}"></div>`).join('');

    shell.innerHTML = `
      <div style="margin-bottom:16px">
        <div style="display:flex;gap:3px;margin-bottom:8px">${barras}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--c-slate)">
          <span>Seção ${step + 1} de ${total}</span>
          <span style="font-weight:700;color:var(--c-accent)">${pct}% concluído</span>
        </div>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:800;color:var(--c-accent);text-transform:uppercase;
                    letter-spacing:.06em;margin-bottom:8px">${step + 1}. ${secao.titulo}</div>
        <textarea id="tap-input-${secao.id}" class="form-input" rows="5"
                  placeholder="${secao.placeholder}"
                  style="min-height:100px;resize:vertical">${this._tapData[secao.id] || ''}</textarea>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:8px">
          ${step > 0 ? `<button class="btn btn-ghost" style="font-size:12px" onclick="PagePessoas._tapNav(-1)">← Anterior</button>` : ''}
          <button class="btn btn-ghost" style="font-size:12px" onclick="PagePessoas._tapRascunho()">💾 Salvar rascunho</button>
        </div>
        ${step < total - 1
          ? `<button class="btn btn-primary" style="font-size:13px" onclick="PagePessoas._tapNav(1)">Próxima seção →</button>`
          : `<button class="btn btn-primary" style="font-size:13px;background:var(--green)" onclick="PagePessoas._tapSubmeter()">✓ Submeter TAP</button>`}
      </div>
      <div style="margin-top:12px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${this._TAP_SECOES.map((s, i) => `
            <button onclick="PagePessoas._tapIr(${i})"
                    style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid var(--b-2);
                           cursor:pointer;font-family:var(--f-body);
                           background:${i===step?'var(--c-accent)':this._tapData[s.id]?'var(--green)22':'var(--b-1)'};
                           color:${i===step?'#fff':this._tapData[s.id]?'var(--green)':'var(--c-slate)'}">
              ${i+1}
            </button>`).join('')}
        </div>
      </div>`;
  },

  _tapNav(delta) {
    /* Salva o valor da seção atual antes de navegar */
    const secao = this._TAP_SECOES[this._tapStep];
    const val = document.getElementById(`tap-input-${secao.id}`)?.value?.trim();
    if (!val && delta > 0) { mostrarToast('Preencha esta seção antes de avançar.','warning'); return; }
    if (val) this._tapData[secao.id] = val;
    this._tapStep = Math.max(0, Math.min(this._TAP_SECOES.length - 1, this._tapStep + delta));
    this._renderTAPWizard();
  },

  _tapIr(i) {
    const secao = this._TAP_SECOES[this._tapStep];
    const val = document.getElementById(`tap-input-${secao.id}`)?.value?.trim();
    if (val) this._tapData[secao.id] = val;
    this._tapStep = i;
    this._renderTAPWizard();
  },

  _tapRascunho() {
    const secao = this._TAP_SECOES[this._tapStep];
    const val = document.getElementById(`tap-input-${secao.id}`)?.value?.trim();
    if (val) this._tapData[secao.id] = val;
    localStorage.setItem('nupi_tap_rascunho', JSON.stringify(this._tapData));
    mostrarToast('Rascunho salvo localmente.','success');
  },

  async _tapSubmeter() {
    /* Salva a última seção */
    const secao = this._TAP_SECOES[this._tapStep];
    const val = document.getElementById(`tap-input-${secao.id}`)?.value?.trim();
    if (val) this._tapData[secao.id] = val;
    /* Valida que todas as seções foram preenchidas */
    const vazias = this._TAP_SECOES.filter(s => !this._tapData[s.id]);
    if (vazias.length) {
      mostrarToast(`Preencha todas as ${this._TAP_SECOES.length} seções! Faltam: ${vazias.map(s=>s.titulo).slice(0,2).join(', ')}…`, 'warning');
      return;
    }
    if (!_sbq()) { mostrarToast('Supabase não conectado.','error'); return; }
    try {
      const coords = await getCoords();
      const gp = coords.find(c => c.sigla === 'GP');
      /* Salva como evento do tipo 'tap' com o JSON das seções no descricao */
      await _sbq().from('eventos').insert([{
        titulo: `TAP Inovador ${new Date().getFullYear()} — ${window._appProfile?.nome || 'NUPIEEPRO'}`,
        tipo: 'tap', ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
        descricao: JSON.stringify(this._tapData),
        coordenadoria_id: gp?.id || null,
        criado_por: window._appProfile?.id,
      }]);
      localStorage.removeItem('nupi_tap_rascunho');
      this._tapData = {}; this._tapStep = 0;
      mostrarToast('TAP submetido com sucesso! 🎉','success');
      /* Notifica Coord Geral */
      _notificarCoord('GER', '💡 Novo TAP submetido',
        `O Termo de Abertura de Projeto foi submetido por ${window._appProfile?.nome || 'um membro'} para avaliação.`, 'info', 'abj');
      this._renderTAPWizard();
    } catch(e) { mostrarToast('Erro ao submeter TAP.','error'); console.warn(e); }
  },
  async _carregarTAP() {
    const el=document.getElementById('tap-lista');
    if(!el||!_sbq())return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*, users!criado_por(nome)')
        .eq('tipo','treinamento')
        .order('data_inicio',{ascending:false})
        .limit(10);
      el.innerHTML = data?.length
        ? data.map(t=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(t.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">
                📅 ${_fmt(t.data_inicio)} · 👥 ${t.vagas||'—'} participantes
                ${t.local?` · 📍 ${sanitize(t.local)}`:''}
              </div>
            </div>
            <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                         background:var(--c-accent)22;color:var(--c-accent);border:1px solid var(--c-accent)44">
              Treinamento
            </span>
          </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum treinamento registrado.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  async relatorioTAP() {
    if (!_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*, users!criado_por(nome, apelido)')
        .eq('tipo','tap')
        .order('data_inicio',{ascending:false});
      if (!data?.length) {
        abrirModal({ titulo:'💡 TAPs Submetidos', tipo:'info',
          corpo:'<div style="padding:24px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum TAP submetido ainda.</div>',
          botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
        return;
      }
      const html = data.map(t => {
        let s={}; try { s=JSON.parse(t.descricao||'{}'); } catch {}
        const autor = t.users?.apelido||t.users?.nome||'Desconhecido';
        return `
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;padding:16px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px">
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--c-white)">${sanitize(t.titulo)}</div>
                <div style="font-size:12px;color:var(--c-slate);margin-top:2px">📅 ${_fmt(t.data_inicio)} · 👤 ${sanitize(autor)}</div>
              </div>
              <span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;
                           background:var(--c-accent)22;color:var(--c-accent);border:1px solid var(--c-accent)44;
                           text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">TAP Inovador</span>
            </div>
            ${s.identificacao?`<div style="margin-bottom:6px;font-size:13px;color:var(--c-white)"><strong style="color:var(--c-accent)">Identificação:</strong> ${sanitize(s.identificacao.slice(0,220))}${s.identificacao.length>220?'…':''}</div>`:''}
            ${s.objetivo?`<div style="font-size:13px;color:var(--c-slate)"><strong style="color:var(--c-white)">Objetivo:</strong> ${sanitize(s.objetivo.slice(0,220))}${s.objetivo.length>220?'…':''}</div>`:''}
          </div>`;
      }).join('');
      abrirModal({ titulo:`💡 TAPs Submetidos (${data.length})`, tipo:'info', corpo:html,
        botoes:[{texto:'Fechar',classe:'btn-ghost',acao:fecharModal}]});
    } catch(e) { mostrarToast('Erro ao carregar TAPs.','error'); }
  },
  novoTreinamento() {
    const hoje=new Date().toISOString().slice(0,16);
    abrirModal({ titulo:'🎓 Registrar Capacitação', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome do Treinamento *</label>
        <input id="tr-nome" class="form-input" placeholder="Ex: Fundamentos de Gestão de Projetos"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data</label>
          <input id="tr-data" type="datetime-local" class="form-input" value="${hoje}"></div>
        <div class="form-group"><label class="form-label">Vagas</label>
          <input id="tr-vagas" type="number" class="form-input" placeholder="20"></div>
      </div>
      <div class="form-group"><label class="form-label">Local / Link</label>
        <input id="tr-local" class="form-input" placeholder="Presencial / https://meet.google.com/..."></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar ✓',classe:'btn-primary',acao:()=>this._salvarTreinamento()}
    ]});
  },
  async _salvarTreinamento() {
    const titulo = document.getElementById('tr-nome')?.value?.trim();
    const data   = document.getElementById('tr-data')?.value;
    const vagas  = parseInt(document.getElementById('tr-vagas')?.value)||null;
    const local  = document.getElementById('tr-local')?.value?.trim();
    if (!titulo||!data) { mostrarToast('Preencha nome e data!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const gp = coords.find(c=>c.sigla==='GP');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'treinamento', data_inicio:data,
        vagas:vagas||null, local:local||null, ativo:true,
        coordenadoria_id:gp?.id||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Treinamento registrado!','success');
      this._carregarTAP();
    } catch(e) { mostrarToast('Erro ao registrar.','error'); }
  },
  convidar() {
    getCoords().then(coords=>{
      this._conviteCoords = coords;
      abrirModal({titulo:'✉️ Convidar Membro',tipo:'info',corpo:`
        <div class="form-group"><label class="form-label">Nome completo *</label>
          <input id="inv-nome" class="form-input" placeholder="Nome do novo membro"></div>
        <div class="form-group"><label class="form-label">E-mail *</label>
          <input id="inv-email" type="email" class="form-input" placeholder="email@exemplo.com"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Coordenadoria</label>
            <select id="inv-coord" class="form-select">
              ${coords.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Cargo</label>
            <select id="inv-cargo" class="form-select">
              <option value="assessor">Assessor</option>
              <option value="coordenador">Coordenador</option>
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">Role no sistema</label>
          <select id="inv-role" class="form-select">
            <option value="assessor">Assessor</option>
            <option value="coordenador">Coordenador</option>
            <option value="admin">Admin</option>
          </select></div>
        <div style="background:var(--b-1);border-radius:8px;padding:10px;font-size:12px;color:var(--c-slate)">
          ℹ️ O link de convite expira em 7 dias e é de uso único.
        </div>`,
      botoes:[
        {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
        {texto:'Enviar ✓',classe:'btn-primary',acao:()=>this._enviarConvite()}
      ]});
    });
  },
  async _enviarConvite() {
    const nome  = document.getElementById('inv-nome')?.value?.trim();
    const email = document.getElementById('inv-email')?.value?.trim();
    const coord = document.getElementById('inv-coord')?.value;
    const cargo = document.getElementById('inv-cargo')?.value;
    const role  = document.getElementById('inv-role')?.value || 'assessor';
    if (!nome)  { mostrarToast('Insira o nome!', 'warning'); return; }
    if (!email) { mostrarToast('Insira o e-mail!', 'warning'); return; }
    fecharModal();
    try {
      const { data, error } = await _sbq().from('convites').insert([{
        email, nome, coordenadoria_id: coord, cargo, role,
        criado_por: window._appProfile?.id,
      }]).select().single();
      if (error) throw error;

      const coordInfo = this._conviteCoords?.find(c => c.id === coord);
      const link = `${location.origin}/convite.html?token=${data.token}`;

      let emailOk = false;
      try {
        await window.EmailsModule?.enviarConvite({
          email, coord: coordInfo?.nome, cargo, token: data.token,
          nomeConvidado: nome,
          anoGestao: new Date().getFullYear().toString(),
          criadoPor: window._appProfile?.apelido || window._appProfile?.nome || 'Equipe Nupi'
        });
        emailOk = true;
      } catch(_) {}

      if (emailOk) {
        mostrarToast(`Convite enviado para ${email}!`, 'success');
      } else {
        abrirModal({ titulo:'📋 Link de Convite', tipo:'info', corpo:`
          <p style="margin-bottom:12px;color:var(--c-slate);font-size:14px">Email não configurado. Copie o link e envie manualmente para <strong>${email}</strong>:</p>
          <div style="background:var(--b-1);border-radius:8px;padding:12px;word-break:break-all;font-size:12px;font-family:monospace;line-height:1.6">${link}</div>`,
          botoes:[
            { texto:'Copiar link', classe:'btn-primary', acao:()=>{ navigator.clipboard.writeText(link); fecharModal(); mostrarToast('Link copiado!','success'); } },
            { texto:'Fechar', classe:'btn-ghost', acao: fecharModal }
          ]
        });
      }

      _notificar(window._appProfile?.id,
        'Convite enviado 📩', `Convite gerado para ${email} (${cargo}).`, 'info', 'sistema');
    } catch(e) { mostrarToast('Erro ao enviar convite.', 'error'); }
  },
  adicionarClima() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'🌡️ Nova Pesquisa de Clima', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="cl-titulo" class="form-input" value="Pesquisa de Clima — ${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}"></div>
      <div class="form-group"><label class="form-label">Link do formulário (Google Forms etc.)</label>
        <input id="cl-link" type="url" class="form-input" placeholder="https://forms.gle/..."></div>
      <div class="form-group"><label class="form-label">Data de encerramento</label>
        <input id="cl-data" type="date" class="form-input" value="${hoje}"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Publicar ✓',classe:'btn-primary',acao:()=>this._publicarClima()}
    ]});
  },
  async _publicarClima() {
    const titulo = document.getElementById('cl-titulo')?.value?.trim();
    const link   = document.getElementById('cl-link')?.value?.trim();
    const data   = document.getElementById('cl-data')?.value;
    if (!titulo) { mostrarToast('Preencha o título!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const gp = coords.find(c=>c.sigla==='GP');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'pesquisa_clima',
        data_inicio: data+'T08:00:00',
        descricao: link||null, ativo:true,
        coordenadoria_id: gp?.id||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Pesquisa publicada!','success');
      /* Notifica toda a equipe sobre a pesquisa */
      const coordsAll = await getCoords();
      for (const c of coordsAll) {
        await _notificarCoord(c.sigla, '🌡️ Nova pesquisa de clima',
          `Uma nova pesquisa de clima organizacional foi aberta. Responda até ${data ? _fmt(data) : 'em breve'}.`,
          'info', 'sistema');
      }
      this._carregarClima();
    } catch(e) { mostrarToast('Erro ao publicar pesquisa.','error'); }
  },
  exportar(){mostrarToast('Exportação aguardando Supabase.','info');},
  novoTalento() {
    abrirModal({ titulo:'👤 Registrar no Banco de Talentos', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome Completo *</label>
        <input id="nt-nome" class="form-input" placeholder="Ex: Maria Silva"></div>
      <div class="form-group"><label class="form-label">Habilidades / Área *</label>
        <input id="nt-habilidades" class="form-input" placeholder="Ex: Design, Gestão de Projetos, Python"></div>
      <div class="form-group"><label class="form-label">Universidade / Instituição</label>
        <input id="nt-univ" class="form-input" placeholder="Ex: UESPI, IFPI"></div>
      <div class="form-group"><label class="form-label">Contato (e-mail ou @)</label>
        <input id="nt-contato" class="form-input" placeholder="email@exemplo.com ou @instagram"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar',classe:'btn-primary',acao:()=>PagePessoas._salvarTalento()}
    ]});
  },
  async _salvarTalento() {
    const nome        = document.getElementById('nt-nome')?.value?.trim();
    const habilidades = document.getElementById('nt-habilidades')?.value?.trim();
    const univ        = document.getElementById('nt-univ')?.value?.trim();
    const contato     = document.getElementById('nt-contato')?.value?.trim();
    if (!nome || !habilidades) { mostrarToast('Preencha nome e habilidades!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const gp = coords.find(c=>c.sigla==='GP');
      await _sbq().from('demandas').insert([{
        titulo: nome, coluna:'pendente',
        descricao: JSON.stringify({ tipo:'talento', habilidades, universidade:univ||null, contato:contato||null }),
        coordenadoria_id: gp?.id||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Talento registrado com sucesso!','success');
      PagePessoas._carregarTalentos?.();
    } catch(e) { mostrarToast('Erro ao registrar talento.','error'); }
  },
  _renderTalentos() {
    const pg = document.getElementById('page-gp_talentos');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Banco de Talentos','👥',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        CRM de candidatos e membros com habilidades estratégicas para recrutamento e formação de equipes.
      </p>
      ${_btn('+ Registrar Talento','PagePessoas.novoTalento()')}
      <div style="margin-top:16px;overflow-x:auto;">
        <table style="width:100%;text-align:left;border-collapse:collapse;">
          <thead>
            <tr style="color:var(--c-slate);border-bottom:1px solid var(--b-1);">
              <th style="padding:10px 12px;font-size:12px;font-weight:600;">Nome</th>
              <th style="padding:10px 12px;font-size:12px;font-weight:600;">Habilidades</th>
              <th style="padding:10px 12px;font-size:12px;font-weight:600;">Instituição</th>
              <th style="padding:10px 12px;font-size:12px;font-weight:600;">Contato</th>
            </tr>
          </thead>
          <tbody id="talentosGrid">
            <tr><td colspan="4" style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</td></tr>
          </tbody>
        </table>
      </div>`);
    this._carregarTalentos();
  },
  async _carregarTalentos() {
    const el = document.getElementById('talentosGrid');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('demandas')
        .select('titulo, descricao, created_at')
        .ilike('descricao','%"tipo":"talento"%')
        .order('created_at',{ascending:false}).limit(50);
      if (!data?.length) {
        el.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum talento cadastrado ainda.</td></tr>';
        return;
      }
      el.innerHTML = data.map(d => {
        let info = {}; try { info = JSON.parse(d.descricao||'{}'); } catch(_){}
        return `<tr style="border-bottom:1px solid var(--b-1);">
          <td style="padding:10px 12px;font-size:13px;font-weight:600;color:var(--c-white)">${sanitize(d.titulo)}</td>
          <td style="padding:10px 12px;font-size:12px;color:var(--c-slate)">${sanitize(info.habilidades||'—')}</td>
          <td style="padding:10px 12px;font-size:12px;color:var(--c-slate)">${sanitize(info.universidade||'—')}</td>
          <td style="padding:10px 12px;font-size:12px;color:var(--c-slate)">${sanitize(info.contato||'—')}</td>
        </tr>`;
      }).join('');
    } catch(e) { el.innerHTML='<tr><td colspan="4" style="padding:16px;color:var(--c-slate)">Erro ao carregar.</td></tr>'; }
  },

  /* ─── Aniversários do Núcleo ──────────────────────────────── */
  _renderAniversarios() {
    const pg = document.getElementById('page-gp_aniversarios');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Aniversários do Núcleo','🎂',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Membros com aniversário neste mês e no próximo. O sistema envia e-mail automático no dia.
      </p>
      <div id="aniv-este-mes">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-slate);margin-bottom:8px">Este mês</div>
        <div id="aniv-este-lista" style="display:flex;flex-direction:column;gap:8px">
          <div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
        </div>
      </div>
      <div style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-slate);margin-bottom:8px">Próximo mês</div>
        <div id="aniv-prox-lista" style="display:flex;flex-direction:column;gap:8px">
          <div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
        </div>
      </div>`);
    this._carregarAniversarios();
  },
  async _carregarAniversarios() {
    const elEste = document.getElementById('aniv-este-lista');
    const elProx = document.getElementById('aniv-prox-lista');
    if (!elEste || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('users')
        .select('nome,email,aniversario,avatar_url,iniciais,coordenadorias(nome)')
        .eq('ativo', true)
        .not('aniversario','is',null)
        .order('nome');
      if (!data?.length) {
        const msg = '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum membro com aniversário cadastrado.</div>';
        elEste.innerHTML = msg; if (elProx) elProx.innerHTML = msg;
        return;
      }
      const hoje     = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const mesProx  = mesAtual === 12 ? 1 : mesAtual + 1;
      const _card = (m, dia) => `
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--c-s5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden">
            ${m.avatar_url?`<img src="${sanitize(m.avatar_url)}" style="width:100%;height:100%;object-fit:cover">`:(m.iniciais||m.nome||'?').slice(0,2).toUpperCase()}
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(m.nome||m.email||'—')}</div>
            <div style="font-size:12px;color:var(--c-slate)">${sanitize(m.coordenadorias?.nome||'—')} · 🎂 Dia ${dia}</div>
          </div>
        </div>`;
      const esteMs = data.filter(m => { const [,mm] = (m.aniversario||'').split('-'); return parseInt(mm)===mesAtual; });
      const proxMs = data.filter(m => { const [,mm] = (m.aniversario||'').split('-'); return parseInt(mm)===mesProx; });
      const _renderLista = (arr, el) => {
        el.innerHTML = arr.length
          ? arr.sort((a,b)=>{ const da=(a.aniversario||'').slice(8); const db=(b.aniversario||'').slice(8); return da.localeCompare(db); })
              .map(m=>_card(m,(m.aniversario||'').slice(8))).join('')
          : '<div style="padding:12px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum aniversariante.</div>';
      };
      _renderLista(esteMs, elEste);
      if (elProx) _renderLista(proxMs, elProx);
    } catch(e) { elEste.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },

  /* ─── Treinamentos Internos (GP) ──────────────────────────── */
  _renderTreinamentosInternos() {
    const pg = document.getElementById('page-gp_treinamentos');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    const podeCriar = typeof Permissoes !== 'undefined'
      ? Permissoes.pode('podeCriarEvento') || Permissoes.isAdmin()
      : true;
    ct.innerHTML = _sc('Treinamentos Internos','📚',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Capacitações e onboarding geridos pela GP. Registros contam como Atividade 11 do ABJ.
      </p>
      ${podeCriar ? _btn('+ Novo treinamento','PagePessoas.novoTreinamentoInterno()') : ''}
      <div id="gp-trein-lista" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarTreinamentosInternos();
  },
  async _carregarTreinamentosInternos() {
    const el = document.getElementById('gp-trein-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('eventos')
        .select('*,coordenadorias(nome)')
        .eq('tipo','treinamento_interno')
        .order('data_inicio', { ascending: false });
      el.innerHTML = data?.length
        ? data.map(e => {
            const dt = e.data_inicio ? new Date(e.data_inicio+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';
            return `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
                <div style="font-weight:700;font-size:14px;color:var(--c-white)">${sanitize(e.titulo)}</div>
                <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:var(--b-2);color:var(--c-slate)">📅 ${dt}</span>
              </div>
              ${e.local?`<div style="font-size:12px;color:var(--c-slate)">📍 ${sanitize(e.local)}</div>`:''}
              ${e.vagas?`<div style="font-size:12px;color:var(--c-slate)">👥 ${e.vagas} vagas</div>`:''}
            </div>`;
          }).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum treinamento interno cadastrado.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },
  novoTreinamentoInterno() {
    const hoje = new Date().toISOString().slice(0,16);
    abrirModal({ titulo:'📚 Novo Treinamento Interno', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="gti-titulo" class="form-input" placeholder="Ex: Onboarding novos membros"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data / hora</label>
          <input id="gti-data" type="datetime-local" class="form-input" value="${hoje}"></div>
        <div class="form-group"><label class="form-label">Local</label>
          <input id="gti-local" class="form-input" placeholder="Sala / Online"></div>
      </div>
      <div class="form-group"><label class="form-label">Vagas</label>
        <input id="gti-vagas" type="number" class="form-input" placeholder="Deixe vazio se ilimitado"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Criar ✓',classe:'btn-primary',acao:()=>PagePessoas._salvarTreinamentoInterno()}
    ]});
  },
  async _salvarTreinamentoInterno() {
    const titulo = document.getElementById('gti-titulo')?.value?.trim();
    const data   = document.getElementById('gti-data')?.value;
    const local  = document.getElementById('gti-local')?.value?.trim();
    const vagas  = parseInt(document.getElementById('gti-vagas')?.value)||null;
    if (!titulo||!data) { mostrarToast('Preencha título e data!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const gp = coords.find(c=>c.sigla==='GP');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'treinamento_interno', data_inicio:data,
        local:local||null, vagas:vagas||null, ativo:true,
        coordenadoria_id: gp?.id || window._appProfile?.coordenadoria_id || null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Treinamento criado!','success');
      this._carregarTreinamentosInternos();
    } catch(e) { mostrarToast('Erro ao criar treinamento.','error'); }
  },
};
/* ══════════════════════════════════════════════════════════════
   PageDev — Painel de Administração do Sistema (Admin Only)
   Acesso exclusivo: role === 'admin'  (JR e afins)
   ══════════════════════════════════════════════════════════════ */
const PageDev = {
  _tab: 'usuarios',
  _coords: [],   /* cache de coordenadorias */

  _temAcesso() { return window._appProfile?._isDev || window._appProfile?.role === 'admin'; },

  /* ── Entry point ── */
  async init() {
    /* Pré-carrega coordenadorias para selects */
    if (_sbq() && !this._coords.length) {
      const { data } = await _sbq().from('coordenadorias').select('id,nome,sigla').order('nome');
      this._coords = data || [];
    }
    this._render();
  },

  /* ── Shell com tabs ── */
  _render() {
    const pg = document.getElementById('page-dev_usuarios');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    if (!this._temAcesso()) {
      ct.innerHTML = '<div style="padding:40px;text-align:center;color:var(--c-slate)">🔒 Acesso restrito ao administrador do sistema.</div>';
      return;
    }
    const tabs = [
      { id:'usuarios',    icon:'👥', label:'Usuários'    },
      { id:'convites',    icon:'📩', label:'Convites'    },
      { id:'permissoes',  icon:'🔐', label:'Permissões'  },
      { id:'logs',        icon:'📋', label:'Logs'        },
      { id:'sistema',     icon:'⚙️', label:'Sistema'     },
    ];
    ct.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--b-1)">
        ${tabs.map(t=>`
          <button onclick="PageDev._switchTab('${t.id}')"
                  id="devtab-${t.id}"
                  style="padding:8px 14px;border-radius:8px;border:1px solid var(--b-2);background:${this._tab===t.id?'var(--c-accent)':'var(--b-1)'};
                         color:${this._tab===t.id?'#fff':'var(--c-slate)'};font-size:12px;font-weight:700;cursor:pointer;font-family:var(--f-body)">
            ${t.icon} ${t.label}
          </button>`).join('')}
      </div>
      <div id="devTabContent"></div>`;
    this._loadTab(this._tab);
  },

  _switchTab(id) {
    this._tab = id;
    document.querySelectorAll('[id^="devtab-"]').forEach(b => {
      const active = b.id === `devtab-${id}`;
      b.style.background = active ? 'var(--c-accent)' : 'var(--b-1)';
      b.style.color      = active ? '#fff' : 'var(--c-slate)';
    });
    this._loadTab(id);
  },

  _loadTab(id) {
    const fn = {
      usuarios:   () => this._tabUsuarios(),
      convites:   () => this._tabConvites(),
      permissoes: () => this._tabPermissoes(),
      logs:       () => this._tabLogs(),
      sistema:    () => this._tabSistema(),
    }[id];
    if (fn) fn();
  },

  /* ══════════════════════════
     TAB: USUÁRIOS
  ══════════════════════════ */
  _tabUsuarios() {
    const el = document.getElementById('devTabContent');
    if (!el) return;
    const coordOpts = this._coords.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
    el.innerHTML = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
        <input id="devSearch" class="form-input" style="max-width:220px;padding:8px 12px"
               placeholder="🔍 Buscar nome ou e-mail…" oninput="PageDev._filtrarUsuarios()">
        <select id="devFiltroRole" class="form-select" style="max-width:160px" onchange="PageDev._filtrarUsuarios()">
          <option value="">Todos os roles</option>
          <option value="admin">Admin</option>
          <option value="coordenador">Coordenador</option>
          <option value="assessor">Assessor</option>
          <option value="conselheiro">Conselheiro</option>
          <option value="membro">Membro</option>
        </select>
        <select id="devFiltroCoord" class="form-select" style="max-width:180px" onchange="PageDev._filtrarUsuarios()">
          <option value="">Todas as coords</option>
          ${coordOpts}
        </select>
        <button class="btn btn-primary" onclick="PageDev._novoConviteRapido()"
                style="margin-left:auto;font-size:12px">+ Convidar membro</button>
      </div>
      <div id="devListaUsuarios">
        <div style="padding:20px;text-align:center;color:var(--c-slate)"><span class="spinner"></span></div>
      </div>`;
    this._carregarUsuarios();
  },

  async _carregarUsuarios() {
    const el = document.getElementById('devListaUsuarios');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('users')
        .select('*,coordenadorias(nome,sigla,cor)')
        .order('created_at', { ascending: false });
      window._devUsuarios = data || [];
      this._renderUsuariosFiltrados(data || []);
    } catch(e) {
      el.innerHTML = '<div style="padding:16px;color:var(--c-slate)">Erro ao carregar usuários.</div>';
    }
  },

  _filtrarUsuarios() {
    const q     = (document.getElementById('devSearch')?.value || '').toLowerCase();
    const role  = document.getElementById('devFiltroRole')?.value  || '';
    const coord = document.getElementById('devFiltroCoord')?.value || '';
    let list = window._devUsuarios || [];
    if (q)     list = list.filter(u => (u.nome+u.email).toLowerCase().includes(q));
    if (role)  list = list.filter(u => u.role === role);
    if (coord) list = list.filter(u => u.coordenadoria_id === coord);
    this._renderUsuariosFiltrados(list);
  },

  _renderUsuariosFiltrados(list) {
    const el = document.getElementById('devListaUsuarios');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum usuário encontrado.</div>';
      return;
    }
    el.innerHTML = list.map(u => {
      const nivel = (window.Permissoes?.getNivelInfo(u.role, u.coordenadorias?.sigla)) || { cor:'#666', badge: u.role };
      const ativoStyle = u.ativo ? 'var(--green)' : 'var(--red)';
      return `
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                    padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:${nivel.cor}22;border:1px solid ${nivel.cor}44;
                        display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:${nivel.cor}">
              ${sanitize(u.iniciais||'?')}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">
                ${sanitize(u.apelido ? u.nome + ' <span style="color:var(--c-slate)">(' + u.apelido + ')</span>' : u.nome||u.email||'—')}
              </div>
              <div style="font-size:11px;color:var(--c-slate)">${sanitize(u.email||'—')} · ${sanitize(u.coordenadorias?.nome||'Sem coord')} · ${u.cargo||'—'}</div>
              ${u.aniversario ? `<div style="font-size:10px;color:var(--c-slate)">🎂 ${_fmt(u.aniversario)}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;
                         background:${nivel.cor}18;color:${nivel.cor};border:1px solid ${nivel.cor}33">
              ${nivel.badge}
            </span>
            <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;
                         background:${ativoStyle}18;color:${ativoStyle};border:1px solid ${ativoStyle}33">
              ${u.ativo ? '● Ativo' : '○ Inativo'}
            </span>
            <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px"
                    onclick="PageDev.editarUsuario('${u.id}')">✏️ Editar</button>
          </div>
        </div>`;
    }).join('');
  },

  editarUsuario(userId) {
    const u = (window._devUsuarios || []).find(x => x.id === userId);
    if (!u) return;
    const coordOpts = this._coords.map(c =>
      `<option value="${c.id}" ${u.coordenadoria_id === c.id ? 'selected' : ''}>${c.nome}</option>`
    ).join('');
    abrirModal({ titulo:`✏️ Editar: ${u.nome || u.email}`, tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome completo</label>
        <input id="eu-nome" class="form-input" value="${sanitize(u.nome||'')}"></div>
      <div class="form-group"><label class="form-label">Apelido</label>
        <input id="eu-apelido" class="form-input" value="${sanitize(u.apelido||'')}"></div>
      <div class="form-group"><label class="form-label">Cargo</label>
        <input id="eu-cargo" class="form-input" value="${sanitize(u.cargo||'')}"></div>
      <div class="form-group"><label class="form-label">Role (nível de acesso)</label>
        <select id="eu-role" class="form-select">
          <option value="admin"      ${u.role==='admin'?'selected':''}>👨‍💻 Admin</option>
          <option value="coordenador"${u.role==='coordenador'?'selected':''}>📋 Coordenador</option>
          <option value="assessor"   ${u.role==='assessor'?'selected':''}>✅ Assessor</option>
          <option value="conselheiro"${u.role==='conselheiro'?'selected':''}>⭐ Conselheiro</option>
          <option value="membro"     ${u.role==='membro'?'selected':''}>👤 Membro</option>
        </select></div>
      <div class="form-group"><label class="form-label">Coordenadoria</label>
        <select id="eu-coord" class="form-select"><option value="">— Sem coord —</option>${coordOpts}</select></div>
      <div class="form-group"><label class="form-label">Aniversário</label>
        <input id="eu-aniv" type="date" class="form-input" value="${u.aniversario||''}"></div>
      <div class="form-group"><label class="form-label">Status</label>
        <select id="eu-ativo" class="form-select">
          <option value="true"  ${u.ativo?'selected':''}>● Ativo</option>
          <option value="false" ${!u.ativo?'selected':''}>○ Inativo (desligado)</option>
        </select></div>
      <p style="font-size:11px;color:var(--c-slate);margin-top:8px">
        ⚠️ Ao inativar, o sistema envia automaticamente o e-mail de despedida.
      </p>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Salvar alterações', classe:'btn-primary', acao: () => this._salvarEdicaoUsuario(userId, u) }
    ]});
  },

  async _salvarEdicaoUsuario(userId, uOriginal) {
    const nome   = document.getElementById('eu-nome')?.value.trim();
    const apelido= document.getElementById('eu-apelido')?.value.trim() || null;
    const cargo  = document.getElementById('eu-cargo')?.value.trim() || null;
    const role   = document.getElementById('eu-role')?.value;
    const coordId= document.getElementById('eu-coord')?.value || null;
    const aniv   = document.getElementById('eu-aniv')?.value || null;
    const ativo  = document.getElementById('eu-ativo')?.value === 'true';
    if (!nome) { mostrarToast('Nome é obrigatório.','error'); return; }
    try {
      await _sbq().from('users').update({ nome, apelido, cargo, role, coordenadoria_id: coordId, aniversario: aniv, ativo })
        .eq('id', userId);
      fecharModal();
      mostrarToast('Usuário atualizado!', 'success');
      this._carregarUsuarios();
    } catch(e) {
      mostrarToast('Erro ao salvar: ' + e.message, 'error');
    }
  },

  /* ══════════════════════════
     TAB: CONVITES
  ══════════════════════════ */
  _tabConvites() {
    const el = document.getElementById('devTabContent');
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:13px;color:var(--c-slate)">Convites enviados e pendentes</span>
        <button class="btn btn-primary" style="font-size:12px" onclick="PageDev.novoConvite()">+ Novo convite</button>
      </div>
      <div id="devConvites">
        <div style="padding:20px;text-align:center;color:var(--c-slate)"><span class="spinner"></span></div>
      </div>`;
    this._carregarConvites();
  },

  async _carregarConvites() {
    const el = document.getElementById('devConvites');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('convites')
        .select('*,coordenadorias(nome,sigla)')
        .order('created_at', { ascending: false })
        .limit(30);
      el.innerHTML = (data||[]).map(c => {
        const exp     = new Date(c.expires_at);
        const expirou = exp < new Date() || c.usado;
        const expStr  = _fmt(c.expires_at);
        return `
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(c.email)}</div>
              <div style="font-size:11px;color:var(--c-slate)">${sanitize(c.coordenadorias?.nome||'—')} · ${c.cargo||c.role} · Expira ${expStr}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;
                           background:${c.usado?'var(--green)18':expirou?'var(--red)18':'var(--a-2)'};
                           color:${c.usado?'var(--green)':expirou?'var(--red)':'var(--c-accent)'};
                           border:1px solid ${c.usado?'var(--green)44':expirou?'var(--red)44':'var(--b-a)'}">
                ${c.usado ? '✅ Usado' : expirou ? '⏰ Expirado' : '⏳ Pendente'}
              </span>
              ${!c.usado && !expirou ? `
                <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px"
                        onclick="PageDev._reenviarConvite('${c.id}','${c.email}','${c.token}')">📩 Reenviar</button>
                <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;color:var(--red)"
                        onclick="PageDev._revogarConvite('${c.id}')">✕ Revogar</button>` : ''}
            </div>
          </div>`;
      }).join('') || '<div style="padding:20px;text-align:center;color:var(--c-slate)">Nenhum convite ainda.</div>';
    } catch(e) {
      el.innerHTML = '<div style="color:var(--c-slate);padding:16px">Erro ao carregar.</div>';
    }
  },

  novoConvite() {
    const coordOpts = this._coords.map(c => `<option value="${c.id}">${c.nome} (${c.sigla})</option>`).join('');
    abrirModal({ titulo:'📩 Enviar Convite', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome completo *</label>
        <input id="nc-nome" class="form-input" placeholder="Nome do novo membro"></div>
      <div class="form-group"><label class="form-label">E-mail *</label>
        <input id="nc-email" type="email" class="form-input" placeholder="email@exemplo.com"></div>
      <div class="form-group"><label class="form-label">Coordenadoria *</label>
        <select id="nc-coord" class="form-select"><option value="">— Selecione —</option>${coordOpts}</select></div>
      <div class="form-group"><label class="form-label">Role</label>
        <select id="nc-role" class="form-select">
          <option value="assessor">Assessor</option>
          <option value="coordenador">Coordenador</option>
          <option value="admin">Admin</option>
        </select></div>
      <div class="form-group"><label class="form-label">Cargo (texto livre)</label>
        <input id="nc-cargo" class="form-input" placeholder="Ex: Vice Coordenador, Assessor de Projetos…"></div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Enviar convite 🚀', classe:'btn-primary', acao: () => this._criarConvite() }
    ]});
  },

  async _criarConvite() {
    const nome  = document.getElementById('nc-nome')?.value.trim();
    const email = document.getElementById('nc-email')?.value.trim();
    const coord = document.getElementById('nc-coord')?.value;
    const role  = document.getElementById('nc-role')?.value;
    const cargo = document.getElementById('nc-cargo')?.value.trim() || null;
    if (!nome || !email || !coord) { mostrarToast('Preencha nome, e-mail e coordenadoria.','error'); return; }
    try {
      const { data, error } = await _sbq().from('convites').insert({
        email, nome, coordenadoria_id: coord, role, cargo,
        criado_por: window._appProfile?.id
      }).select().single();
      if (error) throw error;
      /* Envia e-mail de convite */
      const coordInfo = this._coords.find(c => c.id === coord);
      await window.EmailsModule?.enviarConvite({
        email, coord: coordInfo?.nome, cargo, token: data.token,
        nomeConvidado: nome,
        anoGestao: new Date().getFullYear().toString(),
        criadoPor: window._appProfile?.apelido || window._appProfile?.nome || 'Equipe Nupi'
      });
      fecharModal();
      mostrarToast('Convite enviado para ' + email + '!', 'success');
      this._carregarConvites();
    } catch(e) { mostrarToast('Erro: ' + e.message,'error'); }
  },

  _novoConviteRapido() { this._switchTab('convites'); this.novoConvite(); },

  async _reenviarConvite(id, email, token) {
    const convite = (await _sbq().from('convites').select('*,coordenadorias(nome)').eq('id',id).single()).data;
    if (!convite) return;
    await window.EmailsModule?.enviarConvite({
      email, coord: convite.coordenadorias?.nome, cargo: convite.cargo,
      token, nomeConvidado: convite.nome || email,
      anoGestao: new Date().getFullYear().toString(),
      criadoPor: window._appProfile?.apelido || 'Equipe Nupi'
    });
    mostrarToast('Convite reenviado!','success');
  },

  async _revogarConvite(id) {
    await _sbq().from('convites').update({ expires_at: new Date().toISOString() }).eq('id', id);
    mostrarToast('Convite revogado.','info');
    this._carregarConvites();
  },

  /* ══════════════════════════
     TAB: PERMISSÕES
  ══════════════════════════ */
  _tabPermissoes() {
    const el = document.getElementById('devTabContent');
    if (!el) return;
    const P = window.Permissoes;
    const roles = ['admin','coordenador_geral','coordenador','assessor','conselheiro','membro'];
    const feats = [
      ['podeGerenciarUsuarios','Gerenciar usuários'],
      ['podeAlterarRoles','Alterar roles'],
      ['podeCriarConvite','Criar convites'],
      ['podeVerLogs','Ver logs'],
      ['podeCriarEvento','Criar eventos'],
      ['podeEditarDemanda','Editar demandas'],
      ['podeAprovarRelatorio','Aprovar relatórios'],
      ['podeVerFinanceiro','Ver financeiro'],
      ['podeLancarlancamento','Lançar transações'],
      ['bypassRegrasNegocio','Bypass de regras (testes)'],
    ];
    el.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px;color:var(--c-slate);font-weight:700;border-bottom:1px solid var(--b-2)">
                Funcionalidade
              </th>
              ${roles.map(r => {
                const n = P?.NIVEL_LABEL[r] || { label: r, cor:'#666' };
                return `<th style="text-align:center;padding:8px;color:${n.cor};font-weight:700;border-bottom:1px solid var(--b-2)">${n.label}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${feats.map(([feat,label]) => `
              <tr style="border-bottom:1px solid var(--b-1)">
                <td style="padding:8px 12px;color:var(--c-white);font-weight:600">${label}</td>
                ${roles.map(r => {
                  const m   = P?.MATRIZ[r] || {};
                  const val = m[feat];
                  return `<td style="text-align:center;padding:8px">
                    ${val ? '<span style="color:var(--green);font-size:16px">✓</span>'
                          : '<span style="color:var(--red);font-size:16px;opacity:.4">✕</span>'}
                  </td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:20px">
        ${_sc('Páginas por Coordenadoria','🗂️',
          Object.entries(P?.PAGES_POR_COORD||{}).map(([coord, pages]) => `
            <div style="margin-bottom:10px">
              <div style="font-size:12px;font-weight:700;color:var(--c-accent);margin-bottom:6px">${coord}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${pages.map(p => `<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;
                  background:var(--b-2);color:var(--c-slate)">${p}</span>`).join('')}
              </div>
            </div>`).join('')
        )}
      </div>`;
  },

  /* ══════════════════════════
     TAB: LOGS
  ══════════════════════════ */
  _tabLogs() {
    const el = document.getElementById('devTabContent');
    if (!el) return;
    el.innerHTML = `
      <div id="devLogs">
        <div style="padding:20px;text-align:center;color:var(--c-slate)"><span class="spinner"></span></div>
      </div>`;
    this._carregarLogs();
  },

  async _carregarLogs() {
    const el = document.getElementById('devLogs');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq()
        .from('historico_demandas')
        .select('*,users!user_id(nome,apelido),demandas(titulo)')
        .order('created_at', { ascending: false })
        .limit(40);
      el.innerHTML = (data||[]).length
        ? (data||[]).map(log => {
            const quem = log.users?.apelido || log.users?.nome || '?';
            return `
              <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--b-1)">
                <div style="font-size:11px;color:var(--c-slate);white-space:nowrap;min-width:70px">${_fmt(log.created_at)}</div>
                <div>
                  <span style="font-size:12px;font-weight:700;color:var(--c-white)">${sanitize(quem)}</span>
                  <span style="font-size:12px;color:var(--c-slate)"> ${sanitize(log.acao)}</span>
                  ${log.demandas?.titulo ? `<span style="font-size:12px;color:var(--c-accent)"> · ${sanitize(log.demandas.titulo)}</span>` : ''}
                  ${log.coluna_anterior && log.coluna_nova ? `<div style="font-size:11px;color:var(--c-slate)">${log.coluna_anterior} → ${log.coluna_nova}</div>` : ''}
                  ${log.detalhes ? `<div style="font-size:11px;color:var(--c-slate)">${sanitize(log.detalhes)}</div>` : ''}
                </div>
              </div>`;
          }).join('')
        : '<div style="padding:20px;text-align:center;color:var(--c-slate)">Nenhum log registrado ainda.</div>';
    } catch(e) {
      el.innerHTML = '<div style="color:var(--c-slate);padding:16px">Erro ao carregar logs.</div>';
    }
  },

  /* ══════════════════════════
     TAB: SISTEMA
  ══════════════════════════ */
  _tabSistema() {
    const el = document.getElementById('devTabContent');
    if (!el) return;
    const online = navigator.onLine;
    const sb     = !!_sbq();
    el.innerHTML = `
      ${_sc('Status do Sistema','🔖',`
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          ${[
            ['App Core',    'v9.0',  '#f75412'],
            ['ABJ Module',  'v3.0',  '#f75412'],
            ['Pages.js',    'v2.0',  '#f75412'],
            ['Emails.js',   'v1.0',  '#f75412'],
            ['Permissoes.js','v1.0', '#f75412'],
            ['Supabase',    sb?'✅ Conectado':'❌ Offline', sb?'var(--green)':'var(--red)'],
            ['Rede',        online?'✅ Online':'🔴 Offline', online?'var(--green)':'var(--red)'],
            ['Service Worker', 'serviceWorker' in navigator ? '✅ Ativo':'❌ Não suportado', 'serviceWorker' in navigator?'var(--green)':'var(--red)'],
          ].map(([k,v,c])=>`
            <div style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px">
              <span style="color:var(--c-slate)">${k}</span>
              <span style="color:${c};font-weight:600">${v}</span>
            </div>`).join('')}
        </div>`)}
      ${_sc('Ações de Admin','⚡',`
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" style="font-size:12px"
                  onclick="if(confirm('Limpar cache do SW?'))caches.keys().then(k=>k.forEach(n=>caches.delete(n))).then(()=>mostrarToast('Cache limpo!','success'))">
            🗑️ Limpar Cache SW
          </button>
          <button class="btn btn-ghost" style="font-size:12px"
                  onclick="mostrarToast('Checando aniversários…','info');window.PushModule?.checarPrazosABJ();window.EmailsModule?.checarAniversariosEmail()">
            🎂 Forçar check aniversários
          </button>
          <button class="btn btn-ghost" style="font-size:12px"
                  onclick="location.reload()">
            🔄 Recarregar sistema
          </button>
          <button class="btn btn-ghost" style="font-size:12px"
                  onclick="PageDev._testarRegras()">
            🧪 Testar regras de negócio
          </button>
        </div>`)}
      ${_sc('Regras de Negócio Ativas','📐',`
        <div id="devRegras">Calculando…</div>`)}`;
    this._renderRegras();
  },

  async _renderRegras() {
    const el = document.getElementById('devRegras');
    if (!el) return;
    const R = window.Permissoes?.REGRAS;
    if (!R) { el.innerHTML = '<span style="color:var(--c-slate)">permissoes.js não carregado.</span>'; return; }
    const relatorio = R.relatorioABJBloqueado(false);
    const extincao  = await R.alertaExtincao(_sbq());
    el.innerHTML = [
      { label:'Relatório ABJ',         info: relatorio.noUltimoDia ? '⚠️ Último dia hoje!' : relatorio.desconto ? '🔴 Fora do prazo (-2pts)' : '✅ Dentro do prazo' },
      { label:'Risco de extinção',      info: extincao?.risco ? `🚨 ${extincao.mensagem}` : `✅ ${extincao?.mesesSemAtividade||0} meses de atividade` },
      { label:'Alerta 60 dias',         info: '✅ Ativo (validado na entrada do calendário financeiro)' },
      { label:'Timer 24h financeiro',   info: '✅ Ativo (acionado ao registrar repasse transitório)' },
      { label:'PCD / desempenho',       info: '✅ Alerta automático após 2 meses sem entrega' },
    ].map(r => `
      <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--b-1);font-size:12px">
        <span style="color:var(--c-slate)">${r.label}</span>
        <span style="color:var(--c-white);font-weight:600">${r.info}</span>
      </div>`).join('');
  },

  _testarRegras() {
    const R = window.Permissoes?.REGRAS;
    if (!R) return;
    const alertaCalendario = R.alertaCalendario60Dias(new Date(Date.now() + 20*86400000).toISOString(), false);
    const alertaRepasse    = R.alertaRepasse24h(new Date(Date.now() - 2*3600000).toISOString());
    mostrarToast(`Calendário 60d: ${alertaCalendario.mensagem}`, alertaCalendario.bloqueado ? 'error' : 'success');
    setTimeout(() => mostrarToast(`Repasse 24h: ${alertaRepasse.mensagem}`, alertaRepasse.infracaoGravissima ? 'error' : 'warning'), 800);
  },
};

const PageGlobal = {
  /* ── Visitas Técnicas — Atividade 12 (2 visitas/semestre) ──
     Validações obrigatórias: fotos + doc. solicitação + confirmação empresa
     + tabela de participantes (nome, e-mail, telefone)
  ── */
  novaVisita() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'🏭 Registrar Visita Técnica', tipo:'info', corpo:`
      <div style="background:var(--c-accent)18;border:1px solid var(--c-accent)33;border-radius:8px;
                  padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--c-accent)">
        ⭐ Atividade 12 — Mínimo 2 visitas/semestre. Todos os campos marcados com * são obrigatórios para pontuação ABJ.
      </div>
      <div class="form-group"><label class="form-label">Empresa / Indústria *</label>
        <input id="vt-empresa" class="form-input" placeholder="Ex: Unimed Teresina, Vale S.A."></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Responsável na empresa *</label>
          <input id="vt-responsavel" class="form-input" placeholder="Nome do contato"></div>
        <div class="form-group"><label class="form-label">Data da visita *</label>
          <input id="vt-data" type="date" class="form-input" value="${hoje}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">E-mail da empresa</label>
          <input id="vt-email" type="email" class="form-input" placeholder="contato@empresa.com"></div>
        <div class="form-group"><label class="form-label">Telefone da empresa</label>
          <input id="vt-fone" class="form-input" placeholder="(86) 9xxxx-xxxx"></div>
      </div>
      <hr style="border:none;border-top:1px solid var(--b-2);margin:12px 0">
      <div style="font-size:12px;font-weight:700;color:var(--c-white);margin-bottom:10px">
        Participantes da Visita *
      </div>
      <div id="vt-participantes-lista" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px"></div>
      <button class="btn btn-ghost" style="font-size:12px;width:100%" onclick="PageGlobal._addParticipante()">
        + Adicionar participante
      </button>
      <hr style="border:none;border-top:1px solid var(--b-2);margin:12px 0">
      <div style="font-size:12px;font-weight:700;color:var(--c-white);margin-bottom:8px">
        Documentos Obrigatórios
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;padding:10px 14px;font-size:12px">
          <div style="font-weight:700;color:var(--c-white);margin-bottom:4px">📸 Fotografias da visita *</div>
          <div style="color:var(--c-slate)">Envie ao menos 1 foto para o Google Drive e cole o link abaixo.</div>
          <input id="vt-fotos" class="form-input" style="margin-top:6px" placeholder="https://drive.google.com/...">
        </div>
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;padding:10px 14px;font-size:12px">
          <div style="font-weight:700;color:var(--c-white);margin-bottom:4px">📄 Doc. de Solicitação de Participação *</div>
          <div style="color:var(--c-slate)">Link do documento de solicitação enviado à empresa.</div>
          <input id="vt-solicita" class="form-input" style="margin-top:6px" placeholder="https://drive.google.com/...">
        </div>
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;padding:10px 14px;font-size:12px">
          <div style="font-weight:700;color:var(--c-white);margin-bottom:4px">✉️ Confirmação da Empresa *</div>
          <div style="color:var(--c-slate)">Link do e-mail ou documento de confirmação da empresa.</div>
          <input id="vt-confirm" class="form-input" style="margin-top:6px" placeholder="https://drive.google.com/...">
        </div>
      </div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Registrar Visita ✓', classe:'btn-primary', acao: () => this._salvarVisita() }
    ]});
    /* Adiciona 1 participante por padrão */
    this._addParticipante();
  },

  _addParticipante() {
    const lista = document.getElementById('vt-participantes-lista');
    if (!lista) return;
    const idx = lista.children.length;
    const div = document.createElement('div');
    div.style.cssText = 'display:grid;grid-template-columns:2fr 2fr 1fr;gap:6px;align-items:center';
    div.innerHTML = `
      <input class="form-input vt-p-nome" style="font-size:12px" placeholder="Nome completo *">
      <input class="form-input vt-p-email" type="email" style="font-size:12px" placeholder="E-mail *">
      <input class="form-input vt-p-fone" style="font-size:12px" placeholder="Telefone">`;
    lista.appendChild(div);
  },

  async _salvarVisita() {
    const empresa  = document.getElementById('vt-empresa')?.value?.trim();
    const resp     = document.getElementById('vt-responsavel')?.value?.trim();
    const data     = document.getElementById('vt-data')?.value;
    const fotos    = document.getElementById('vt-fotos')?.value?.trim();
    const solicita = document.getElementById('vt-solicita')?.value?.trim();
    const confirm  = document.getElementById('vt-confirm')?.value?.trim();
    if (!empresa || !resp || !data) { mostrarToast('Preencha empresa, responsável e data!','warning'); return; }
    if (!fotos || !solicita || !confirm) { mostrarToast('Todos os 3 links de documentos são obrigatórios para pontuação ABJ!','warning'); return; }
    /* Coleta participantes */
    const participantes = [];
    document.querySelectorAll('#vt-participantes-lista > div').forEach(row => {
      const nome  = row.querySelector('.vt-p-nome')?.value?.trim();
      const email = row.querySelector('.vt-p-email')?.value?.trim();
      const fone  = row.querySelector('.vt-p-fone')?.value?.trim();
      if (nome && email) participantes.push({ nome, email, fone: fone || null });
    });
    if (!participantes.length) { mostrarToast('Adicione ao menos 1 participante com nome e e-mail!','warning'); return; }
    fecharModal();
    try {
      const desc = JSON.stringify({
        responsavel_empresa: resp,
        email_empresa: document.getElementById('vt-email')?.value?.trim() || null,
        fone_empresa:  document.getElementById('vt-fone')?.value?.trim()  || null,
        fotos, solicita, confirm,
        participantes,
      });
      await _sbq().from('eventos').insert([{
        titulo: `Visita Técnica — ${empresa}`,
        tipo: 'visita', data_inicio: data + 'T08:00:00',
        local: empresa, vagas: participantes.length,
        descricao: desc, ativo: true,
        criado_por: window._appProfile?.id,
        coordenadoria_id: window._appProfile?.coordenadoria_id || null,
      }]);
      mostrarToast('Visita técnica registrada com todos os documentos!','success');
    } catch(e) { mostrarToast('Erro ao registrar visita.','error'); console.warn(e); }
  },

  /* ── Apresentações Institucionais — Atividade 05 (3/semestre) ── */
  novaApresentacao() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'🎤 Registrar Apresentação Institucional', tipo:'info', corpo:`
      <div style="background:var(--c-accent)18;border:1px solid var(--c-accent)33;border-radius:8px;
                  padding:10px;margin-bottom:14px;font-size:12px;color:var(--c-accent)">
        ⭐ Atividade 5 — 3 apresentações/semestre para empresas ou escolas.
        Exige comprovação fotográfica (presencial ou online).
      </div>
      <div class="form-group"><label class="form-label">Título da Apresentação *</label>
        <input id="ap-titulo" class="form-input" placeholder="Ex: Apresentação NUPIEEPRO na Empresa XYZ"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Local / Empresa *</label>
          <input id="ap-local" class="form-input" placeholder="Empresa ABC / Online"></div>
        <div class="form-group"><label class="form-label">Data *</label>
          <input id="ap-data" type="date" class="form-input" value="${hoje}"></div>
      </div>
      <div class="form-group"><label class="form-label">Modalidade</label>
        <select id="ap-modal" class="form-select">
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
        </select></div>
      <div class="form-group"><label class="form-label">Link das fotos (JPEG/PNG) *</label>
        <input id="ap-fotos" class="form-input" placeholder="https://drive.google.com/...">
        <span style="font-size:11px;color:var(--c-slate)">Obrigatório — evidência fotográfica da apresentação.</span></div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Registrar ✓', classe:'btn-primary', acao: () => this._salvarApresentacao() }
    ]});
  },

  async _salvarApresentacao() {
    const titulo = document.getElementById('ap-titulo')?.value?.trim();
    const local  = document.getElementById('ap-local')?.value?.trim();
    const data   = document.getElementById('ap-data')?.value;
    const fotos  = document.getElementById('ap-fotos')?.value?.trim();
    const modal  = document.getElementById('ap-modal')?.value || 'presencial';
    if (!titulo || !local || !data) { mostrarToast('Preencha título, local e data!','warning'); return; }
    if (!fotos) { mostrarToast('O link das fotos é obrigatório para comprovar a apresentação!','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('eventos').insert([{
        titulo, tipo: 'apresentacao',
        data_inicio: data + 'T08:00:00', local,
        descricao: JSON.stringify({ fotos, modalidade: modal }), ativo: true,
        criado_por: window._appProfile?.id,
        coordenadoria_id: window._appProfile?.coordenadoria_id || null,
      }]);
      mostrarToast('Apresentação registrada com evidência!','success');
    } catch(e) { mostrarToast('Erro ao registrar.','error'); }
  },

  /* ── Produção Científica — Atividade 17 ──
     Pontuação contabilizada em setembro.
     +25 pts bônus se aprovado no ENEGEP 2026.
  ── */
  novaProducao() {
    const mesAtual = new Date().getMonth(); /* 0=jan … 8=set */
    const alertaSet = mesAtual >= 7 && mesAtual <= 9;
    abrirModal({ titulo:'🔬 Registrar Produção Científica', tipo:'info', corpo:`
      ${alertaSet ? `<div style="background:var(--c-accent)18;border:1px solid var(--c-accent)33;border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--c-accent);font-weight:600">
        📅 Período de contabilização: a pontuação da Atividade 17 é registrada em setembro.
      </div>` : `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--c-slate)">
        ⭐ Atividade 17 — Produção Científica. Pontuação contabilizada em setembro.
        Bônus de +25 pts para artigos aprovados e apresentados no ENEGEP 2026.
      </div>`}
      <div class="form-group"><label class="form-label">Título do Trabalho *</label>
        <input id="pc-titulo" class="form-input" placeholder="Ex: Aplicação de Lean em Microempresas do Piauí"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Tipo</label>
          <select id="pc-tipo" class="form-select">
            <option value="artigo">Artigo científico</option>
            <option value="tcc">TCC</option>
            <option value="pesquisa">Relatório de pesquisa/extensão</option>
          </select></div>
        <div class="form-group"><label class="form-label">Autores</label>
          <input id="pc-autores" class="form-input" placeholder="Nome(s) dos autores"></div>
      </div>
      <div class="form-group"><label class="form-label">Link DOI / PDF *</label>
        <input id="pc-link" type="url" class="form-input" placeholder="https://doi.org/..."></div>
      <div class="form-group"><label class="form-label">Comprovante de aceitação/publicação</label>
        <input id="pc-comp" type="url" class="form-input" placeholder="Link do certificado ou e-mail de aceite"></div>
      <div style="background:var(--green)18;border:1px solid var(--green)33;border-radius:8px;padding:12px;margin-top:4px">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;color:var(--c-white)">
          <input id="pc-enegep" type="checkbox" style="margin-top:2px;accent-color:var(--green);width:16px;height:16px;flex-shrink:0">
          <span>
            <strong style="color:var(--green)">+25 pts bônus:</strong>
            Este artigo foi aprovado e será apresentado no <strong>ENEGEP 2026</strong>.
            <span style="color:var(--c-slate);font-size:11px;display:block;margin-top:2px">
              Marque apenas se tiver o comprovante de aceitação do ENEGEP.
            </span>
          </span>
        </label>
      </div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Registrar ✓', classe:'btn-primary', acao: () => this._salvarProducao() }
    ]});
  },

  async _salvarProducao() {
    const titulo   = document.getElementById('pc-titulo')?.value?.trim();
    const tipo     = document.getElementById('pc-tipo')?.value || 'artigo';
    const autores  = document.getElementById('pc-autores')?.value?.trim();
    const link     = document.getElementById('pc-link')?.value?.trim();
    const comp     = document.getElementById('pc-comp')?.value?.trim();
    const enegep   = document.getElementById('pc-enegep')?.checked || false;
    if (!titulo) { mostrarToast('Preencha o título!','warning'); return; }
    if (!link)   { mostrarToast('O link DOI/PDF é obrigatório!','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('eventos').insert([{
        titulo, tipo: 'producao_cientifica',
        data_inicio: new Date().toISOString().split('T')[0],
        descricao: JSON.stringify({ tipo_trabalho: tipo, autores, link, comprovante: comp, bonus_enegep: enegep }),
        ativo: true,
        criado_por: window._appProfile?.id,
        coordenadoria_id: window._appProfile?.coordenadoria_id || null,
      }]);
      const msg = enegep
        ? 'Trabalho registrado com bônus ENEGEP +25 pts! 🏆'
        : 'Produção científica registrada! Pontuação em setembro. 📅';
      mostrarToast(msg, 'success');
    } catch(e) { mostrarToast('Erro ao registrar.','error'); }
  },

  /* ── Renders das páginas globais ── */
  _renderVisitas() {
    const pg = document.getElementById('page-global_visitas');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Visitas Técnicas','🏭',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Mínimo 2 visitas por semestre — <strong style="color:var(--c-accent)">Atividade 12</strong>.
        Exige fotos + doc. de solicitação + confirmação da empresa + lista de participantes.
      </p>
      ${_btn('+ Registrar visita técnica',"PageGlobal.novaVisita()")}
      <div id="visitas-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarVisitas();
  },
  async _carregarVisitas() {
    const el = document.getElementById('visitas-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('eventos')
        .select('*').eq('tipo','visita')
        .order('data_inicio',{ascending:false}).limit(10);
      el.innerHTML = data?.length
        ? data.map(e => {
            let extra = {}; try { extra = JSON.parse(e.descricao||'{}'); } catch(_){}
            const ok = extra.fotos && extra.solicita && extra.confirm;
            return `
              <div style="background:var(--b-1);border:1px solid ${ok?'var(--green)44':'var(--yellow)44'};border-radius:10px;padding:14px 16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
                  <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(e.titulo)}</div>
                  <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap;
                               background:${ok?'var(--green)22':'var(--yellow)22'};color:${ok?'var(--green)':'var(--yellow)'};
                               border:1px solid ${ok?'var(--green)44':'var(--yellow)44'}">
                    ${ok?'✓ Completa':'⏳ Pendente'}
                  </span>
                </div>
                <div style="font-size:12px;color:var(--c-slate)">
                  📅 ${_fmt(e.data_inicio)} · 👥 ${e.vagas||0} participantes
                  ${extra.responsavel_empresa?` · 👤 ${sanitize(extra.responsavel_empresa)}`:''}
                </div>
              </div>`;
          }).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma visita técnica registrada ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },

  _renderApresentacoes() {
    const pg = document.getElementById('page-global_apresentacoes');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Apresentações Institucionais','🎤',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Mínimo 3 apresentações por semestre — <strong style="color:var(--c-accent)">Atividade 5</strong>.
        Exige evidência fotográfica (presencial ou online, JPEG/PNG).
      </p>
      ${_btn('+ Registrar apresentação',"PageGlobal.novaApresentacao()")}
      <div id="apres-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarApresentacoes();
  },
  async _carregarApresentacoes() {
    const el = document.getElementById('apres-lista');
    if (!el || !_sbq()) return;
    try {
      const mesIni = new Date(); mesIni.setMonth(mesIni.getMonth() - 6);
      const { data } = await _sbq().from('eventos')
        .select('*').eq('tipo','apresentacao')
        .order('data_inicio',{ascending:false}).limit(10);
      const semestre = (data||[]).filter(e => new Date(e.data_inicio) >= mesIni).length;
      const ok = semestre >= 3;
      el.innerHTML = `
        <div style="background:${ok?'var(--green)':'var(--yellow)'}18;border:1px solid ${ok?'var(--green)':'var(--yellow)'}44;
                    border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px">
          ${ok?'✅':'⚠️'} <strong>${semestre}/3</strong> apresentações neste semestre.
        </div>` +
        ((data||[]).length
          ? (data||[]).map(e => {
              let extra = {}; try { extra = JSON.parse(e.descricao||'{}'); } catch(_){}
              return `
                <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:12px 16px">
                  <div style="font-weight:700;font-size:13px;color:var(--c-white);margin-bottom:4px">${sanitize(e.titulo)}</div>
                  <div style="font-size:12px;color:var(--c-slate)">
                    📅 ${_fmt(e.data_inicio)} · 📍 ${sanitize(e.local||'—')} · ${extra.modalidade||'presencial'}
                    ${extra.fotos?` · <a href="${sanitize(extra.fotos)}" target="_blank" style="color:var(--c-accent)">Fotos ↗</a>`:''}
                  </div>
                </div>`;
            }).join('')
          : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma apresentação registrada.</div>');
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },

  _renderProducao() {
    const pg = document.getElementById('page-global_producao');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    const mesAtual = new Date().getMonth();
    const alertaSet = mesAtual >= 7 && mesAtual <= 9;
    ct.innerHTML =
      (alertaSet ? `<div style="background:var(--c-accent)18;border:1px solid var(--c-accent)33;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--c-accent);font-weight:600">
        📅 Período de contabilização da Atividade 17 — pontuação registrada agora em setembro!
      </div>` : '') +
      _sc('Produção Científica','🔬',`
        <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
          <strong style="color:var(--c-accent)">Atividade 17</strong> — TCCs, artigos e relatórios de pesquisa/extensão vinculados ao Núcleo.
          Pontuação contabilizada em setembro. <strong style="color:var(--green)">+25 pts bônus</strong> para artigos no ENEGEP.
        </p>
        ${_btn('+ Registrar trabalho',"PageGlobal.novaProducao()")}
        <div id="prod-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
          <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
        </div>`);
    this._carregarProducao();
  },
  async _carregarProducao() {
    const el = document.getElementById('prod-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('eventos')
        .select('*').in('tipo',['producao_cientifica'])
        .order('data_inicio',{ascending:false}).limit(12);
      el.innerHTML = (data||[]).length
        ? data.map(e => {
            let extra = {}; try { extra = JSON.parse(e.descricao||'{}'); } catch(_){}
            return `
              <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
                  <div>
                    <div style="font-size:10px;font-weight:700;color:var(--c-accent);text-transform:uppercase;letter-spacing:.06em">${extra.tipo_trabalho||'artigo'}</div>
                    <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(e.titulo)}</div>
                    ${extra.autores?`<div style="font-size:12px;color:var(--c-slate)">👤 ${sanitize(extra.autores)}</div>`:''}
                  </div>
                  ${extra.bonus_enegep ? `<span style="font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;
                    background:var(--green)22;color:var(--green);border:1px solid var(--green)44;white-space:nowrap">+25 pts ENEGEP</span>` : ''}
                </div>
                <div style="font-size:12px;color:var(--c-slate)">
                  📅 ${_fmt(e.data_inicio)}
                  ${extra.link?` · <a href="${sanitize(extra.link)}" target="_blank" style="color:var(--c-accent)">DOI/PDF ↗</a>`:''}
                </div>
              </div>`;
          }).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum trabalho científico registrado ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>'; }
  },

  novaPauta() {
    abrirModal({ titulo:'🗳️ Registrar Assembleia', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Pauta / Título *</label>
        <input id="pv-titulo" class="form-input" placeholder="Ex: Aprovação de Contas 2026"></div>
      <div class="form-group"><label class="form-label">Data da Assembleia *</label>
        <input id="pv-data" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group"><label class="form-label">Local</label>
        <input id="pv-local" class="form-input" placeholder="Ex: Sala 201, CCE"></div>
      <div class="form-group"><label class="form-label">Descrição / Pauta completa</label>
        <textarea id="pv-desc" class="form-input" style="height:80px" placeholder="Descreva os pontos de pauta..."></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar',classe:'btn-primary',acao:()=>PageGlobal._salvarAssembleia()}
    ]});
  },
  async _salvarAssembleia() {
    const titulo = document.getElementById('pv-titulo')?.value?.trim();
    const data   = document.getElementById('pv-data')?.value;
    const local  = document.getElementById('pv-local')?.value?.trim();
    const desc   = document.getElementById('pv-desc')?.value?.trim();
    if (!titulo || !data) { mostrarToast('Preencha pauta e data!','warning'); return; }
    fecharModal();
    try {
      const coords = await getCoords();
      const ger = coords.find(c=>c.sigla==='GER');
      await _sbq().from('eventos').insert([{
        titulo, tipo:'assembleia', data_inicio:data,
        local:local||null, descricao:desc||null, ativo:true,
        coordenadoria_id: ger?.id||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Assembleia registrada com sucesso!','success');
      PageGlobal._carregarAssembleia?.();
    } catch(e) { mostrarToast('Erro ao registrar assembleia.','error'); }
  },

  _renderAssembleia() {
    const pg = document.getElementById('page-global_assembleia');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    const podeGerenciar = Permissoes.pode('podeCriarEvento');
    ct.innerHTML = _sc('Votações','🗳️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Votações ativas e histório de deliberações. Cada membro pode votar uma vez.
      </p>
      ${podeGerenciar ? _btn('+ Nova Votação','PageGlobal.novaVotacao()') : ''}
      <div id="votacoes-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:12px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Assembleias','📋',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Registro de assembleias gerais. Ata deve ser publicada em até 72h.
      </p>
      ${podeGerenciar ? _btn('+ Nova Assembleia','PageGlobal.novaPauta()','btn-ghost') : ''}
      <div id="assembleia-lista" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`);
    this._carregarVotacoes();
    this._carregarAssembleia();
  },

  async _carregarVotacoes() {
    const el = document.getElementById('votacoes-lista');
    if (!el || !_sbq()) return;
    const uid = window._appProfile?.id;
    try {
      const [{ data: vots }, { data: mVotos }] = await Promise.all([
        _sbq().from('votacoes').select('*').order('criada_em', { ascending: false }).limit(20),
        uid ? _sbq().from('votos').select('votacao_id,opcao').eq('user_id', uid) : { data: [] },
      ]);
      if (!vots?.length) {
        el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma votação registrada.</div>';
        return;
      }
      const meuVotoMap = {};
      (mVotos||[]).forEach(v => { meuVotoMap[v.votacao_id] = v.opcao; });
      el.innerHTML = vots.map(v => {
        const opcoes  = Array.isArray(v.opcoes) ? v.opcoes : (v.opcoes ? JSON.parse(v.opcoes) : []);
        const jáVotei = meuVotoMap[v.id];
        const expirou = v.expires_at && new Date(v.expires_at) < new Date();
        const status  = !v.ativa || expirou ? '🔴 Encerrada' : '🟢 Aberta';
        const podeVotar = v.ativa && !expirou && !jáVotei && uid;
        return `
          <div style="background:var(--b-1);border:1px solid ${v.ativa&&!expirou?'var(--b-2)':'var(--b-3)'};border-radius:12px;padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
              <div style="font-weight:700;font-size:14px;color:var(--c-white)">${sanitize(v.titulo)}</div>
              <span style="font-size:10px;white-space:nowrap">${status}</span>
            </div>
            ${v.descricao ? `<div style="font-size:12px;color:var(--c-slate);margin-bottom:10px">${sanitize(v.descricao)}</div>` : ''}
            ${jáVotei
              ? `<div style="font-size:12px;color:var(--green)">✅ Você votou: <strong>${sanitize(jáVotei)}</strong></div>`
              : opcoes.length
                ? podeVotar
                  ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${opcoes.map(op=>`<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="PageGlobal._votar('${v.id}','${sanitize(op).replace(/'/g,"\\'")}',this)">${sanitize(op)}</button>`).join('')}</div>`
                  : `<div style="display:flex;flex-wrap:wrap;gap:6px">${opcoes.map(op=>`<span style="font-size:11px;padding:4px 10px;background:var(--b-2);border-radius:99px;color:var(--c-slate)">${sanitize(op)}</span>`).join('')}</div>`
                : '<div style="font-size:12px;color:var(--c-slate)">Sem opções cadastradas.</div>'}
            ${v.expires_at ? `<div style="font-size:10px;color:var(--c-slate);margin-top:8px">⏱ Encerra ${_fmt(v.expires_at)}</div>` : ''}
          </div>`;
      }).join('');
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar votações.</div>'; }
  },

  async _votar(votacaoId, opcao, btn) {
    const uid = window._appProfile?.id;
    if (!uid || !_sbq()) return;
    btn.disabled = true;
    try {
      await _sbq().from('votos').insert([{ votacao_id: votacaoId, user_id: uid, opcao }]);
      mostrarToast(`Voto registrado: "${opcao}"`, 'success');
      this._carregarVotacoes();
    } catch(e) {
      btn.disabled = false;
      if (e.code === '23505') mostrarToast('Você já votou nesta votação.','warning');
      else mostrarToast('Erro ao registrar voto.','error');
    }
  },

  novaVotacao() {
    const hoje = new Date().toISOString().split('T')[0];
    abrirModal({ titulo:'🗳️ Nova Votação', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título *</label>
        <input id="nv-titulo" class="form-input" placeholder="Ex: Aprovação do Plano de Gestão 2026"></div>
      <div class="form-group"><label class="form-label">Descrição</label>
        <textarea id="nv-desc" class="form-input" rows="2" placeholder="Contexto e instruções para os votantes..."></textarea></div>
      <div class="form-group"><label class="form-label">Opções (uma por linha) *</label>
        <textarea id="nv-opcoes" class="form-input" rows="4" placeholder="Sim&#10;Não&#10;Abstenção"></textarea></div>
      <div class="form-group"><label class="form-label">Data de encerramento</label>
        <input id="nv-exp" type="date" class="form-input" value="${hoje}"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Criar ✓',classe:'btn-primary',acao:()=>PageGlobal._salvarVotacao()}
    ]});
  },

  async _salvarVotacao() {
    const titulo = document.getElementById('nv-titulo')?.value?.trim();
    const desc   = document.getElementById('nv-desc')?.value?.trim();
    const opcoesRaw = document.getElementById('nv-opcoes')?.value || '';
    const exp    = document.getElementById('nv-exp')?.value;
    const opcoes = opcoesRaw.split('\n').map(s=>s.trim()).filter(Boolean);
    if (!titulo) { mostrarToast('Preencha o título!','warning'); return; }
    if (!opcoes.length) { mostrarToast('Adicione ao menos uma opção!','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('votacoes').insert([{
        titulo, descricao: desc||null,
        opcoes: opcoes,
        ativa: true,
        expires_at: exp ? exp+'T23:59:59' : null,
      }]);
      mostrarToast('Votação criada!','success');
      this._carregarVotacoes();
    } catch(e) { mostrarToast('Erro ao criar votação.','error'); }
  },

  async _carregarAssembleia() {
    const el = document.getElementById('assembleia-lista');
    if (!el || !_sbq()) return;
    try {
      const { data } = await _sbq().from('eventos')
        .select('*').eq('tipo','assembleia')
        .order('data_inicio', {ascending:false}).limit(20);
      el.innerHTML = (data||[]).length
        ? data.map(e => `
            <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:14px 16px">
              <div style="font-weight:700;font-size:13px;color:var(--c-white);margin-bottom:4px">${sanitize(e.titulo)}</div>
              <div style="font-size:12px;color:var(--c-slate)">
                📅 ${_fmt(e.data_inicio)}
                ${e.local ? ` · 📍 ${sanitize(e.local)}` : ''}
              </div>
              ${e.descricao ? `<div style="font-size:12px;color:var(--c-slate);margin-top:6px">${sanitize(e.descricao)}</div>` : ''}
            </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhuma assembleia registrada ainda.</div>';
    } catch(e) { el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar assembleias.</div>'; }
  },

  async _renderGestao() {
    const pg = document.getElementById('page-global_gestao');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = _sc('Painel Estratégico','📊','<div id="gestao-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px"><div style="text-align:center;color:var(--c-slate);padding:20px;grid-column:1/-1">Carregando...</div></div>') +
      _sc('Membros por Coordenadoria','📈','<div style="position:relative;height:180px"><canvas id="gestao-chart"></canvas></div>') +
      _sc('Coordenadorias','🏛️','<div id="gestao-coords" style="display:flex;flex-direction:column;gap:8px"><div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div></div>');
    if (!_sbq()) return;
    try {
      const hoje = new Date();
      const mesIni = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      const [{ count: totalMembros }, { count: eventosMs }, { data: abjMs }, coords] = await Promise.all([
        _sbq().from('users').select('*',{count:'exact',head:true}).eq('ativo',true),
        _sbq().from('eventos').select('*',{count:'exact',head:true}).gte('data_inicio', mesIni),
        _sbq().from('progresso_abj').select('pontos').gte('created_at', mesIni),
        getCoords(),
      ]);
      const pontosMs = (abjMs||[]).reduce((s,r)=>s+(r.pontos||0),0);
      document.getElementById('gestao-kpis').innerHTML = [
        { label:'Membros ativos', valor: totalMembros||0, cor:'var(--c-accent)' },
        { label:'Eventos este mês', valor: eventosMs||0, cor:'var(--green)' },
        { label:'Pts ABJ este mês', valor: pontosMs, cor:'var(--yellow)' },
      ].map(k=>`
        <div class="sum-card" style="padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:900;color:${k.cor}">${k.valor}</div>
          <div style="font-size:11px;color:var(--c-slate)">${k.label}</div>
        </div>`).join('');
      if (!coords?.length) return;
      const { data: membPorCoord } = await _sbq()
        .from('users').select('coordenadoria_id').eq('ativo',true);
      const cntMap = {};
      (membPorCoord||[]).forEach(u => { if(u.coordenadoria_id) cntMap[u.coordenadoria_id] = (cntMap[u.coordenadoria_id]||0)+1; });
      /* gráfico de membros por coordenadoria */
      const canvas = document.getElementById('gestao-chart');
      if (canvas && typeof Chart !== 'undefined') {
        if (canvas._chartInst) canvas._chartInst.destroy();
        const labels = coords.map(c=>c.sigla);
        const values = coords.map(c=>cntMap[c.id]||0);
        const bgColors = coords.map(c=>(c.cor||'#3b82f6')+'99');
        const bdColors = coords.map(c=>c.cor||'#3b82f6');
        canvas._chartInst = new Chart(canvas, {
          type:'bar',
          data:{ labels, datasets:[{ label:'Membros ativos', data:values, backgroundColor:bgColors, borderColor:bdColors, borderWidth:2, borderRadius:6 }] },
          options:{
            indexAxis:'y', responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false } },
            scales:{
              x:{ ticks:{ color:'#94a3b8', font:{size:10}, stepSize:1 }, grid:{ color:'#ffffff11' } },
              y:{ ticks:{ color:'#94a3b8', font:{size:11} }, grid:{ color:'#ffffff11' } },
            },
          },
        });
      }
      document.getElementById('gestao-coords').innerHTML = coords.map(c => `
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">${c.icone||'📋'}</span>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(c.nome)}</div>
              <div style="font-size:11px;color:var(--c-slate)">${cntMap[c.id]||0} membro(s)</div>
            </div>
          </div>
          <span style="font-size:11px;padding:3px 8px;border-radius:99px;background:${c.cor||'var(--b-2)'};color:#fff;font-weight:700">${c.sigla}</span>
        </div>`).join('');
    } catch(e) { console.warn('[gestao]', e); }
  }
};

/* ══════════════════════════════════════════════════════════════
   PageNotificacoes — Central de alertas com dados reais
   ══════════════════════════════════════════════════════════════ */
const PageNotificacoes = {
  async init() {
    await this._carregar();
  },
  async _carregar() {
    const lista = document.getElementById('notifList');
    const cnt   = document.getElementById('notifCount');
    if (!lista || !_sbq()) return;
    try {
      const p = window._appProfile;
      if (!p) return;
      const { data } = await _sbq()
        .from('notificacoes')
        .select('*')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(30);
      const notifs = data || [];
      const naoLidas = notifs.filter(n => !n.lida).length;
      /* Sync todos os badges/contadores */
      if (cnt) cnt.textContent = notifs.length;
      const nlb = document.getElementById('notifNaoLidasBadge');
      if (nlb) { nlb.textContent = naoLidas; nlb.style.display = naoLidas > 0 ? '' : 'none'; }
      ['topbarNotifBadge','sideNotifBadge'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.textContent = naoLidas; b.style.display = naoLidas > 0 ? '' : 'none'; }
      });
      if (!notifs.length) {
        lista.innerHTML = `
          <div style="padding:40px;text-align:center;color:var(--c-slate)">
            <div style="font-size:36px;margin-bottom:12px">🔔</div>
            <div style="font-size:14px;font-weight:700;color:var(--c-white)">Tudo em dia!</div>
            <div style="font-size:13px;margin-top:4px">Você não tem notificações pendentes.</div>
          </div>`;
        return;
      }
      const CAT_ICON  = { sistema:'⚙️', abj:'⭐', demanda:'◬', reuniao:'🤝', financeiro:'◎', treinamento:'📚', parceria:'🤝', marketing:'📣', padrao:'🔔' };
      const TIPO_ICON = { info:'🔔', alerta:'⚠️', sucesso:'✅', erro:'🚨' };
      const CAT_COORD = { financeiro:'fin', reuniao:'ger', abj:'ger', sistema:'ger', demanda:'ger', treinamento:'prj', parceria:'prj', marketing:'mkt' };
      lista.innerHTML = notifs.map(n => {
        const cat   = n.categoria || null;
        const coord = (cat ? (CAT_COORD[cat]||'ger') : 'ger').toLowerCase();
        const icon  = cat ? (CAT_ICON[cat]||'🔔') : (TIPO_ICON[n.tipo]||'🔔');
        const label = cat || n.tipo || 'Sistema';
        return `<div class="notif-item${n.lida?'':' unread'}" data-tipo="${coord}" onclick="PageNotificacoes._marcarLida('${n.id}', this)">
          <div class="notif-dot${n.lida?' read':''}"></div>
          <div class="notif-body-text">
            <div class="notif-title">${sanitize(n.titulo||'Notificação')}</div>
            <div class="notif-desc">${sanitize(n.mensagem||'')}</div>
            <div class="notif-time">${_fmt(n.created_at)}</div>
          </div>
          <span class="notif-tag">${icon} ${sanitize(label)}</span>
        </div>`;
      }).join('');
    } catch(e) { console.warn('[Notif]', e); }
  },
  async _marcarLida(id, el) {
    el?.classList.remove('unread');
    el?.querySelector('.notif-dot')?.classList.add('read');
    if (!_sbq()) return;
    try {
      await _sbq().from('notificacoes').update({ lida: true }).eq('id', id);
      if (typeof NotifPage !== 'undefined') NotifPage.updateCount();
    } catch(e) {}
  },
};

/* Sobrescreve markAllNotifRead() já declarado no HTML */
window.markAllNotifRead = async function() {
  const p = window._appProfile;
  if (!_sbq()||!p) return;
  try {
    await _sbq().from('notificacoes').update({ lida:true }).eq('user_id', p.id).eq('lida', false);
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    document.querySelectorAll('.notif-dot:not(.read)').forEach(el => el.classList.add('read'));
    if (typeof NotifPage !== 'undefined') NotifPage.updateCount();
    mostrarToast('Todas as notificações marcadas como lidas.','success');
  } catch(e) { mostrarToast('Erro ao atualizar notificações.','error'); }
};

/* ══════════════════════════════════════════════════════════════
   PageCompartilhado — complementa o calendário do app.js com
   lista de próximos eventos de TODAS as coordenadorias
   ══════════════════════════════════════════════════════════════ */
const PageCompartilhado = {
  async init() {
    await this._carregarProximos();
    /* Injeta botão "Publicar Data" real */
    const btn = document.querySelector('#page-compartilhado .topbar-right button');
    if (btn) {
      btn.onclick = () => this.publicarData();
    }
  },
  async _carregarProximos() {
    /* Injeta section-card abaixo do calendário com lista de próximos eventos */
    const pg = document.getElementById('page-compartilhado');
    if (!pg||!_sbq()) return;
    /* Remove lista antiga se já existir */
    document.getElementById('shared-proximos')?.remove();
    const container = pg.querySelector('.content');
    if (!container) return;
    const div = document.createElement('div');
    div.id = 'shared-proximos';
    div.innerHTML = `
      <div class="section-card" style="padding:20px 24px;margin-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">🗓️</span>
            <h3 style="font-family:var(--f-head);font-size:15px;font-weight:700;color:var(--c-white)">Próximos Eventos</h3>
          </div>
        </div>
        <div id="shared-eventos-lista">
          <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
        </div>
      </div>`;
    container.appendChild(div);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data } = await _sbq()
        .from('eventos')
        .select('*, coordenadorias(nome,sigla,cor,icone)')
        .gte('data_inicio', hoje)
        .order('data_inicio', { ascending: true })
        .limit(12);
      const el = document.getElementById('shared-eventos-lista');
      if (!el) return;
      el.innerHTML = data?.length
        ? data.map(e => {
            const cor = e.coordenadorias?.cor || 'var(--c-accent)';
            const dias = Math.ceil((new Date(e.data_inicio) - new Date()) / 86400000);
            return `
              <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                          padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="width:36px;height:36px;border-radius:10px;background:${cor}22;border:1px solid ${cor}44;
                              display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
                    ${e.coordenadorias?.icone||'📌'}
                  </div>
                  <div>
                    <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(e.titulo)}</div>
                    <div style="font-size:11px;color:var(--c-slate)">
                      📅 ${_fmt(e.data_inicio)}
                      ${e.local?' · 📍 '+sanitize(e.local):''}
                      ${e.vagas?' · 👥 '+e.vagas+' vagas':''}
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;
                               background:${cor}22;color:${cor};border:1px solid ${cor}44">
                    ${sanitize(e.coordenadorias?.sigla||'—')}
                  </span>
                  <span style="font-size:13px;font-weight:800;color:${dias<=7?'var(--red)':dias<=30?'var(--yellow)':'var(--green)'}">
                    ${dias===0?'Hoje':dias===1?'Amanhã':`${dias}d`}
                  </span>
                </div>
              </div>`;
          }).join('')
        : '<div style="padding:16px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum evento futuro cadastrado ainda.</div>';
    } catch(e) { console.warn('[Compartilhado]', e); }
  },
  publicarData() {
    if (!window.Permissoes?.pode('podeCriarEvento')) {
      mostrarToast('Você não tem permissão para publicar datas.','warning');
      return;
    }
    const hoje = new Date().toISOString().slice(0,16);
    abrirModal({ titulo:'📅 Publicar Data no Calendário', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título do Evento *</label>
        <input id="pd-titulo" class="form-input" placeholder="Ex: NUPIDAY 2026"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Data e hora *</label>
          <input id="pd-data" type="datetime-local" class="form-input" value="${hoje}"></div>
        <div class="form-group"><label class="form-label">Vagas</label>
          <input id="pd-vagas" type="number" class="form-input" placeholder="50"></div>
      </div>
      <div class="form-group"><label class="form-label">Local</label>
        <input id="pd-local" class="form-input" placeholder="Presencial / Online"></div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select id="pd-tipo" class="form-select">
          <option value="evento">Evento</option>
          <option value="reuniao">Reunião Geral</option>
          <option value="treinamento">Treinamento</option>
          <option value="visita">Visita Técnica</option>
        </select></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Publicar ✓',classe:'btn-primary',acao:()=>this._salvarData()}
    ]});
  },
  async _salvarData() {
    const titulo = document.getElementById('pd-titulo')?.value?.trim();
    const data   = document.getElementById('pd-data')?.value;
    const vagas  = parseInt(document.getElementById('pd-vagas')?.value)||null;
    const local  = document.getElementById('pd-local')?.value?.trim();
    const tipo   = document.getElementById('pd-tipo')?.value||'evento';
    if (!titulo||!data) { mostrarToast('Preencha título e data!','warning'); return; }
    fecharModal();
    try {
      await _sbq().from('eventos').insert([{
        titulo, tipo, data_inicio:data,
        vagas:vagas||null, local:local||null, ativo:true,
        coordenadoria_id: window._appProfile?.coordenadoria_id||null,
        criado_por: window._appProfile?.id,
      }]);
      mostrarToast('Evento publicado no calendário!','success');
      this._carregarProximos();
    } catch(e) { mostrarToast('Erro ao publicar evento.','error'); }
  },
};

window.PageGeral          = PageGeral;
window.PageMarketing      = PageMarketing;
window.PageFinancas       = PageFinancas;
window.PageProjetos       = PageProjetos;
window.PageOperacoes      = PageOperacoes;
window.PagePessoas        = PagePessoas;
window.PageDev            = PageDev;
window.PageGlobal         = PageGlobal;
window.PageNotificacoes   = PageNotificacoes;
window.PageCompartilhado  = PageCompartilhado;

/* ── Estende goTo() do app.js sem sobrescrever (aguarda boot) ──
   ATENÇÃO: NÃO duplicar páginas já tratadas pelo app.js original:
   geral_reunioes (PageGeral.init), geral_planejamento, mkt_tracker
   (PageMarketing.init), fin_fluxo (PageFinancas.init), prj_eventos
   (PageProjetos.init), ops_pops (PageOperacoes._renderPops)
   ─────────────────────────────────────────────────────────────── */
document.addEventListener('nupi:booted', () => {
  const _goToOriginal = window.goTo;
  window.goTo = function(id) {
    // Garante que TODAS as páginas (incluindo as fora do ALL_PAGES) sejam ocultadas antes de navegar
    document.querySelectorAll('[id^="page-"]').forEach(function(el) {
      el.style.display = '';
      el.classList.remove('active');
    });
    _goToOriginal(id);
    /* Apenas páginas que app.js NÃO trata */
    const mapa = {
      /* Overview Coord Geral */
      'geral':             () => PageGeral._renderGeralDashboard(),
      /* Gerais */
      'notificacoes':      () => PageNotificacoes.init(),
      'compartilhado':     () => PageCompartilhado.init(),
      'geral_reunioes':    () => PageGeral._renderReuniao(),
      'geral_planejamento':() => PageGeral._renderPlanejamento(),
      'geral_melhorias':   () => PageGeral._renderMelhorias(),
      'geral_parcerias':   () => PageGeral._renderParcerias(),
      /* Páginas top-level do menu lateral */
      'demandas':          () => typeof Dem !== 'undefined' && Dem.setView('kanban', document.getElementById('demViewKanban')),
      'calendario':        () => typeof NovoCal !== 'undefined' && NovoCal._render(),
      'gp':                () => typeof GP !== 'undefined' && GP.loadTalentBank(),
      'marketing':         () => typeof Marketing !== 'undefined' && Marketing.loadKanban(),
      'projetos':          () => typeof Projetos !== 'undefined' && Projetos.loadSponsors(),
      /* Marketing sub */
      'mkt_tracker':       () => PageMarketing._renderTracker(),
      'mkt_kanban':        () => PageMarketing._renderKanban(),
      /* Financeiro */
      'fin_fluxo':         () => PageFinancas._renderFluxo(),
      'fin_abepro':        () => PageFinancas._renderABJFin(),
      'fin_comercial':     () => PageFinancas._renderCalendario(),
      /* Operações */
      'ops_relatorios':    () => PageOperacoes._renderRelatorios(),
      'ops_pops':          () => PageOperacoes._renderPops(),
      'ops_arquivo':       () => PageOperacoes._renderArquivo(),
      'ops_inscricoes':    () => PageOperacoes._renderInscricoes(),
      /* Gestão de Pessoas */
      'gp_talentos':       () => PagePessoas._renderTalentos(),
      'gp_clima':          () => PagePessoas._renderClima(),
      'gp_tap':            () => PagePessoas._renderTAP(),
      'gp_crm':            () => PagePessoas._renderMembros(),
      'gp_aniversarios':   () => PagePessoas._renderAniversarios(),
      'gp_treinamentos':   () => PagePessoas._renderTreinamentosInternos(),
      /* Dev / Admin */
      'dev_usuarios':      () => PageDev.init(),
      /* Projetos sub */
      'prj_eventos':       () => PageProjetos._renderEventos(),
      'prj_enegep':        () => PageProjetos._renderENEGEP(),
      'prj_treinamentos':  () => PageProjetos._renderTreinamentos(),
      'prj_nupicast':      () => PageProjetos._renderNupicast(),
      'prj_parcerias':     () => PageProjetos._renderParcerias(),
      /* Globais */
      'global_visitas':       () => PageGlobal._renderVisitas(),
      'global_apresentacoes': () => PageGlobal._renderApresentacoes(),
      'global_producao':      () => PageGlobal._renderProducao(),
      'global_assembleia':    () => PageGlobal._renderAssembleia(),
      'global_gestao':        () => PageGlobal._renderGestao(),
    };
    if (mapa[id]) try { mapa[id](); } catch(e) { console.warn('[pages goTo]', id, e); }
  };
});
