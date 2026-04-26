'use strict';
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const RelatorioModule = (() => {
  function _statusPrazo(mes, ano) {
    const hoje = new Date();
    const ultimo = new Date(ano, mes, 0); 
    const terceiro = new Date(ano, mes, 3);
    if (hoje <= ultimo)   return { pts: 10, label: '✅ No prazo (10 pts)', cor: 'var(--green)' };
    if (hoje <= terceiro) return { pts: 8,  label: '⚠️ Atrasado (8 pts − 2)', cor: 'var(--yellow)' };
    return                       { pts: 0,  label: '❌ Fora do prazo (0 pts)', cor: 'var(--red)' };
  }
  async function gerarPDF(rel) {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) { mostrarToast('jsPDF não carregado.', 'error'); return null; }
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const W = 210, M = 20;
    const azul   = [41, 50, 79];
    const laranja = [247, 84, 18];
    const cinza  = [100, 110, 130];
    doc.setFillColor(...azul);
    doc.rect(0, 0, W, 42, 'F');
    doc.setFillColor(...laranja);
    doc.rect(0, 42, W, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(24); doc.setFont('helvetica','bold');
    doc.text('NUPIEEPRO', M, 18);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Núcleo Piauiense de Estudantes de Engenharia de Produção', M, 26);
    doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text(`Relatório Mensal — ${MESES_PT[rel.mes-1]} ${rel.ano}`, M, 36);
    let y = 56;
    const prazo = _statusPrazo(rel.mes, rel.ano);
    [
      ['Mês de referência:', `${MESES_PT[rel.mes-1]} ${rel.ano}`],
      ['Gerado em:', new Date().toLocaleDateString('pt-BR',{dateStyle:'long'})],
      ['Status do prazo:', prazo.label],
      ['Responsável:', rel.responsavel || 'Coordenadoria de Operações'],
    ].forEach(([k,v]) => {
      doc.setFont('helvetica','bold'); doc.setTextColor(...azul); doc.setFontSize(10);
      doc.text(k, M, y);
      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,80);
      doc.text(v, M+46, y); y += 7;
    });
    y += 3;
    doc.setDrawColor(...laranja); doc.setLineWidth(0.5);
    doc.line(M, y, W-M, y); y += 8;
    if (rel.total_vendas || rel.total_despesas) {
      doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...azul);
      doc.text('Resumo Financeiro do Mês', M, y); y += 8;
      doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(60,60,80);
      doc.text(`Vendas: R$ ${(rel.total_vendas||0).toFixed(2)}`, M, y); y += 6;
      doc.text(`Despesas: R$ ${(rel.total_despesas||0).toFixed(2)}`, M, y); y += 6;
      doc.text(`Saldo: R$ ${((rel.total_vendas||0)-(rel.total_despesas||0)).toFixed(2)}`, M, y); y += 12;
    }
    if (rel.observacoes) {
      doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...azul);
      doc.text('Atividades Realizadas', M, y); y += 8;
      doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(60,60,80);
      const linhas = doc.splitTextToSize(rel.observacoes, W-M*2);
      doc.text(linhas, M, y); y += linhas.length * 5 + 8;
    }
    if (rel.atividades_abj?.length) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...azul);
      doc.text('Atividades ABJ Registradas', M, y); y += 8;
      rel.atividades_abj.forEach(a => {
        if (y > 270) { doc.addPage(); y = 20; }
        const cor = a.status === 'concluido' ? [34,197,94] : a.status === 'em_andamento' ? [234,179,8] : [156,163,175];
        doc.setFillColor(...cor); doc.circle(M+2, y-1.5, 2, 'F');
        doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(60,60,80);
        doc.text(`${a.nome} — ${a.status}`, M+7, y); y += 6;
      });
    }
    const pags = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pags; i++) {
      doc.setPage(i);
      doc.setFillColor(...azul); doc.rect(0,285,W,12,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text('NUPIEEPRO — Sistema de Gestão 2026', M, 292);
      doc.text(`Pág. ${i}/${pags}`, W-M, 292, { align:'right' });
    }
    return doc;
  }
  function renderPagina() {
    const pg = document.getElementById('page-ops_relatorios');
    if (!pg) return;
    const ct = pg.querySelector('.content') || pg;
    ct.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;padding:20px">
        <div class="section-card" style="padding:20px 24px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px">
            <div>
              <h2 style="font-family:var(--f-head);font-size:18px;font-weight:800;color:var(--c-white);margin-bottom:4px">
                📋 Relatórios Mensais
              </h2>
              <p style="font-size:13px;color:var(--c-slate)">
                Atividade 18 do Selo ABJ — 10 pts/mês · ⭐ 5ª Estrela
              </p>
            </div>
            <button class="btn btn-primary" onclick="RelatorioModule.abrirFormulario()">
              + Novo relatório
            </button>
          </div>
          <div style="background:var(--yellow-dim);border:1px solid var(--yellow-border);border-radius:10px;padding:12px 16px">
            <div style="font-size:12px;color:var(--yellow);font-weight:600">
              ⏰ No prazo: 10 pts &nbsp;|&nbsp; Até 3º dia seguinte: 8 pts &nbsp;|&nbsp; Após isso: 0 pts
            </div>
          </div>
        </div>
        <div class="section-card" style="padding:20px 24px">
          <div id="rel-lista">
            <div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Carregando...</div>
          </div>
        </div>
      </div>`;
    _carregar();
  }
  async function _carregar() {
    const el = document.getElementById('rel-lista');
    if (!el || !window._supabase) return;
    try {
      const { data } = await window._supabase
        .from('relatorios_mensais')
        .select('*, coordenadorias(nome)')
        .order('ano', { ascending:false })
        .order('mes', { ascending:false })
        .limit(12);
      el.innerHTML = data?.length
        ? data.map(r => {
            const prazo = _statusPrazo(r.mes, r.ano);
            return `
              <div style="background:var(--b-1);border:1px solid var(--b-2);border-radius:12px;
                          padding:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:14px;color:var(--c-white);margin-bottom:4px">
                    📋 ${MESES_PT[r.mes-1]} ${r.ano}
                  </div>
                  <div style="font-size:12px;color:var(--c-slate)">
                    Pontos ABJ: <b style="color:var(--c-accent)">${r.pontos_abj||0} pts</b>
                    &nbsp;·&nbsp; ${r.coordenadorias?.nome||'—'}
                  </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;
                               background:${prazo.cor}22;color:${prazo.cor};border:1px solid ${prazo.cor}44">
                    ${prazo.label}
                  </span>
                  <button class="btn btn-ghost" style="font-size:12px"
                    onclick="RelatorioModule.baixarPDF('${r.id}')">⬇ PDF</button>
                </div>
              </div>`;
          }).join('')
        : '<div style="padding:20px;text-align:center;color:var(--c-slate);font-size:13px">Nenhum relatório ainda.</div>';
    } catch(e) {
      el.innerHTML = '<div style="padding:16px;color:var(--c-slate)">Erro ao carregar.</div>';
    }
  }
  function abrirFormulario() {
    const agora = new Date();
    const mesAtual = agora.getMonth(); 
    abrirModal({ titulo:'📋 Novo Relatório Mensal', tipo:'info', corpo:`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Mês *</label>
          <select id="r-mes" class="form-select">
            ${MESES_PT.map((m,i)=>`<option value="${i+1}"${i===mesAtual?' selected':''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ano *</label>
          <input id="r-ano" type="number" class="form-input" value="${agora.getFullYear()}" min="2024" max="2030">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Atividades realizadas *</label>
        <textarea id="r-obs" class="evidence-textarea" style="min-height:130px"
          placeholder="Descreva as atividades realizadas: reuniões, eventos, publicações, treinamentos..."></textarea>
      </div>
      <div style="background:var(--a-1);border:1px solid var(--b-a);border-radius:8px;padding:10px;font-size:12px;color:var(--c-slate)">
        💡 Após salvar, o PDF é gerado e baixado automaticamente.
      </div>`,
    botoes:[
      { texto:'Cancelar', classe:'btn-ghost', acao: fecharModal },
      { texto:'Salvar e gerar PDF ✓', classe:'btn-primary', acao: ()=>_salvar() }
    ]});
  }
  async function _salvar() {
    const mes  = parseInt(document.getElementById('r-mes')?.value);
    const ano  = parseInt(document.getElementById('r-ano')?.value);
    const obs  = document.getElementById('r-obs')?.value?.trim();
    if (!obs) { mostrarToast('Descreve as atividades!', 'warning'); return; }
    fecharModal();
    mostrarToast('Salvando e gerando PDF...', 'info', 2500);
    let totalVendas = 0, totalDespesas = 0, totalEventos = 0, pontosAbj = 0;
    let atvsAbj = [];
    if (window._supabase) {
      try {
        const mesStr = `${ano}-${String(mes).padStart(2,'0')}`;
        const [rv, rd, re, rp] = await Promise.all([
          window._supabase.from('vendas').select('valor').gte('data_venda', mesStr+'-01').lt('data_venda', mesStr+'-32'),
          window._supabase.from('despesas').select('valor').gte('data_despesa', mesStr+'-01').lt('data_despesa', mesStr+'-32'),
          window._supabase.from('eventos').select('id', {count:'exact',head:true}).gte('data_inicio', mesStr+'-01T00:00:00'),
          window._supabase.from('progresso_abj').select('pontos, status, atividades_abj(nome)')
        ]);
        totalVendas   = (rv.data||[]).reduce((s,v)=>s+Number(v.valor||0),0);
        totalDespesas = (rd.data||[]).reduce((s,d)=>s+Number(d.valor||0),0);
        totalEventos  = re.count || 0;
        pontosAbj     = (rp.data||[]).reduce((s,p)=>s+(p.pontos||0),0);
        atvsAbj       = (rp.data||[]).map(p=>({nome:p.atividades_abj?.nome||'—',status:p.status}));
      } catch(e) { console.warn('[Relatorio] Totais:', e.message); }
      try {
        const coords = await getCoords();
        const ops = coords.find(c=>c.sigla==='OPS');
        await window._supabase.from('relatorios_mensais').insert([{
          mes, ano, observacoes: obs,
          total_vendas: totalVendas,
          total_despesas: totalDespesas,
          total_eventos: totalEventos,
          pontos_abj: pontosAbj,
          coordenadoria_id: ops?.id || null,
          gerado_por: window._appProfile?.id
        }]);
      } catch(e) { console.warn('[Relatorio] Insert:', e.message); }
    }
    try {
      const doc = await gerarPDF({
        mes, ano, observacoes: obs,
        total_vendas: totalVendas, total_despesas: totalDespesas,
        responsavel: window._appProfile?.nome || 'Coordenadoria de Operações',
        atividades_abj: atvsAbj
      });
      if (doc) doc.save(`NUPIEEPRO_Relatorio_${MESES_PT[mes-1]}_${ano}.pdf`);
    } catch(e) { console.warn('[PDF]', e); }
    mostrarToast(`Relatório de ${MESES_PT[mes-1]} salvo! PDF gerado. ✅`, 'success');
    _carregar();
  }
  async function baixarPDF(id) {
    if (!window._supabase) return;
    mostrarToast('Carregando...', 'info', 1500);
    try {
      const { data } = await window._supabase
        .from('relatorios_mensais').select('*').eq('id', id).single();
      if (!data) { mostrarToast('Não encontrado.', 'error'); return; }
      const doc = await gerarPDF({
        mes: data.mes, ano: data.ano, observacoes: data.observacoes,
        total_vendas: data.total_vendas, total_despesas: data.total_despesas
      });
      if (doc) doc.save(`NUPIEEPRO_Relatorio_${MESES_PT[data.mes-1]}_${data.ano}.pdf`);
    } catch(e) { mostrarToast('Erro ao gerar PDF.', 'error'); }
  }
  return { renderPagina, abrirFormulario, baixarPDF };
})();
window.RelatorioModule = RelatorioModule;
