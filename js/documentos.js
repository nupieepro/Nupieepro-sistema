'use strict';
/**
 * documentos.js — Motor de geração de documentos formais (PDF/Word)
 * Layout branded NUPIEEPRO: página branca, cabeçalho e rodapé oficiais,
 * reaproveitando o mesmo visual já usado nos Relatórios ABJ (js/relatorio.js).
 *
 * PDF: jsPDF (já carregado em dashboard.html).
 * Word: docx.js (dist/index.iife.js, expõe window.docx), mesmo padrão de
 * carregamento das outras libs do projeto.
 */
const DocumentosModule = (() => {
  const NAVY       = [15, 7, 50];
  const ORANGE     = [208, 84, 26];
  const NAVY_HEX   = '0F0732';
  const ORANGE_HEX = 'D0541A';
  const SLATE      = [100, 110, 130];

  function _dataAgora() {
    return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /* Desenha uma tabela simples (cabeçalho navy + linhas zebradas) e devolve
     o novo y. Usado por extratos/listagens (ex: Fluxo de Caixa). */
  function _desenharTabelaPDF(doc, { colunas, linhas, larguras }, y, W, M) {
    const cols = larguras || colunas.map(() => (W - M * 2) / colunas.length);
    const xs = []; let acc = M;
    cols.forEach(w => { xs.push(acc); acc += w; });
    const rowH = 7;
    function header(yy) {
      doc.setFillColor(...NAVY); doc.rect(M, yy - 5, W - M * 2, rowH, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      colunas.forEach((c, i) => doc.text(String(c), xs[i] + 2, yy));
      return yy + rowH;
    }
    y = header(y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    linhas.forEach((linha, idx) => {
      if (y > 275) { doc.addPage(); y = 20; y = header(y); }
      if (idx % 2 === 1) { doc.setFillColor(245, 246, 248); doc.rect(M, y - 5, W - M * 2, rowH, 'F'); }
      doc.setTextColor(40, 40, 55);
      linha.forEach((cell, i) => {
        const txt = doc.splitTextToSize(String(cell ?? ''), cols[i] - 4)[0] || '';
        doc.text(txt, xs[i] + 2, y);
      });
      y += rowH;
    });
    return y + 8;
  }

  /* ══════════════════════════════════════════
     PDF — página branca, cabeçalho azul-marinho + faixa laranja
  ══════════════════════════════════════════ */
  function gerarPDFFormal({ titulo, subtitulo, campos = [], secoes = [], tabela = null, geradoPor }) {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) { mostrarToast('jsPDF não carregado.', 'error'); return null; }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 20;

    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 42, 'F');
    doc.setFillColor(...ORANGE); doc.rect(0, 42, W, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24); doc.setFont('helvetica', 'bold');
    doc.text('NUPIEEPRO', M, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Núcleo Piauiense de Estudantes de Engenharia de Produção', M, 26);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(titulo, M, 36);

    let y = 56;
    if (subtitulo) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(...SLATE);
      doc.text(subtitulo, M, y); y += 10;
    }
    campos.forEach(([k, v]) => {
      if (!v) return;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(10);
      doc.text(String(k), M, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 80);
      const linhasV = doc.splitTextToSize(String(v), W - M - 48 - M);
      doc.text(linhasV, M + 48, y);
      y += Math.max(7, linhasV.length * 5.5);
    });
    y += 3;
    doc.setDrawColor(...ORANGE); doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y); y += 10;

    if (tabela?.linhas?.length) {
      if (y > 250) { doc.addPage(); y = 20; }
      y = _desenharTabelaPDF(doc, tabela, y, W, M);
    }

    secoes.forEach(s => {
      if (!s.corpo) return;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NAVY);
      doc.text(s.titulo, M, y); y += 8;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 80);
      const linhas = doc.splitTextToSize(String(s.corpo), W - M * 2);
      linhas.forEach(linha => {
        if (y > 278) { doc.addPage(); y = 20; }
        doc.text(linha, M, y); y += 5.2;
      });
      y += 8;
    });

    const pags = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pags; i++) {
      doc.setPage(i);
      doc.setFillColor(...NAVY); doc.rect(0, 285, W, 12, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`NUPIEEPRO — Sistema de Gestão · Gerado em ${_dataAgora()}${geradoPor ? ' por ' + geradoPor : ''}`, M, 292);
      doc.text(`Pág. ${i}/${pags}`, W - M, 292, { align: 'right' });
    }
    return doc;
  }

  /* ══════════════════════════════════════════
     WORD (.docx) — mesma identidade visual
  ══════════════════════════════════════════ */
  async function gerarWordFormal({ titulo, subtitulo, campos = [], secoes = [], tabela = null, geradoPor }) {
    if (!window.docx) { mostrarToast('Gerador de Word não carregado.', 'error'); return null; }
    const { Document, Paragraph, TextRun, AlignmentType, BorderStyle, Header, Footer, PageNumber, Packer,
            Table, TableRow, TableCell, WidthType } = window.docx;

    const children = [];
    children.push(new Paragraph({
      children: [new TextRun({ text: 'NUPIEEPRO', bold: true, size: 44, color: NAVY_HEX })],
      spacing: { after: 40 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Núcleo Piauiense de Estudantes de Engenharia de Produção', size: 18, italics: true, color: '646E82' })],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, size: 32, color: NAVY_HEX })],
      spacing: { after: subtitulo ? 80 : 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE_HEX, space: 8 } },
    }));
    if (subtitulo) {
      children.push(new Paragraph({
        children: [new TextRun({ text: subtitulo, italics: true, size: 22, color: '646E82' })],
        spacing: { after: 240 },
      }));
    }
    campos.forEach(([k, v]) => {
      if (!v) return;
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${k}  `, bold: true, size: 20, color: NAVY_HEX }),
          new TextRun({ text: String(v), size: 20, color: '3C3C50' }),
        ],
        spacing: { after: 100 },
      }));
    });
    if (tabela?.linhas?.length) {
      const headerRow = new TableRow({
        children: tabela.colunas.map(c => new TableCell({
          shading: { fill: NAVY_HEX },
          children: [new Paragraph({ children: [new TextRun({ text: String(c), bold: true, color: 'FFFFFF', size: 18 })] })],
        })),
      });
      const bodyRows = tabela.linhas.map((linha, idx) => new TableRow({
        children: linha.map(cell => new TableCell({
          shading: idx % 2 === 1 ? { fill: 'F5F6F8' } : undefined,
          children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ''), size: 18, color: '3C3C50' })] })],
        })),
      }));
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }));
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }

    secoes.forEach(s => {
      if (!s.corpo) return;
      children.push(new Paragraph({
        children: [new TextRun({ text: s.titulo, bold: true, size: 26, color: NAVY_HEX })],
        spacing: { before: 280, after: 120 },
      }));
      String(s.corpo).split('\n').forEach(linha => {
        children.push(new Paragraph({
          children: [new TextRun({ text: linha || ' ', size: 20, color: '3C3C50' })],
          spacing: { after: 80 },
        }));
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'NUPIEEPRO — Sistema de Gestão', size: 16, color: '9AA3B8' })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Gerado em ${_dataAgora()}${geradoPor ? ' por ' + geradoPor : ''} · Pág. `, size: 16, color: '9AA3B8' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9AA3B8' }),
                new TextRun({ text: ' de ', size: 16, color: '9AA3B8' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9AA3B8' }),
              ],
            })],
          }),
        },
        children,
      }],
    });
    return await Packer.toBlob(doc);
  }

  function baixarBlob(blob, filename) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { gerarPDFFormal, gerarWordFormal, baixarBlob };
})();
window.DocumentosModule = DocumentosModule;
