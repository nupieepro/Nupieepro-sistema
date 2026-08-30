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

window.senhaForte = senhaForte;

/* Exporta como CommonJS quando rodando em Node (testes) — não afeta o
   navegador, onde `module` não existe e este bloco nunca executa. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { senhaForte };
}
