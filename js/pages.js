'use strict';
const _sb = () => window._supabase;
const _sc = (titulo,icone,html) => `
  <div class="section-card" style="padding:20px 24px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:22px">${icone}</span>
      <h3 style="font-family:var(--f-head);font-size:15px;font-weight:700;color:var(--c-white)">${titulo}</h3>
    </div>${html}
  </div>`;
const _btn = (l,fn,cls='btn-primary')=>`<button class="btn ${cls}" onclick="${fn}" style="font-size:13px">${l}</button>`;
const _fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const PageGeral = {
  async init() { this._renderReuniao(); },
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
    if (!el||!_sb()) return;
    try {
      const { data } = await _sb()
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
    const ct = pg.querySelector('.content')||pg;
    ct.innerHTML = _sc('Planejamento Semestral','📅',`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--a-1);border:1px solid var(--b-a);border-radius:10px;padding:16px">
          <div style="font-size:11px;font-weight:700;color:var(--c-accent);text-transform:uppercase;margin-bottom:8px">1º Semestre</div>
          <div style="font-size:12px;color:var(--c-slate);margin-bottom:12px">Prazo: 31/03/2026 (⭐ 1ª Estrela)</div>
          ${_btn('Ver plano',"mostrarToast('Em breve!','info')",'btn-ghost')}
        </div>
        <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;padding:16px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;margin-bottom:8px">2º Semestre</div>
          <div style="font-size:12px;color:var(--c-slate);margin-bottom:12px">Prazo: 31/07/2026 (⭐ 3ª Estrela)</div>
          ${_btn('Ver plano',"mostrarToast('Em breve!','info')",'btn-ghost')}
        </div>
      </div>
      <div style="background:var(--b-1);border-radius:10px;padding:14px;font-size:12px;color:var(--c-slate)">
        ⚠️ O planejamento deve incluir ações conjuntas com o Representante Estadual da ABJ.
      </div>`);
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
      await _sb().from('eventos').insert([{
        titulo, data_inicio:data, tipo:'reuniao',
        vagas, descricao:link||null, ativo:true,
        coordenadoria_id:ger?.id||null,
        criado_por: window._appProfile?.id
      }]);
      mostrarToast('Reunião criada!','success');
      this._carregarReunioes();
    } catch(e){mostrarToast('Erro ao salvar.','error');}
  },
  verFrequencia() { mostrarToast('Frequência — em breve!','info'); },
  abrirCheckin()  { mostrarToast('Check-in digital — em breve!','info'); },
};
const PageMarketing = {
  async init() { this._renderTracker(); },
  _renderTracker() {
    const pg = document.getElementById('page-mkt_tracker');
    if (!pg) return;
    const ct = pg.querySelector('.content')||pg;
    ct.innerHTML = _sc('Social Media Tracker','📱',`
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
    _sc('Links das Redes','🔗',`
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <a href="https://www.instagram.com/nupieepro" target="_blank"
           style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px;color:var(--c-accent);text-decoration:none">
          <span>Instagram</span><span>@nupieepro ↗</span>
        </a>
        <a href="https://www.facebook.com/nupieepro" target="_blank"
           style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px;color:var(--c-accent);text-decoration:none">
          <span>Facebook</span><span>NUPIEEPRO ↗</span>
        </a>
      </div>`);
    this._carregarPosts();
  },
  async _carregarPosts() {
    const el  = document.getElementById('mkt-lista');
    const cnt = document.getElementById('mkt-mes');
    if (!el||!_sb()) return;
    try {
      const mesIni = new Date(); mesIni.setDate(1);
      const { data } = await _sb()
        .from('calendario')
        .select('*')
        .order('data_inicio',{ascending:false})
        .limit(10);
      const posts = data||[];
      const doMes = posts.filter(p=>new Date(p.data_inicio)>=mesIni).length;
      if(cnt) cnt.textContent=doMes;
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
      await _sb().from('calendario').insert([{
        titulo:desc, descricao:link||null,
        data_inicio: data+'T12:00:00',
        tipo:'evento', cor:'#f75412',
        coordenadoria_id: mkt?.id||null,
        criado_por: window._appProfile?.id
      }]);
      mostrarToast('Publicação registrada!','success');
      this._carregarPosts();
    } catch(e){mostrarToast('Erro ao salvar.','error');}
  },
};
const PageFinancas = {
  ROLES:['admin','coordenador'],
  _temAcesso() {
    const p=window._appProfile;
    const coord=p?.coordenadorias?.sigla;
    return p?.role==='admin'||coord==='FIN';
  },
  async init() { this._renderFluxo(); },
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
    if(!el||!_sb())return;
    try {
      const mesIni=new Date();mesIni.setDate(1);
      const mesStr=mesIni.toISOString().split('T')[0];
      const [rv,rd]=await Promise.all([
        _sb().from('vendas').select('*').order('data_venda',{ascending:false}).limit(15),
        _sb().from('despesas').select('*').order('data_despesa',{ascending:false}).limit(15),
      ]);
      const vendas   = (rv.data||[]);
      const despesas = (rd.data||[]);
      const totVenda = vendas.filter(v=>v.data_venda>=mesStr).reduce((s,v)=>s+Number(v.valor||0),0);
      const totDesp  = despesas.filter(d=>d.data_despesa>=mesStr).reduce((s,d)=>s+Number(d.valor||0),0);
      const saldo    = totVenda-totDesp;
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
        await _sb().from('vendas').insert([{
          descricao:desc,valor,data_venda:data,produto:prod||null,
          coordenadoria_id:fin?.id||null,
          registrado_por:window._appProfile?.id
        }]);
      } else {
        await _sb().from('despesas').insert([{
          descricao:desc,valor,data_despesa:data,
          coordenadoria_id:fin?.id||null,
          registrado_por:window._appProfile?.id
        }]);
      }
      mostrarToast(`${tipo==='venda'?'Venda':'Despesa'} registrada!`,'success');
      this._carregarFluxo();
    }catch(e){mostrarToast('Erro ao salvar.','error');}
  },
};
const PageProjetos = {
  async init() { this._renderEventos(); },
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
    if(!el||!_sb())return;
    try {
      const {data}=await _sb().from('eventos')
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
        <input id="pe-local" class="form-input" placeholder="UFPI / Online"></div>
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
      await _sb().from('eventos').insert([{
        titulo,tipo,data_inicio:data,local:local||null,vagas,ativo:true,
        coordenadoria_id:prj?.id||null,criado_por:window._appProfile?.id
      }]);
      mostrarToast('Evento criado!','success');
      this._carregar();
    }catch(e){mostrarToast('Erro ao salvar.','error');}
  },
};
const PageOperacoes = {
  _renderPops() {
    const pg=document.getElementById('page-ops_pops');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    ct.innerHTML=_sc('Cofre de POPs','📁',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Procedimentos Operacionais Padrão — atualização semestral obrigatória (Regimento Art. 12º V).
      </p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${['Onboarding de membros','Relatório ABJ','Gestão de redes sociais',
           'Planejamento semestral','Visita técnica','Passagem de bastão'].map(p=>
          `<div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                       padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;color:var(--c-white)">📄 ${p}</span>
            <button class="btn btn-ghost" style="font-size:12px"
              onclick="mostrarToast('${p} — em breve!','info')">Ver ↗</button>
          </div>`).join('')}
      </div>`);
  },
};
const PagePessoas = {
  async init() { this._renderMembros(); },
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
    if(!el||!_sb())return;
    try {
      const {data}=await _sb()
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
    ct.innerHTML=_sc('Pesquisa de Clima','🌡️',`
      <p style="font-size:13px;color:var(--c-slate);margin-bottom:14px">
        Bimestral (Regimento Art. 12º VI). Adicione o link do formulário — todos os membros recebem notificação.
      </p>
      ${_btn('+ Adicionar pesquisa',"PagePessoas.adicionarClima()")}`);
  },
  convidar() {
    getCoords().then(coords=>{
      abrirModal({titulo:'✉️ Convidar Membro',tipo:'info',corpo:`
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
    const email =document.getElementById('inv-email')?.value?.trim();
    const coord =document.getElementById('inv-coord')?.value;
    const cargo =document.getElementById('inv-cargo')?.value;
    const role  =document.getElementById('inv-role')?.value||'assessor';
    if(!email){mostrarToast('Insira o e-mail!','warning');return;}
    fecharModal();
    try {
      await _sb().from('convites').insert([{
        email,coordenadoria_id:coord,cargo,role,
        criado_por:window._appProfile?.id
      }]);
      mostrarToast(`Convite enviado para ${email}!`,'success');
    }catch(e){mostrarToast('Erro ao enviar convite.','error');}
  },
  adicionarClima(){mostrarToast('Pesquisa de clima — em breve!','info');},
  exportar(){mostrarToast('Exportação — em breve!','info');},
};
const PageDev = {
  _temAcesso(){return window._appProfile?.role==='admin';},
  async init(){this._renderUsuarios();},
  _renderUsuarios(){
    const pg=document.getElementById('page-dev_usuarios');
    if(!pg)return;
    const ct=pg.querySelector('.content')||pg;
    if(!this._temAcesso()){
      ct.innerHTML='<div style="padding:40px;text-align:center;color:var(--c-slate)">🔒 Acesso restrito.</div>';
      return;
    }
    ct.innerHTML=_sc('Usuários do Sistema','👤',`
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${_btn('Recarregar',"PageDev._carregar()",'btn-ghost')}
      </div>
      <div id="dev-lista">
        <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
      </div>`) +
    _sc('Versão do Sistema','🔖',`
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px">
          <span style="color:var(--c-slate)">App Core</span>
          <span style="color:var(--c-white);font-weight:600">v8.0</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px">
          <span style="color:var(--c-slate)">ABJ Module</span>
          <span style="color:var(--c-white);font-weight:600">v3.0</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px">
          <span style="color:var(--c-slate)">Supabase</span>
          <span style="color:${window._supabase?'var(--green)':'var(--red)'};font-weight:600">
            ${window._supabase?'✅ Conectado':'❌ Offline'}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--b-1);border-radius:8px">
          <span style="color:var(--c-slate)">Online</span>
          <span style="color:${navigator.onLine?'var(--green)':'var(--red)'};font-weight:600">
            ${navigator.onLine?'✅ Online':'🔴 Offline'}
          </span>
        </div>
      </div>`);
    this._carregar();
  },
  async _carregar(){
    const el=document.getElementById('dev-lista');
    if(!el||!_sb())return;
    try {
      const {data}=await _sb().from('users')
        .select('*,coordenadorias(nome,sigla)')
        .order('created_at',{ascending:false});
      el.innerHTML=data?.length
        ?data.map(u=>`
          <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:10px;
                      padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--c-white)">${sanitize(u.nome||u.email||'—')}</div>
              <div style="font-size:12px;color:var(--c-slate)">${sanitize(u.email||'—')} · ${sanitize(u.coordenadorias?.nome||'—')}</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                           background:${u.ativo?'var(--green)':'var(--red)'}22;
                           color:${u.ativo?'var(--green)':'var(--red)'};
                           border:1px solid ${u.ativo?'var(--green)':'var(--red)'}44">
                ${u.role||'membro'}
              </span>
            </div>
          </div>`).join('')
        :'<div style="padding:16px;text-align:center;color:var(--c-slate)">Nenhum usuário.</div>';
    }catch(e){el.innerHTML='<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';}
  },
};
window.PageGeral     = PageGeral;
window.PageMarketing = PageMarketing;
window.PageFinancas  = PageFinancas;
window.PageProjetos  = PageProjetos;
window.PageOperacoes = PageOperacoes;
window.PagePessoas   = PagePessoas;
window.PageDev       = PageDev;
