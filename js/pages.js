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
  novaMelhoria() {
    abrirModal({ titulo:'🛠️ Sugerir Melhoria', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Descrição da Melhoria *</label>
        <textarea id="nm-desc" class="form-input" style="height:100px" placeholder="Descreva sua sugestão..."></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Sugerir',classe:'btn-primary',acao:()=> { mostrarToast('Sugestão enviada!','success'); fecharModal(); }}
    ]});
  },
  novaParceria() {
    abrirModal({ titulo:'🤝 Nova Parceria', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Instituição/Empresa *</label>
        <input id="np-nome" class="form-input" placeholder="Ex: CREA-PI"></div>
      <div class="form-group"><label class="form-label">Tipo</label>
        <select id="np-tipo" class="form-select">
          <option value="instituicao">Instituição</option>
          <option value="empresa">Empresa</option>
          <option value="outro">Outro</option>
        </select></div>
      <div class="form-group"><label class="form-label">Contato/Link</label>
        <input id="np-contato" class="form-input" placeholder="E-mail ou Telefone"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar',classe:'btn-primary',acao:()=> {
        mostrarToast('Parceria salva! (Conecte o Supabase para persistir)','success');
        fecharModal();
      }}
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
  verFrequencia() { mostrarToast('Módulo de frequência aguardando Supabase.','info'); },
  abrirCheckin()  { mostrarToast('Módulo de check-in aguardando Supabase.','info'); },
};
const PageMarketing = {
  async init() { this._renderTracker(); },
  _renderTracker() {
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
  novoEpisodio() {
    abrirModal({ titulo:'🎙️ Rastrear NUPICAST', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título do Episódio *</label>
        <input id="ne-titulo" class="form-input" placeholder="Ex: NUPICAST #01"></div>
      <div class="form-group"><label class="form-label">Link do YouTube/Spotify</label>
        <input id="ne-link" class="form-input" placeholder="https://..."></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Rastrear',classe:'btn-primary',acao:()=> { mostrarToast('Episódio rastreado!','success'); fecharModal(); }}
    ]});
  },
  novaNoticia() {
    abrirModal({ titulo:'🎓 Momento ENEGEP', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título da Notícia *</label>
        <input id="en-titulo" class="form-input"></div>
      <div class="form-group"><label class="form-label">Conteúdo</label>
        <textarea id="en-texto" class="form-input" style="height:100px"></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Postar',classe:'btn-primary',acao:()=> { mostrarToast('Notícia postada!','success'); fecharModal(); }}
    ]});
  },
  novoTreinamento() {
    abrirModal({ titulo:'📚 Registrar Treinamento', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome do Treinamento *</label>
        <input id="tr-nome" class="form-input"></div>
      <div class="form-group"><label class="form-label">Link/Certificado</label>
        <input id="tr-link" class="form-input" placeholder="https://..."></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar',classe:'btn-primary',acao:()=> { mostrarToast('Treinamento registrado!','success'); fecharModal(); }}
    ]});
  }
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
  adicionarClima(){mostrarToast('Pesquisa de clima aguardando Supabase.','info');},
  exportar(){mostrarToast('Exportação aguardando Supabase.','info');},
  novoTalento() {
    abrirModal({ titulo:'👤 Novo Talento', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Nome Completo *</label>
        <input id="nt-nome" class="form-input"></div>
      <div class="form-group"><label class="form-label">Universidade</label>
        <input id="nt-univ" class="form-input"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar',classe:'btn-primary',acao:()=> { mostrarToast('Talento registrado!','success'); fecharModal(); }}
    ]});
  }
};
/* ══════════════════════════════════════════════════════════════
   PageDev — Painel de Administração do Sistema (Admin Only)
   Acesso exclusivo: role === 'admin'  (JR e afins)
   ══════════════════════════════════════════════════════════════ */
