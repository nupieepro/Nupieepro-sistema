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

/* Telefone BR opcional: aceita com/sem DDD formatado, devolve só os dígitos
   (10 ou 11, sem +55) ou null se vazio; lança erro de texto se inválido. */
function normalizarTelefone(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  let d = v.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) {
    throw new Error('Telefone inválido. Use DDD + número, ex: (86) 91234-5678.');
  }
  return d;
}

/* Iniciais (até 2 letras) a partir do nome: primeira + última palavra. */
function iniciaisDe(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const ini = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return ini.toUpperCase();
}

window.senhaForte = senhaForte;
window.normalizarTelefone = normalizarTelefone;
window.iniciaisDe = iniciaisDe;

/* Exporta como CommonJS quando rodando em Node (testes) — não afeta o
   navegador, onde `module` não existe e este bloco nunca executa. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { senhaForte, normalizarTelefone, iniciaisDe };
}
