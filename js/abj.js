
// Herança Global do Supabase V6.0
const _sb = window._sb || window._supabase;

const ABJ_LIST = [
  { id:1,  numero:1,  nome:'Reunião de Planejamento Anual',      ptsMax:40, coord:'Geral', desc:'Participar da reunião de planejamento estratégico anual do núcleo.' },
  { id:2,  numero:2,  nome:'Filiação Oficial ABJ',               ptsMax:50, coord:'Finanças', desc:'Registrar e confirmar a filiação do núcleo à Associação Brasileira de Júniores.' },
  { id:3,  numero:3,  nome:'Reunião Mensal de Diretoria',        ptsMax:20, coord:'Geral', desc:'Realizar a reunião mensal de diretoria com registro em ata.' },
  { id:4,  numero:4,  nome:'Relatório de Gestão',                ptsMax:40, coord:'Geral', desc:'Elaborar e publicar o relatório de gestão do período.' },
  { id:5,  numero:5,  nome:'Projeto de Extensão',                ptsMax:60, coord:'Projetos', desc:'Executar e documentar um projeto de extensão universitária.' },
  { id:6,  numero:6,  nome:'Evento Técnico Realizado',           ptsMax:80, coord:'Operações', desc:'Organizar e realizar um evento técnico ou palestra para a comunidade.' },
  { id:7,  numero:7,  nome:'Publicação em Mídia Social',         ptsMax:15, coord:'Marketing', desc:'Publicar conteúdo institucional nas redes sociais do núcleo.' },
  { id:8,  numero:8,  nome:'Webinar ou Evento Online',           ptsMax:30, coord:'Projetos', desc:'Realizar ou participar de webinar representando o NUPIEEPRO.' },
  { id:9,  numero:9,  nome:'Visita Técnica',                     ptsMax:40, coord:'Operações', desc:'Organizar ou participar de visita técnica a empresa ou instituição.' },
  { id:10, numero:10, nome:'Parceria com Empresa',               ptsMax:60, coord:'Geral', desc:'Firmar parceria formal com empresa ou instituição parceira.' },
  { id:11, numero:11, nome:'Planejamento Estratégico Semestral', ptsMax:50, coord:'Geral', desc:'Elaborar e aprovar o planejamento estratégico semestral.' },
  { id:12, numero:12, nome:'Cronograma Oficial',                 ptsMax:25, coord:'G. Pessoas', desc:'Publicar e distribuir o cronograma oficial de atividades do semestre.' },
  { id:13, numero:13, nome:'Mapeamento de Competências',         ptsMax:50, coord:'G. Pessoas', desc:'Realizar mapeamento das competências da equipe e apresentar resultados.' },
  { id:14, numero:14, nome:'Programa de Mentoria Interna',       ptsMax:50, coord:'G. Pessoas', desc:'Criar ou participar de programa de mentoria para membros do núcleo.' },
  { id:15, numero:15, nome:'Campanha de Conscientização',        ptsMax:35, coord:'Marketing', desc:'Executar campanha de conscientização (ESG, segurança, saúde, etc.).' },
  { id:16, numero:16, nome:'Representação Nacional',             ptsMax:70, coord:'Geral', desc:'Representar o NUPIEEPRO em evento regional ou nacional da ABJ.' },
  { id:17, numero:17, nome:'Premiação Oficial',                  ptsMax:80, coord:'Projetos', desc:'Receber premiação ou certificação oficial em nome do núcleo.' },
  { id:18, numero:18, nome:'Relatório de Impacto Anual',         ptsMax:60, coord:'Operações', desc:'Produzir e publicar o relatório de impacto e resultados anuais.' },
];

