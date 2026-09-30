'use strict';
/**
 * Testes de js/validacao.js — senha usada no cadastro (convite.html) e na
 * redefinição (reset.html). Antes eram dois blocos de checagem duplicados
 * e um deles ficava desatualizado; agora é uma função só, testada aqui.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
const { senhaForte } = require('../js/validacao.js');

test('rejeita senha curta', () => {
  assert.match(senhaForte('abc123'), /8 caracteres/);
  assert.match(senhaForte('a1234567'.slice(0, 7)), /8 caracteres/);
});

test('rejeita senha vazia ou indefinida', () => {
  assert.match(senhaForte(''), /8 caracteres/);
  assert.match(senhaForte(undefined), /8 caracteres/);
});

test('rejeita senha só com letras', () => {
  assert.match(senhaForte('abcdefgh'), /letras e números/);
});

test('rejeita senha só com números', () => {
  assert.match(senhaForte('12345678'), /letras e números/);
});

test('aceita senha com 8+ caracteres, letras e números', () => {
  assert.equal(senhaForte('abc12345'), null);
  assert.equal(senhaForte('Nupi2026!'), null);
});

test('exatamente 8 caracteres com letra e número é o limite aceito', () => {
  assert.equal(senhaForte('a1234567'), null);
});

const { iniciaisDe, camposPerfilFaltando } = require('../js/validacao.js');

test('iniciais: primeira + última palavra, maiúsculas', () => {
  assert.equal(iniciaisDe('Lilian Freitas'), 'LF');
  assert.equal(iniciaisDe('maria da silva souza'), 'MS');
  assert.equal(iniciaisDe('Rayan'), 'RA');
  assert.equal(iniciaisDe('  '), '');
});

test('perfil completo não tem campos faltando', () => {
  assert.deepEqual(camposPerfilFaltando({ nome: 'Ana Lima', apelido: 'Ana', aniversario: '2000-05-10' }), []);
});

test('perfil sem apelido/aniversário (ou só espaços) é incompleto', () => {
  assert.deepEqual(camposPerfilFaltando({ nome: 'Ana', apelido: null, aniversario: null }), ['apelido', 'data de aniversário']);
  assert.deepEqual(camposPerfilFaltando({ nome: 'Ana', apelido: '   ', aniversario: '2000-05-10' }), ['apelido']);
  assert.deepEqual(camposPerfilFaltando(null), ['nome', 'apelido', 'data de aniversário']);
});
