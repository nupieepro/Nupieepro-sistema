/* ============================================================
   NUPIEEPRO — FASE 2: Selo ABJ Lógica
   ============================================================ */

const MOCK_ABJ = [
  { id: 1, numero: 1, nome: "Nome e Logomarca", coord: "Geral", prazo: "Mensal", ptsMax: 3, currentPts: 3, status: 'concluida', color: 'green', desc: "Logo aprovada e nome registrado na ABJ." },
  { id: 2, numero: 2, nome: "Missão, Visão e Valores", coord: "Geral", prazo: "Mensal", ptsMax: 5, currentPts: 0, status: 'pendente', color: 'green', desc: "MVV redigido e publicado." },
  { id: 5, numero: 5, nome: "Apresentação ABJ / Núcleo", coord: "Núcleo", prazo: "Mensal", ptsMax: 4, currentPts: 0, status: 'pendente', color: 'yellow', desc: "Membros treinados." },
  { id: 8, numero: 8, nome: "Reunião Geral de Núcleos", coord: "Núcleo", prazo: "Mensal", ptsMax: 5, currentPts: 5, status: 'verificacao', color: 'green', desc: "Lista de presença, ATA e Foto." },
  { id: 9, numero: 9, nome: "Rede Social Ativa", coord: "Marketing", prazo: "Mensal", ptsMax: 3, currentPts: 0, status: 'pendente', color: 'green', desc: "Post publicado via marketing." },
  { id: 10, numero: 10, nome: "Núcleo associado à ABEPRO", coord: "Finanças", prazo: "Jul", ptsMax: 10, currentPts: 0, status: 'pendente', color: 'yellow', desc: "Pagamento e filiação atual." },
  { id: 13, numero: 13, nome: "Evento Estadual", coord: "Projetos", prazo: "Ago", ptsMax: 20, currentPts: 0, status: 'pendente', color: 'yellow', desc: "Participar do evento estadual oficial." },
  { id: 18, numero: 18, nome: "Relatório Mensal", coord: "Operações", prazo: "Mensal", ptsMax: 10, currentPts: 10, status: 'concluida', color: 'red', desc: "PDF enviado até dia 5." },
];

const ABJ = {
  data: [],
  
  async init() {
    // If Supabase is connected, fetch from 'atividades_abj', otherwise use mock.
    if (_sb) {
      const { data, error } = await _sb.from('atividades_abj').select('*').order('numero');
      if (!error && data) {
        this.data = data.map(d => ({
          ...d,
          ptsMax: d.pontos_max || d.pontos_por_entrada,
          currentPts: 0, 
          status: 'pendente',
          color: d.prazo_cor || 'gray',
          desc: d.descricao
        }));
      }
    } else {
      this.data = MOCK_ABJ;
    }
    
    this.renderCards('todas');
    this.updateHeader();
  },

  updateHeader() {
    const totalPts = this.data.reduce((sum, item) => sum + (item.status === 'concluida' ? item.currentPts : 0), 0);
    const dashPts = document.getElementById('dashPts');
    if (dashPts) dashPts.textContent = totalPts;
    
    const abjHeaderPts = document.getElementById('abjHeaderPts');
    if (abjHeaderPts) abjHeaderPts.textContent = totalPts;
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
      filtered = this.data.filter(d => d.status === filterType);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="text-muted" style="padding: 2rem;">Nenhuma atividade nesta categoria.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      let stPill = '';
      if (item.status === 'pendente') stPill = `<span class="status-pill sp-pending"><div class="pill-dot"></div> Pendente</span>`;
      else if (item.status === 'verificacao') stPill = `<span class="status-pill sp-progress"><div class="pill-dot"></div> Em Revisão Geral</span>`;
      else if (item.status === 'concluidas' || item.status === 'concluida') stPill = `<span class="status-pill sp-done"><div class="pill-dot"></div> Aprovado</span>`;

      return `
        <div style="background: var(--navy-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
          
          <div style="display:flex; justify-content: space-between; align-items: flex-start;">
            <div style="background: var(--${item.color}-dim); color: var(--${item.color}); padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11px;">#${item.numero}</div>
            ${stPill}
          </div>

          <div>
             <h3 style="font-family: 'Syne', sans-serif; font-size: 16px; margin-bottom: 4px;">${item.nome}</h3>
             <p style="font-size: 12px; color: var(--w40); line-height: 1.4;">${item.desc}</p>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--w70); margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border);">
             <span>Prazo: <strong>${item.prazo}</strong></span>
             <span>Resp: <strong>${item.coord || item.coord_responsavel}</strong></span>
          </div>

          <div style="display:flex;gap:8px;margin-top:6px;">
            <button class="btn ${item.status === 'concluida' ? 'btn-ghost' : 'btn-primary'}" style="flex:1;" onclick="ABJ.openModal(${item.id})">
              ${item.status === 'concluida' ? '✓ Aprovada' : 'Submeter Evidências'}
            </button>
            ${ABJ.isAdmin() && item.status !== 'concluida' ? `
            <button class="btn btn-ghost" style="border-color:var(--green-border);color:var(--green);white-space:nowrap;" title="Marcar como concluída (Admin)" onclick="ABJ.adminApprove(${item.id})">
              ✓ Admin
            </button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  isAdmin() {
    // Verifica perfil em memória (definido no initDashboard)
    if (typeof _appProfile !== 'undefined' && _appProfile?.role === 'admin') return true;
    // Fallback: mock session
    const mock = localStorage.getItem('mockSession');
    return mock === 'jjoserrayan2711@gmail.com';
  },

  async adminApprove(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    const pts = item.ptsMax || item.pontos_max || 0;
    const ok = confirm(`Marcar "#${item.numero} — ${item.nome}" como CONCLUÍDA (${pts} pts)?\n\nAção direta de administrador — sem envio de evidência.`);
    if (!ok) return;

    item.status = 'concluida';
    item.currentPts = pts;

    if (_sb) {
      // Atualiza no Supabase se disponível
      await _sb.from('progresso_abj').upsert({
        atividade_id: item.id,
        pontos: pts,
        status: 'concluida',
        aprovado_por: 'admin',
        updated_at: new Date().toISOString()
      }, { onConflict: 'atividade_id' }).catch(console.error);
    }

    ABJ.renderCards('todas');
    ABJ.updateHeader();
    App.toast(`✓ Atividade #${item.numero} marcada como concluída (${pts} pts)`, 'success');
  },

  openModal(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    // Se já foi aprovado e o Dev Chefe quiser apenas ver
    if (item.status === 'concluida') {
       App.toast('Essa atividade já foi auditada e aprovada pela Coord. Geral.', 'success');
       return;
    }

    App.toast(`Abrindo envio da atividade: ${item.nome}`, 'info');
    // MOCKUP DO UPLOAD
    setTimeout(() => {
       const res = confirm(`Submeter evidências (foto/PDF) para a atividade #${item.numero}?`);
       if (res) {
         item.status = 'verificacao';
         ABJ.renderCards('todas');
         ABJ.updateHeader();
         App.toast('Evidência enviada para a Coordenadoria Geral!', 'success');
       }
    }, 500);
  }
};

// Initialize after dashboard loads
setTimeout(() => {
  ABJ.init();
}, 1000);
