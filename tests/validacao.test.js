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
