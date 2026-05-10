'use strict';
const ABJ_ESTRELAS = [
  {n:1, prazo:'2026-03-31', premiacao:'Abril',       atividades:[1,2,3,4,6],   label:'1ª Estrela'},
  {n:2, prazo:'2026-05-31', premiacao:'Junho',       atividades:[8,9],         label:'2ª Estrela'},
  {n:3, prazo:'2026-07-31', premiacao:'Agosto',      atividades:[7,13,14],     label:'3ª Estrela'},
  {n:4, prazo:'2026-08-31', premiacao:'Setembro',    atividades:[5,16],        label:'4ª Estrela'},
  {n:5, prazo:'2026-09-30', premiacao:'ENEGEP 2026', atividades:[11,12,18],    label:'5ª Estrela'},
];

/* Ícones por número de atividade */
const _ICONS = ['📋','🎨','🎯','📊','📜','🎤','📅','🤝','📱','🏅','🎓','🏭','🎪','🏆','🌎','💡','📚','📋'];

const ABJModule = (() => {
  let _atividades = [];
  let _progresso  = [];

  /* ── Carrega dados do Supabase ── */
  async function carregar() {
    if (!window._supabase) return;
    try {
      const [r1, r2] = await Promise.all([
        window._supabase.from('atividades_abj').select('*').eq('ativo', true).order('numero'),
        window._supabase.from('progresso_abj').select('*, evidencias_abj(*)').order('created_at', {ascending: false})
      ]);
      _atividades = r1.data || [];
      _progresso  = r2.data || [];
    } catch(e) { console.warn('[ABJ]', e.message); }
  }

  function _statusAtv(numero) {
    const atv = _atividades.find(a => a.numero === numero);
    if (!atv) return 'pendente';
    const progs = _progresso.filter(p => p.atividade_id === atv.id);
    if (!progs.length) return 'pendente';
    if (progs.some(p => p.status === 'concluido')) return 'concluido';
    if (progs.some(p => p.status === 'em_andamento')) return 'em_andamento';
    return 'pendente';
  }

  function _pontosAtv(atvId) {
    return _progresso
      .filter(p => p.atividade_id === atvId)
      .reduce((s, p) => s + (p.pontos || 0), 0);
  }

  function _proximaEstrela() {
    return ABJ_ESTRELAS.find(e => new Date(e.prazo) >= new Date()) || null;
  }

  function _diasAte(data) {
    return Math.max(0, Math.ceil((new Date(data + 'T23:59:59') - new Date()) / 86400000));
  }

  function renderCountdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const prox = _proximaEstrela();
    if (!prox) { el.innerHTML = '<span style="color:var(--c-accent);font-weight:700">🏆 Todas as estrelas conquistadas!</span>'; return; }
    const atualizar = () => {
      const dias = _diasAte(prox.prazo);
      const tot  = new Date(prox.prazo + 'T23:59:59') - new Date();
      const hrs  = Math.floor((tot % 86400000) / 3600000);
      const min  = Math.floor((tot % 3600000) / 60000);
      el.innerHTML = `
        <div style="font-size:12px;color:var(--c-slate);font-weight:600;margin-bottom:8px">
          ${prox.label} — prazo ${new Date(prox.prazo).toLocaleDateString('pt-BR', {day:'2-digit', month:'long'})}
        </div>
        <div class="abj-countdown">
          <div class="abj-countdown-unit"><span class="abj-countdown-num">${String(dias).padStart(2,'0')}</span>dias</div>
          <span style="color:var(--c-accent);font-weight:900;font-size:18px">:</span>
          <div class="abj-countdown-unit"><span class="abj-countdown-num">${String(hrs).padStart(2,'0')}</span>horas</div>
          <span style="color:var(--c-accent);font-weight:900;font-size:18px">:</span>
          <div class="abj-countdown-unit"><span class="abj-countdown-num">${String(min).padStart(2,'0')}</span>min</div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--c-slate)">
          Atividades: ${prox.atividades.map(n => {
            const st  = _statusAtv(n);
            const cor = st === 'concluido' ? 'var(--green)' : st === 'em_andamento' ? 'var(--yellow)' : 'var(--c-slate)';
            return `<span style="color:${cor};font-weight:600">#${n}</span>`;
          }).join(' · ')}
        </div>`;
    };
    atualizar();
    setInterval(atualizar, 60000);
  }

  function renderEstrelas(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="abj-stars-row">${ABJ_ESTRELAS.map(e => {
      const concluidas = e.atividades.filter(n => _statusAtv(n) === 'concluido').length;
      const earned = concluidas === e.atividades.length;
      const partial = concluidas > 0 && !earned;
      return `<div class="abj-star${earned ? ' earned' : partial ? ' partial' : ''}">
        <div class="abj-star-icon">⭐</div>
        <div>${e.label}</div>
        <div style="font-size:9px;opacity:.7">${concluidas}/${e.atividades.length}</div>
        <div style="font-size:9px;opacity:.6">${new Date(e.prazo).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function _renderLista() {
    const el = document.getElementById('abj-lista');
    if (!el) return;
    if (!_atividades.length) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--c-slate)">Carregando atividades do banco...</div>';
      return;
    }
    const obrig = _atividades.filter(a => ![10, 15, 17].includes(a.numero));
    const opcio = _atividades.filter(a => [10, 15, 17].includes(a.numero));

    const _grupo = (lista, titulo) => `
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
                    color:var(--c-slate);margin-bottom:10px;padding-left:4px">${titulo}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${lista.map(_card).join('')}
        </div>
      </div>`;

    const _card = (a) => {
      const progs  = _progresso.filter(p => p.atividade_id === a.id);
      const st     = progs.some(p => p.status === 'concluido') ? 'concluido'
                   : progs.some(p => p.status === 'em_andamento') ? 'em_andamento' : 'pendente';
      const pts    = progs.reduce((s, p) => s + (p.pontos || 0), 0);
      const dias   = _diasAte(a.prazo || '2026-12-31');
      const urgente = dias <= 14 && st !== 'concluido';
      const cBadge = st === 'concluido' ? 'var(--green)' : st === 'em_andamento' ? 'var(--yellow)' : 'var(--c-slate)';
      const mensal = a.tipo === 'mensal';
      return `
        <div class="abj-card" onclick="ABJModule.abrirDetalhe('${a.id}')" ${urgente ? 'data-urgente="true"' : ''}>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px;flex-shrink:0">${_ICONS[a.numero - 1] || '📌'}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-weight:700;font-size:13px;color:var(--c-white)">${a.numero}. ${a.nome}</span>
                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;
                             background:${cBadge}22;color:${cBadge};border:1px solid ${cBadge}44;text-transform:uppercase">
                  ${st.replace('_',' ')}
                </span>
                ${mensal ? `<span style="font-size:10px;background:var(--b-1);color:var(--c-accent);padding:2px 7px;border-radius:99px">Mensal</span>` : ''}
                ${[10,15,17].includes(a.numero) ? `<span style="font-size:10px;background:var(--b-1);color:var(--c-slate);padding:2px 7px;border-radius:99px">Opcional</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <span style="font-size:12px;color:var(--c-accent);font-weight:700">${pts > 0 ? pts + ' pts' : (a.pontos_por_entrada || 0) + ' pts/entrada'}</span>
                ${a.pontos_max ? `<span style="font-size:11px;color:var(--c-slate)">max ${a.pontos_max} pts</span>` : ''}
                <span style="font-size:11px;color:${urgente ? 'var(--c-accent)' : 'var(--c-slate)'}">
                  ${urgente ? '⚠️ ' : '📅 '}${a.prazo || '—'}
                  ${dias > 0 ? `(${dias}d)` : '<b style="color:var(--red)">Vencido</b>'}
                </span>
                ${progs.length > 1 ? `<span style="font-size:11px;color:var(--c-slate)">${progs.length} registros</span>` : ''}
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

  /* ── Abre modal de detalhe da atividade ── */
  async function abrirDetalhe(id) {
    const a = _atividades.find(x => x.id === id);
    if (!a) return;

    const progs = _progresso.filter(p => p.atividade_id === id);
    const st    = progs.some(p => p.status === 'concluido') ? 'concluido'
                : progs.some(p => p.status === 'em_andamento') ? 'em_andamento' : 'pendente';
    const pts   = progs.reduce((s, p) => s + (p.pontos || 0), 0);
    const mensal = a.tipo === 'mensal';
    const podeEnviar = mensal || !['concluido'].includes(st);

    /* Evidências anteriores */
    const todasEvidencias = progs.flatMap(p => (p.evidencias_abj || []).map(ev => ({...ev, mes: p.mes_ref})));
    const listaEvidencias = todasEvidencias.length ? `
      <div style="border-top:1px solid var(--b-1);padding-top:12px;margin-top:4px">
        <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;margin-bottom:8px">
          Evidências registradas (${todasEvidencias.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${todasEvidencias.map(ev => `
            <div style="background:var(--b-1);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px">
              <span style="font-size:16px">${ev.tipo === 'link' ? '🔗' : ev.tipo === 'foto' ? '🖼️' : ev.tipo === 'video' ? '🎥' : ev.tipo === 'print' ? '📸' : '📄'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:var(--c-white);font-weight:600">${ev.descricao || 'Sem descrição'}</div>
                ${ev.url ? `<a href="${ev.url}" target="_blank" style="font-size:11px;color:var(--c-accent)">${ev.tipo === 'link' ? ev.url : 'Ver arquivo'} ↗</a>` : ''}
                ${ev.mes ? `<div style="font-size:10px;color:var(--c-slate);margin-top:2px">${ev.mes}</div>` : ''}
              </div>
              <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${ev.aprovado ? 'var(--green)22' : 'var(--b-1)'};color:${ev.aprovado ? 'var(--green)' : 'var(--c-slate)'}">
                ${ev.aprovado ? '✓ Aprovado' : 'Aguardando'}
              </span>
            </div>`).join('')}
        </div>
      </div>` : '';

    /* Formulário de nova evidência */
    const mesAtual = new Date().toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
    const ehLink   = a.numero === 9; /* Social Media — prefere URL */
    const formEvidencia = podeEnviar ? `
      <div style="border-top:1px solid var(--b-1);padding-top:14px;margin-top:${todasEvidencias.length ? '0' : '4px'}">
        <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;margin-bottom:10px">
          ${mensal ? `📅 Registrar — ${mesAtual}` : '📎 Registrar evidência'}
        </div>
        <textarea id="abj-desc" class="evidence-textarea"
          placeholder="${mensal ? 'Descreva o que foi realizado neste mês...' : 'Descreva o que foi feito, como foi feito e o impacto gerado...'}"
          style="width:100%;background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;color:var(--c-white);padding:10px;font-size:13px;resize:vertical;min-height:80px;font-family:inherit;box-sizing:border-box"></textarea>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
          <div style="position:relative">
            <input type="text" id="abj-link" class="evidence-input"
              placeholder="🔗 Cole um link de evidência (URL, Drive, Instagram, YouTube...)"
              style="width:100%;background:var(--b-1);border:1px solid var(--b-2);border-radius:8px;color:var(--c-white);padding:10px;font-size:13px;font-family:inherit;box-sizing:border-box">
          </div>
          <label style="display:flex;align-items:center;gap:8px;background:var(--b-1);border:1px dashed var(--b-2);border-radius:8px;padding:10px;cursor:pointer;font-size:13px;color:var(--c-slate)">
            <input type="file" id="abj-file" accept="image/*,application/pdf,video/*" style="display:none"
              onchange="var l=document.getElementById('abj-file-label');if(l&&this.files[0])l.textContent='✓ '+this.files[0].name;">
            📎 <span id="abj-file-label">Ou anexar arquivo (foto, PDF, vídeo)</span>
          </label>
        </div>
      </div>` : `
      <div style="background:var(--green)11;border:1px solid var(--green)33;border-radius:8px;padding:12px;text-align:center;margin-top:8px">
        <span style="color:var(--green);font-weight:700">✅ Atividade concluída</span>
        <div style="font-size:12px;color:var(--c-slate);margin-top:4px">${pts} pontos registrados</div>
      </div>`;

    abrirModal({
      titulo: `${_ICONS[a.numero - 1] || '📌'} ${a.nome}`,
      tipo: 'info',
      corpo: `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
          <div style="background:var(--b-1);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--c-slate);text-transform:uppercase;font-weight:700;margin-bottom:4px">Pontos</div>
            <div style="font-weight:800;font-size:16px;color:var(--c-accent)">${a.pontos_por_entrada || 0} pts</div>
            ${a.pontos_max ? `<div style="font-size:10px;color:var(--c-slate)">max ${a.pontos_max}</div>` : ''}
          </div>
          <div style="background:var(--b-1);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--c-slate);text-transform:uppercase;font-weight:700;margin-bottom:4px">Prazo</div>
            <div style="font-weight:700;color:var(--c-white);font-size:12px">${a.prazo || '—'}</div>
          </div>
          <div style="background:var(--b-1);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--c-slate);text-transform:uppercase;font-weight:700;margin-bottom:4px">Acumulado</div>
            <div style="font-weight:800;font-size:16px;color:var(--green)">${pts}</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--c-slate);line-height:1.6;margin-bottom:14px">${a.descricao || ''}</p>
        ${listaEvidencias}
        ${formEvidencia}`,
      botoes: [
        {texto: 'Fechar', classe: 'btn-ghost', acao: fecharModal},
        ...(podeEnviar ? [{texto: '📤 Enviar evidência', classe: 'btn-primary', acao: () => _enviar(a)}] : [])
      ]
    });
  }

  /* ── Salva evidência e atualiza progresso ── */
  async function _enviar(a) {
    const desc = document.getElementById('abj-desc')?.value?.trim();
    const link = document.getElementById('abj-link')?.value?.trim();
    const file = document.getElementById('abj-file')?.files?.[0];

    if (!desc) { mostrarToast('Descreva o que foi feito!', 'warning'); return; }

    fecharModal();
    mostrarToast('Enviando...', 'info', 2000);

    const sb      = window._supabase;
    const mensal  = a.tipo === 'mensal';
    const mesRef  = new Date().toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
    const userId  = window._appProfile?.id;

    try {
      /* Verifica se já existe um progresso do próprio usuário para esta atividade/mês */
      let progId = null;
      let qProg = sb.from('progresso_abj').select('id').eq('atividade_id', a.id).eq('registrado_por', userId);
      if (mensal) qProg = qProg.eq('mes_ref', mesRef);
      const { data: progRows } = await qProg.order('created_at').limit(1);
      const ex = progRows?.[0] || null;
      if (ex) {
        await sb.from('progresso_abj').update({
          status: 'em_andamento',
          observacao: desc,
          registrado_por: userId,
          pontos: a.pontos_por_entrada || 0
        }).eq('id', ex.id);
        progId = ex.id;
      }

      /* Se não existe, cria novo */
      if (!progId) {
        const { data: novo, error: errProg } = await sb.from('progresso_abj').insert([{
          atividade_id: a.id,
          status: 'em_andamento',
          observacao: desc,
          registrado_por: userId,
          pontos: a.pontos_por_entrada || 0,
          mes_ref: mensal ? mesRef : null
        }]).select('id').single();
        if (errProg) throw errProg;
        progId = novo.id;
      }

      /* Salva evidência de link (se preenchido) */
      if (link) {
        await sb.from('evidencias_abj').insert([{
          progresso_id: progId,
          tipo: 'link',
          url: link,
          descricao: desc
        }]);
      }

      /* Faz upload do arquivo (se selecionado) */
      if (file && progId) {
        const rawExt = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin';
        const ext    = rawExt.replace(/[^a-z0-9]/g, '') || 'bin';
        const path   = `abj/${progId}/${Date.now()}.${ext}`;
        const { data: up, error: errUp } = await sb.storage
          .from('evidencias').upload(path, file, { upsert: true });
        if (up && !errUp) {
          const { data: urlData } = sb.storage.from('evidencias').getPublicUrl(path);
          const tipo = file.type.startsWith('image/') ? 'foto'
                     : file.type.startsWith('video/') ? 'video' : 'documento';
          await sb.from('evidencias_abj').insert([{
            progresso_id: progId, tipo,
            url: urlData?.publicUrl || '',
            descricao: desc
          }]);
        } else if (errUp) {
          console.error('[ABJ] Upload falhou:', errUp.message);
          /* Salva evidência de texto mesmo sem o arquivo */
          await sb.from('evidencias_abj').insert([{
            progresso_id: progId, tipo: 'documento',
            url: '', descricao: `[Arquivo não enviado] ${desc}`
          }]);
          await carregar(); _renderLista();
          mostrarToast(`Descrição salva, mas o arquivo não pôde ser enviado: ${errUp.message}`, 'warning');
          return;
        }
      }

      /* Se nem link nem arquivo → salva texto como evidência */
      if (!link && !file) {
        await sb.from('evidencias_abj').insert([{
          progresso_id: progId, tipo: 'documento',
          url: '', descricao: desc
        }]);
      }

      await carregar();
      _renderLista();
      mostrarToast('Evidência enviada! Coordenação vai revisar. 👍', 'success');
    } catch(e) {
      console.error('[ABJ enviar]', e);
      mostrarToast('Erro ao enviar: ' + (e.message || 'tente de novo'), 'error');
    }
  }

  /* ── Renderiza a página page-abj completa ── */
  async function init() {
    const pg = document.getElementById('page-abj');
    if (!pg) return;
    const content = pg.querySelector('.content') || pg;
    const totalPts = _progresso.reduce((s, p) => s + (p.pontos || 0), 0);
    const pct = Math.min(100, Math.round((totalPts / 882) * 100));

    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px">
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
                <span id="abj-total-pts">${totalPts}</span> <span style="font-size:14px;color:var(--c-slate)">/ 882 pts</span>
              </div>
              <div style="background:var(--b-1);border-radius:99px;height:6px;width:140px;margin-top:6px;margin-left:auto;overflow:hidden">
                <div id="abj-pts-bar" style="background:var(--c-accent);height:100%;width:${pct}%;border-radius:99px;transition:width .5s"></div>
              </div>
            </div>
          </div>
          <div id="abj-estrelas"></div>
        </div>
        <div class="section-card" style="padding:16px 20px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">⏱️ Próximo prazo</div>
          <div id="abj-countdown"></div>
        </div>
        <div class="section-card" style="padding:20px 24px">
          <div style="font-size:11px;font-weight:700;color:var(--c-slate);text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px">📋 Atividades</div>
          <div id="abj-lista"></div>
        </div>
      </div>`;

    await carregar();
    /* Recalcula pontos após carregar dados frescos */
    const pts = _progresso.reduce((s, p) => s + (p.pontos || 0), 0);
    const pctAtual = Math.min(100, Math.round((pts / 882) * 100));
    const elPts = document.getElementById('abj-total-pts');
    const elBar = document.getElementById('abj-pts-bar');
    if (elPts) elPts.textContent = pts;
    if (elBar) elBar.style.width = pctAtual + '%';
    const hdrPts = document.getElementById('abjHeaderPts');
    if (hdrPts) hdrPts.textContent = pts;
    renderEstrelas('abj-estrelas');
    renderCountdown('abj-countdown');
    _renderLista();
  }

  return { init, carregar, abrirDetalhe, renderEstrelas, renderCountdown };
})();

window.ABJModule    = ABJModule;
window.ABJ          = ABJModule;
window.ABJ_ESTRELAS = ABJ_ESTRELAS;