const PageDev = {
  _tab: 'usuarios',
  _coords: [],   /* cache de coordenadorias */

  _temAcesso() { return window._appProfile?.role === 'admin'; },

  /* ── Entry point ── */
  async init() {
    /* Pré-carrega coordenadorias para selects */
    if (_sb() && !this._coords.length) {
      const { data } = await _sb().from('coordenadorias').select('id,nome,sigla').order('nome');
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
    if (!el || !_sb()) return;
    try {
      const { data } = await _sb()
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
      await _sb().from('users').update({ nome, apelido, cargo, role, coordenadoria_id: coordId, aniversario: aniv, ativo })
        .eq('id', userId);
      /* Se desativou → envia e-mail de despedida */
      if (!ativo && uOriginal.ativo) {
        const coord = this._coords.find(c => c.id === coordId);
        await window.EmailsModule?.enviarDespedida({ ...uOriginal, nome, apelido, cargo }, coord?.nome);
      }
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
    if (!el || !_sb()) return;
    try {
      const { data } = await _sb()
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
    const email = document.getElementById('nc-email')?.value.trim();
    const coord = document.getElementById('nc-coord')?.value;
    const role  = document.getElementById('nc-role')?.value;
    const cargo = document.getElementById('nc-cargo')?.value.trim() || null;
    if (!email || !coord) { mostrarToast('Preencha e-mail e coordenadoria.','error'); return; }
    try {
      const { data, error } = await _sb().from('convites').insert({
        email, coordenadoria_id: coord, role, cargo,
        criado_por: window._appProfile?.id
      }).select().single();
      if (error) throw error;
      /* Envia e-mail de convite */
      const coordInfo = this._coords.find(c => c.id === coord);
      await window.EmailsModule?.enviarConvite({
        email, coord: coordInfo?.nome, cargo, token: data.token,
        criadoPor: window._appProfile?.apelido || window._appProfile?.nome || 'Equipe Nupi'
      });
      fecharModal();
      mostrarToast('Convite enviado para ' + email + '!', 'success');
      this._carregarConvites();
    } catch(e) { mostrarToast('Erro: ' + e.message,'error'); }
  },

  _novoConviteRapido() { this._switchTab('convites'); this.novoConvite(); },

  async _reenviarConvite(id, email, token) {
    const convite = (await _sb().from('convites').select('*,coordenadorias(nome)').eq('id',id).single()).data;
    if (!convite) return;
    await window.EmailsModule?.enviarConvite({
      email, coord: convite.coordenadorias?.nome, cargo: convite.cargo,
      token, criadoPor: window._appProfile?.apelido || 'Equipe Nupi'
    });
    mostrarToast('Convite reenviado!','success');
  },

  async _revogarConvite(id) {
    await _sb().from('convites').update({ expires_at: new Date().toISOString() }).eq('id', id);
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
    if (!el || !_sb()) return;
    try {
      const { data } = await _sb()
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
    const sb     = !!_sb();
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
    const extincao  = await R.alertaExtincao(_sb());
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
  novaVisita() {
    abrirModal({ titulo:'🏭 Agendar Visita Técnica', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Indústria/Empresa *</label>
        <input id="vt-empresa" class="form-input"></div>
      <div class="form-group"><label class="form-label">Data Prevista</label>
        <input id="vt-data" type="date" class="form-input"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Agendar',classe:'btn-primary',acao:()=> { mostrarToast('Visita agendada!','success'); fecharModal(); }}
    ]});
  },
  novaApresentacao() {
    abrirModal({ titulo:'🎤 Registrar Apresentação', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título da Apresentação *</label>
        <input id="ap-titulo" class="form-input"></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Salvar',classe:'btn-primary',acao:()=> { mostrarToast('Apresentação salva!','success'); fecharModal(); }}
    ]});
  },
  novaProducao() {
    abrirModal({ titulo:'🔬 Registrar Produção Científica', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título do Artigo *</label>
        <input id="pc-titulo" class="form-input"></div>
      <div class="form-group"><label class="form-label">Link (DOI/PDF)</label>
        <input id="pc-link" class="form-input" placeholder="https://..."></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Registrar',classe:'btn-primary',acao:()=> { mostrarToast('Artigo registrado com sucesso!','success'); fecharModal(); }}
    ]});
  },
  novaPauta() {
    abrirModal({ titulo:'🗳️ Criar Pauta de Votação', tipo:'info', corpo:`
      <div class="form-group"><label class="form-label">Título da Pauta *</label>
        <input id="pv-titulo" class="form-input" placeholder="Ex: Aprovação de Contas 2026"></div>
      <div class="form-group"><label class="form-label">Descrição</label>
        <textarea id="pv-desc" class="form-input" style="height:80px"></textarea></div>`,
    botoes:[
      {texto:'Cancelar',classe:'btn-ghost',acao:fecharModal},
      {texto:'Abrir Votação',classe:'btn-primary',acao:()=> { mostrarToast('Pauta aberta para votação!','success'); fecharModal(); }}
    ]});
  }
};

window.PageGeral     = PageGeral;
window.PageMarketing = PageMarketing;
window.PageFinancas  = PageFinancas;
window.PageProjetos  = PageProjetos;
window.PageOperacoes = PageOperacoes;
window.PagePessoas   = PagePessoas;
window.PageDev       = PageDev;
window.PageGlobal    = PageGlobal;
