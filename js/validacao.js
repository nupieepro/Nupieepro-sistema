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

window.senhaForte = senhaForte;
window.iniciaisDe = iniciaisDe;
window.camposPerfilFaltando = camposPerfilFaltando;

/* Exporta como CommonJS quando rodando em Node (testes) — não afeta o
   navegador, onde `module` não existe e este bloco nunca executa. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { senhaForte, iniciaisDe, camposPerfilFaltando };
}
