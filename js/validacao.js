'use strict';
/**
 * validacao.js — Validações compartilhadas entre telas de cadastro/senha
 * (convite.html via js/auth.js, e reset.html, que não carrega auth.js).
 */

/* Devolve null se a senha é forte o bastante, ou a mensagem de erro. */
function senhaForte(pw) {
  if (!pw || pw.length < 8) return 'Senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Senha deve ter letras e números.';
  return null;
}

/* Iniciais (até 2 letras) a partir do nome: primeira + última palavra. */
function iniciaisDe(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const ini = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return ini.toUpperCase();
}

/* Campos obrigatórios do perfil. Devolve a lista de rótulos que faltam
   (vazia = perfil completo). Usada pra travar o dashboard até concluir. */
function camposPerfilFaltando(p) {
  const falta = [];
  if (!p || !String(p.nome || '').trim()) falta.push('nome');
  if (!p || !String(p.apelido || '').trim()) falta.push('apelido');
  if (!p || !p.aniversario) falta.push('data de aniversário');
  return falta;
}

/* ── Financeiro ─────────────────────────────────────────────── */

/* Lista oficial de categorias dos lançamentos (vendas e despesas). Dados
   antigos com outro texto (ex: "Bottom Up", "Evento") continuam válidos e
   aparecem como opção extra ao editar — nada é reescrito no banco. */
const CATEGORIAS_FIN = ['Lojinha', 'Eventos', 'Premiações', 'Marketing', 'Operacional', 'Outros'];

/* numeric(10,2) no banco → teto de 99.999.999,99. */
const VALOR_MAX_FIN = 99999999.99;

/* Validação de um lançamento (venda ou despesa). Devolve null se ok, ou a
   mensagem de erro. `dados`: { tipo, descricao, valor, data, categoria,
   solicitante, quantidade }. Despesa exige categoria e coordenadoria
   solicitante; venda exige quantidade inteira >= 1. */
function validarLancamento(dados, hoje, opcoes) {
  const d = dados || {};
  const op = opcoes || {};
  if (!String(d.descricao || '').trim()) return 'Informe a descrição.';
  if (String(d.descricao).trim().length > 200) return 'Descrição muito longa (máx. 200 caracteres).';
  const v = Number(d.valor);
  if (!isFinite(v) || v <= 0) return 'Informe um valor maior que zero.';
  if (v > VALOR_MAX_FIN) return 'Valor acima do limite permitido.';
  /* toFixed(2) em vez de tolerância absoluta: perto do teto (~1e8) o erro de
     ponto flutuante de v*100 passa de 1e-6 e recusaria valores legítimos. */
  if (Number(v.toFixed(2)) !== v) return 'Use no máximo 2 casas decimais no valor.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data || ''))) return 'Informe uma data válida.';
  const dt = new Date(d.data + 'T12:00:00');
  if (isNaN(dt) || dt.toISOString().slice(0, 10) !== d.data) return 'Informe uma data válida.';
  /* op.ignorarRegrasDeData: edição de lançamento antigo em que a data NÃO foi
     mexida — não trava a correção de uma descrição por causa de data legada. */
  if (!op.ignorarRegrasDeData) {
    const ref = hoje ? new Date(hoje) : new Date();
    const limite = new Date(ref); limite.setFullYear(limite.getFullYear() + 1);
    if (dt > limite) return 'A data está mais de 1 ano no futuro. Confira.';
    if (dt.getFullYear() < 2020) return 'A data parece errada. Confira o ano.';
  }
  if (d.tipo === 'despesa') {
    if (!String(d.categoria || '').trim()) return 'Selecione a categoria da despesa.';
    if (!d.solicitante && !op.solicitanteOpcional) return 'Selecione a coordenadoria que solicitou o valor.';
  }
  if (d.tipo === 'venda' && d.quantidade != null) {
    const q = Number(d.quantidade);
    if (!Number.isInteger(q) || q < 1 || q > 100000) return 'Quantidade deve ser um número inteiro maior que zero.';
  }
  return null;
}

/* Chave de agrupamento dos indicadores: o evento, quando informado; senão a
   categoria (mantém compatível com lançamentos antigos, que usavam a
   categoria pra guardar o nome do evento). */
function chaveCategoriaEvento(r) {
  return String((r && (r.evento || r.categoria)) || '').trim();
}

/* Separador de CSV, decidido pela linha de cabeçalho. Exportação brasileira
   (Excel pt-BR) usa ";" e vírgula como decimal ("45,90"); tratar "," e ";"
   como separadores ao mesmo tempo quebrava "45,90" em dois campos e gravava
   o valor errado (45) sem avisar. Fora das aspas: vence o que aparecer mais. */
function detectarSeparadorCSV(texto) {
  const cab = String(texto || '').split('\n')[0] || '';
  let emAspas = false, v = 0, pv = 0;
  for (const c of cab) {
    if (c === '"') emAspas = !emAspas;
    else if (!emAspas && c === ',') v++;
    else if (!emAspas && c === ';') pv++;
  }
  return pv > v ? ';' : ',';
}

window.senhaForte = senhaForte;
window.iniciaisDe = iniciaisDe;
window.camposPerfilFaltando = camposPerfilFaltando;
window.CATEGORIAS_FIN = CATEGORIAS_FIN;
window.validarLancamento = validarLancamento;
window.chaveCategoriaEvento = chaveCategoriaEvento;
window.detectarSeparadorCSV = detectarSeparadorCSV;

/* Exporta como CommonJS quando rodando em Node (testes) — não afeta o
   navegador, onde `module` não existe e este bloco nunca executa. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { senhaForte, iniciaisDe, camposPerfilFaltando, CATEGORIAS_FIN, validarLancamento, chaveCategoriaEvento, detectarSeparadorCSV };
}
