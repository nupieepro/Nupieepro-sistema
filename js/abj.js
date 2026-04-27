'use strict';
const ABJ_ESTRELAS = [
  {n:1, prazo:'2026-03-31', premiacao:'Abril',       atividades:[1,2,3,4,6],   label:'1ª Estrela'},
  {n:2, prazo:'2026-05-31', premiacao:'Junho',       atividades:[8,9],         label:'2ª Estrela'},
  {n:3, prazo:'2026-07-31', premiacao:'Agosto',      atividades:[7,13,14],     label:'3ª Estrela'},
  {n:4, prazo:'2026-08-31', premiacao:'Setembro',    atividades:[5,16],        label:'4ª Estrela'},
  {n:5, prazo:'2026-09-30', premiacao:'ENEGEP 2026', atividades:[11,12,18],    label:'5ª Estrela'},
];
const ABJModule = (() => {
  let _atividades = [];   
  let _progresso  = [];   
  async function carregar() {
    if (!window._supabase) return;
    try {
      const [r1, r2] = await Promise.all([
        window._supabase.from('atividades_abj').select('*').eq('ativo',true).order('numero'),
        window._supabase.from('progresso_abj').select('*,evidencias_abj(*)')
      ]);
      _atividades = r1.data || [];
      _progresso  = r2.data || [];
    } catch(e) { console.warn('[ABJ]',e.message); }
  }
  function _statusAtv(numero) {
    const atv = _atividades.find(a=>a.numero===numero);
    if (!atv) return 'pendente';
    const prog = _progresso.find(p=>p.atividade_id===atv.id);
    return prog?.status || 'pendente';
  }
  function _proximaEstrela() {
    return ABJ_ESTRELAS.find(e=>new Date(e.prazo) >= new Date()) || null;
  }
  function _diasAte(data) {
    return Math.max(0, Math.ceil((new Date(data+'T23:59:59')-new Date())/86400000));
  }
  function renderCountdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const prox = _proximaEstrela();
    if (!prox) { el.innerHTML='<span style="color:var(--c-accent);font-weight:700">🏆 Todas as estrelas!</span>'; return; }
    const atualizar = () => {
      const dias = _diasAte(prox.prazo);
      const tot  = (new Date(prox.prazo+'T23:59:59')-new Date());
      const hrs  = Math.floor((tot%86400000)/3600000);
      const min  = Math.floor((tot%3600000)/60000);
      el.innerHTML=`
        <div style="font-size:12px;color:var(--c-slate);font-weight:600;margin-bottom:8px">
          ${prox.label} — prazo ${new Date(prox.prazo).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}
        </div>
        <div class="abj-countdown">
          <div class="abj-countdown-unit"><span class="abj-countdown-num">${String(dias).padStart(2,'0')}</span>dias</div>
          <span style="color:var(--c-accent);font-weight:900;font-size:18px">:</span>
          <div class="abj-countdown-unit"><span class="abj-countdown-num">${String(hrs).padStart(2,'0')}</span>horas</div>
          <span style="color:var(--c-accent);font-weight:900;font-size:18px">:</span>
          <div class="abj-countdown-unit"><span class="abj-countdown-num">${String(min).padStart(2,'0')}</span>min</div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--c-slate)">
          Atividades: ${prox.atividades.map(n=>{
            const a=_atividades.find(x=>x.numero===n);
            const st=_statusAtv(n);
            const cor=st==='concluido'?'var(--green)':st==='em_andamento'?'var(--yellow)':'var(--c-slate)';
            return `<span style="color:${cor};font-weight:600">#${n}</span>`;
          }).join(' · ')}
        </div>`;
    };
    atualizar();
    setInterval(atualizar,60000);
  }
  function renderEstrelas(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML=`<div class="abj-stars-row">${ABJ_ESTRELAS.map(e=>{
      const earned = new Date(e.prazo)<new Date();
      return `<div class="abj-star${earned?' earned':''}">
        <div class="abj-star-icon">⭐</div>
        <div>${e.label}</div>
        <div style="font-size:9px;opacity:.7">${new Date(e.prazo).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</div>
      </div>`;
    }).join('')}</div>`;
  }
  function _renderLista() {
    const el = document.getElementById('abj-lista');
    if (!el) return;
    if (!_atividades.length) {
      el.innerHTML='<div style="padding:20px;text-align:center;color:var(--c-slate)">Carregando atividades do banco...</div>';
      return;
    }
    const obrig = _atividades.filter(a=>![10,15,17].includes(a.numero));
    const opcio = _atividades.filter(a=>[10,15,17].includes(a.numero));
    const _grupo = (lista, titulo) => `
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
                    color:var(--c-slate);margin-bottom:10px;padding-left:4px">${titulo}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${lista.map(_card).join('')}
        </div>
      </div>`;
    const _card = (a) => {
      const prog = _progresso.find(p=>p.atividade_id===a.id);
      const st   = prog?.status||'pendente';
      const dias = _diasAte(a.prazo||'2026-12-31');
      const urgente = dias<=7&&st==='pendente';
      const cBadge = st==='concluido'?'var(--green)':st==='em_andamento'?'var(--yellow)':'var(--c-slate)';
      return `
        <div class="abj-card" onclick="ABJModule.abrirDetalhe('${a.id}')"
          ${urgente?'data-urgente="true"':''}>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px;flex-shrink:0">
              ${['📋','🎨','🎯','📊','📜','🎤','📅','📅','🤝','📱','🏅','🎓','🏭','🎪','🏆','🌎','💡','📚','📋'][a.numero-1]||'📌'}
            </span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-weight:700;font-size:13px;color:var(--c-white)">${a.numero}. ${a.nome}</span>
                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;
                             background:${cBadge}22;color:${cBadge};border:1px solid ${cBadge}44;text-transform:uppercase">
                  ${st.replace('_',' ')}
                </span>
                ${![10,15,17].includes(a.numero)?'':`<span style="font-size:10px;background:var(--b-1);color:var(--c-slate);padding:2px 7px;border-radius:99px">Opcional</span>`}
              </div>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <span style="font-size:12px;color:var(--c-slate)">${a.pontos_por_entrada||0} pts</span>
                <span style="font-size:11px;color:${urgente?'var(--c-accent)':'var(--c-slate)'}">
                  ${urgente?'⚠️ ':'📅 '}${a.prazo||'—'}
                  ${dias>0?`(${dias}d)`:'<b style="color:var(--red)">Vencido</b>'}
                </span>
              </div>
            </div>
            <span style="color:var(--c-slate);font-size:18px">›</span>
          </div>
        </div>`;
    };
    el.innerHTML =
      _grupo(obrig, `✅ Obrigatórias (${obrig.length})`) +
      _grupo(opcio, `⭐ Opcionais (${opcio.length}) — contam no Ranking`);
  }
  async function abrirDetalhe(id) {
    const a = _atividades.find(x=>x.id===id);
    if (!a) return;
    const prog = _progresso.find(p=>p.atividade_id===id);
    const st   = prog?.status||'pendente';
    const podeEnviar = ['pendente','em_andamento'].includes(st);
    abrirModal({ titulo:`${a.nome}`, tipo:'info', corpo:`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="background:var(--b-1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--c-slate);text-transform:uppercase;font-weight:700;margin-bottom:4px">Pontuação</div>
          <div style="font-weight:800;font-size:16px;color:var(--c-accent)">${a.pontos_por_entrada||0} pts</div>
        </div>
        <div style="background:var(--b-1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--c-slate);text-transform:uppercase;font-weight:700;margin-bottom:4px">Prazo</div>
          <div style="font-weight:700;color:var(--c-white);font-size:12px">${a.prazo||'—'}</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--c-slate);line-height:1.6;margin-bottom:14px">${a.descricao||''}</p>
      ${podeEnviar?`
        <div style="border-top:1px solid var(--b-1);padding-top:14px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;margin-bottom:10px">Registrar evidência</div>
          <textarea id="abj-desc" class="evidence-textarea"
            placeholder="Descreva o que foi feito..."></textarea>
          <label class="evidence-area" onclick="document.getElementById('abj-file').click()">
            <input type="file" id="abj-file" accept="image/*,application/pdf" style="display:none">
            📎 Anexar comprovante (opcional)
          </label>
        </div>
      `:''}
    `, botoes:[
      {texto:'Fechar', classe:'btn-ghost', acao:fecharModal},
      ...(podeEnviar ? [{texto:'Enviar ✓', classe:'btn-primary', acao:()=>_enviar(a.id)}] : [])
    ]});
  }

  async function _enviar(atvDbId) {
    const desc = document.getElementById('abj-desc')?.value?.trim();
    const file = document.getElementById('abj-file')?.files?.[0];
    if (!desc) { mostrarToast('Descreve o que foi feito!','warning'); return; }
    fecharModal();
    mostrarToast('Enviando...','info',2000);
    try {
      const { data: prog, error } = await window._supabase
        .from('progresso_abj')
        .upsert({
          atividade_id: atvDbId,
          status: 'em_andamento',
          observacao: desc,
          registrado_por: window._appProfile?.id,
          pontos: 0,
          mes_ref: new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
        }, { onConflict: 'atividade_id' })
        .select().single();
      if (error) throw error;
      if (file && prog?.id) {
        const ext  = file.name.split('.').pop();
        const path = `abj/${prog.id}/${Date.now()}.${ext}`;
        const { data: up } = await window._supabase.storage
          .from('evidencias').upload(path,file,{upsert:true});
        if (up) {
          const { data: url } = window._supabase.storage.from('evidencias').getPublicUrl(path);
          await window._supabase.from('evidencias_abj').insert([{
            progresso_id: prog.id,
            tipo: file.type.startsWith('image/')? 'foto':'documento',
            url: url?.publicUrl||'',
            descricao: desc
          }]);
        }
      }
      await carregar();
      _renderLista();
      mostrarToast('Registrado! Coordenação vai revisar. 👍','success');
    } catch(e) {
      console.error('[ABJ enviar]',e);
      mostrarToast('Erro ao enviar. Tenta de novo!','error');
    }
  }
  async function init() {
    const pg = document.getElementById('page-abj');
    if (!pg) return;
    const content = pg.querySelector('.content')||pg;
    const totalPts = _progresso.reduce((s,p)=>s+(p.pontos||0),0);
    content.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Header -->
        <div class="section-card" style="padding:20px 24px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
            <div>
              <h2 style="font-family:var(--f-head);font-size:20px;font-weight:800;color:var(--c-white);margin-bottom:4px">
                🏅 Selo ABEPRO Jovem 2026
              </h2>
              <p style="font-size:13px;color:var(--c-slate)">18 atividades · 5 estrelas · Gestão 2026</p>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--c-slate);margin-bottom:4px">PONTUAÇÃO</div>
              <div style="font-family:var(--f-head);font-size:28px;font-weight:900;color:var(--c-accent)">
                ${totalPts} <span style="font-size:14px;color:var(--c-slate)">pts</span>
              </div>
            </div>
          </div>
          <div id="abj-estrelas"></div>
        </div>
        <!-- Countdown -->
        <div class="section-card" style="padding:16px 20px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">⏱️ Próximo prazo</div>
          <div id="abj-countdown"></div>
        </div>
        <!-- Lista -->
        <div class="section-card" style="padding:20px 24px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px">📋 Atividades</div>
          <div id="abj-lista"></div>
        </div>
      </div>`;
    await carregar();
    renderEstrelas('abj-estrelas');
    renderCountdown('abj-countdown');
    _renderLista();
  }
  return { init, carregar, abrirDetalhe, renderEstrelas, renderCountdown };
})();
window.ABJModule    = ABJModule;
window.ABJ          = ABJModule;
window.ABJ_ESTRELAS = ABJ_ESTRELAS;