const ABJ = {
  data: [],
  _statusMap: {}, // local cache for status

  async init() {
    this.data = JSON.parse(JSON.stringify(ABJ_LIST)); // Copy standard list

    // Load local storage states first
    try {
      this._statusMap = JSON.parse(localStorage.getItem('abj_status') || '{}');
    } catch {
      this._statusMap = {};
    }

    // Assign states to data
    this.data.forEach(item => {
      item.status = this._statusMap[item.id] || 'pendente';
      item.currentPts = (item.status === 'concluidas' || item.status === 'concluida') ? item.ptsMax : 0;
      item.color = (item.status === 'pendente') ? 'red' : (item.status === 'verificacao' ? 'yellow' : 'green');
    });

    // If Supabase is connected, override with real data
    if (window._supabase) {
      try {
        const { data: realData, error } = await _sb.from('progresso_abj').select('*');
        if (!error && realData) {
          realData.forEach(p => {
             let item = this.data.find(d => d.id === p.atividade_id);
             if (item) {
                item.status = p.status;
                item.currentPts = p.status === 'concluida' ? item.ptsMax : 0;
                item.color = (item.status === 'pendente') ? 'red' : (item.status === 'verificacao' ? 'yellow' : 'green');
             }
          });
        }
      } catch (e) {
        console.warn('ABJ: Usando cache local. Não foi possível puxar progresso ABJ.', e.message);
      }
    }
    
    this.renderCards('todas');
    this.updateHeader();
  },

  updateHeader() {
    const totalPts = this.data.reduce((sum, item) => sum + (item.status === 'concluida' || item.status === 'concluidas' ? item.ptsMax : 0), 0);
    const dashPts = document.getElementById('dashPts');
    if (dashPts) dashPts.textContent = totalPts;
    
    const abjHeaderPts = document.getElementById('abjHeaderPts');
    if (abjHeaderPts) abjHeaderPts.textContent = totalPts;

    // Atualiza barra na home
    const pct = Math.round((totalPts / 882) * 100);
    
    // Novas IDs do Termômetro Auditivo V7.2
    const elPct = document.getElementById('audit-percent');
    const elBar = document.getElementById('audit-bar');
    const elStatus = document.getElementById('audit-status');

    if (elPct) elPct.textContent = pct + '%';
    if (elBar) elBar.style.width = Math.min(pct, 100) + '%';
    if (elStatus) {
      if (pct === 0) elStatus.textContent = 'Aguardando submissão de atividades...';
      else if (pct < 50) elStatus.textContent = 'Auditoria em estágio inicial.';
      else if (pct < 100) elStatus.textContent = 'Fase avançada de auditoria.';
      else elStatus.textContent = 'Auditado 100% — Selo Ouro!';
    }

    // Fallbacks para IDs legadas (se existirem)
    const dashPtsBar = document.getElementById('dashPtsBar');
    if (dashPtsBar) dashPtsBar.style.width = Math.min(pct, 100) + '%';
  },

  filter(type, tabEl) {
    document.querySelectorAll('#page-abj .tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    this.renderCards(type);
  },

  renderCards(filterType) {
    const grid = document.getElementById('abjGrid');
    if (!grid) return;

    let filtered = this.data;
    if (filterType !== 'todas') {
      filtered = this.data.filter(d => {
        if (filterType === 'concluidas') return d.status === 'concluida' || d.status === 'concluidas';
        return d.status === filterType;
      });
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="text-muted" style="padding: 2rem;">Nenhuma atividade nesta categoria.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      let stPill = '';
      let isDone = (item.status === 'concluida' || item.status === 'concluidas');
      
      if (item.status === 'pendente') stPill = `<span class="status-pill sp-pending"><div class="pill-dot" style="background:var(--red)"></div> Pendente</span>`;
      else if (item.status === 'verificacao') stPill = `<span class="status-pill sp-progress"><div class="pill-dot" style="background:var(--yellow)"></div> Em Revisão</span>`;
      else if (isDone) stPill = `<span class="status-pill sp-done"><div class="pill-dot" style="background:var(--green)"></div> Aprovada</span>`;

      return `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
          
          <div style="display:flex; justify-content: space-between; align-items: flex-start;">
            <div style="background: var(--w5); color: var(--w70); padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; border: 1px solid var(--border);">Ação #${item.numero}</div>
            ${stPill}
          </div>

          <div>
             <h3 style="font-family: var(--font-head); font-size: 16px; margin-bottom: 4px; color: var(--white);">${item.nome}</h3>
             <p style="font-size: 12px; color: var(--w40); line-height: 1.4;">${item.desc}</p>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--w70); margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);">
             <span>Pontos: <strong style="color:var(--orange)">${item.ptsMax}</strong></span>
             <span>Resp: <strong>${item.coord}</strong></span>
          </div>

          <div style="display:flex;gap:8px;margin-top:6px;">
            <button class="btn ${isDone ? 'btn-ghost' : 'btn-primary'}" style="${isDone ? 'border-color:transparent;color:var(--green);flex:1;' : 'flex:1;'}" onclick="ABJ.openModal(${item.id})">
              ${isDone ? '✓ Verificada' : 'Submeter Evidências'}
            </button>
            ${ABJ.isAdmin() && !isDone ? `
            <button class="btn btn-ghost" style="border-color:rgba(45,212,160,0.3);color:var(--green);white-space:nowrap;" title="Aprovar Diretamente (Admin)" onclick="ABJ.adminApprove(${item.id})">
              Admin ✓
            </button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  isAdmin() {
    if (typeof _appProfile !== 'undefined' && _appProfile?.role === 'admin') return true;
    return localStorage.getItem('mockSession') === 'jjoserrayan2711@gmail.com';
  },

  async adminApprove(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    if (!confirm(`Aprovar sumariamente a atividade "#${item.numero} — ${item.nome}" (${item.ptsMax} pts)?`)) return;

    item.status = 'concluida';
    item.currentPts = item.ptsMax;
    
    // Save to local
    this._statusMap[id] = 'concluida';
    localStorage.setItem('abj_status', JSON.stringify(this._statusMap));

    if (window._supabase) {
      await _sb.from('progresso_abj').upsert({
        atividade_id: item.id,
        pontos: item.ptsMax,
        status: 'concluida',
        aprovado_por: 'admin',
        updated_at: new Date().toISOString()
      }, { onConflict: 'atividade_id' }).catch(console.error);
    }

    ABJ.renderCards('todas');
    ABJ.updateHeader();
    App.toast(`✓ Atividade #${item.numero} provada (${item.ptsMax} pts)`, 'success');
  },

  openModal(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;
    if (item.status === 'concluida' || item.status === 'concluidas') {
       App.toast('Essa atividade já foi auditada e aprovada pela Coordenação Geral.', 'success');
       return;
    }

    // Modal Simulation (fallback since specific HTML modal for ABJ might be missing in dashboard.html)
    if (confirm(`Deseja submeter evidências e enviar a atividade #${item.numero} para Em Revisão?`)) {
       item.status = 'verificacao';
       this._statusMap[id] = 'verificacao';
       localStorage.setItem('abj_status', JSON.stringify(this._statusMap));
       
       if (window._supabase) {
         _sb.from('progresso_abj').upsert({
            atividade_id: id, status: 'verificacao', pontos: 0, updated_at: new Date().toISOString()
         }).catch(console.error);
       }
       
       ABJ.renderCards('todas');
       ABJ.updateHeader();
       App.toast('Evidência enviada para a Coordenadoria Geral!', 'success');
    }
  }
};

// Initialize after dashboard loads
setTimeout(() => {
  ABJ.init();
}, 800);
