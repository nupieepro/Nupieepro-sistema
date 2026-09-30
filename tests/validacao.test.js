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

const { CATEGORIAS_FIN, validarLancamento, chaveCategoriaEvento } = require('../js/validacao.js');
const HOJE = '2026-09-30T12:00:00';
const despesaOk = { tipo: 'despesa', descricao: 'Banner', valor: 120.5, data: '2026-09-30', categoria: 'Eventos', solicitante: 'coord-id' };

test('categorias oficiais incluem as pedidas pelo Financeiro', () => {
  ['Lojinha', 'Eventos', 'Premiações'].forEach(c => assert.ok(CATEGORIAS_FIN.includes(c)));
});

test('despesa válida passa', () => {
  assert.equal(validarLancamento(despesaOk, HOJE), null);
});

test('despesa exige categoria e coordenadoria solicitante', () => {
  assert.match(validarLancamento({ ...despesaOk, categoria: '' }, HOJE), /categoria/i);
  assert.match(validarLancamento({ ...despesaOk, solicitante: '' }, HOJE), /solicitou/i);
});

test('venda não exige solicitante, mas valida quantidade', () => {
  const venda = { tipo: 'venda', descricao: 'Camiseta', valor: 50, data: '2026-09-30', quantidade: 2 };
  assert.equal(validarLancamento(venda, HOJE), null);
  assert.match(validarLancamento({ ...venda, quantidade: 0 }, HOJE), /Quantidade/);
  assert.match(validarLancamento({ ...venda, quantidade: 1.5 }, HOJE), /Quantidade/);
});

test('rejeita valor zero, negativo, NaN, gigante e com 3 casas', () => {
  [0, -5, NaN, undefined].forEach(v => assert.match(validarLancamento({ ...despesaOk, valor: v }, HOJE), /valor/i));
  assert.match(validarLancamento({ ...despesaOk, valor: 1e9 }, HOJE), /limite/);
  assert.match(validarLancamento({ ...despesaOk, valor: 10.123 }, HOJE), /casas decimais/);
});

test('rejeita descrição vazia/longa e data inválida ou absurda', () => {
  assert.match(validarLancamento({ ...despesaOk, descricao: '  ' }, HOJE), /descrição/i);
  assert.match(validarLancamento({ ...despesaOk, descricao: 'x'.repeat(201) }, HOJE), /longa/);
  assert.match(validarLancamento({ ...despesaOk, data: '' }, HOJE), /data/i);
  assert.match(validarLancamento({ ...despesaOk, data: '2026-13-45' }, HOJE), /data/i);
  assert.match(validarLancamento({ ...despesaOk, data: '2031-01-01' }, HOJE), /futuro/);
  assert.match(validarLancamento({ ...despesaOk, data: '2019-01-01' }, HOJE), /ano/);
});

test('agrupamento: evento tem prioridade, senão categoria (dados antigos)', () => {
  assert.equal(chaveCategoriaEvento({ evento: 'Bottom Up 7.0', categoria: 'Eventos' }), 'Bottom Up 7.0');
  assert.equal(chaveCategoriaEvento({ evento: null, categoria: 'Bottom Up' }), 'Bottom Up');
  assert.equal(chaveCategoriaEvento({}), '');
});

const { detectarSeparadorCSV } = require('../js/validacao.js');

test('CSV brasileiro (;) com vírgula decimal usa ; como separador', () => {
  assert.equal(detectarSeparadorCSV('Data;Descricao;Valor\n10/09/2026;Item;-45,90'), ';');
});

test('CSV padrão (,) continua usando vírgula', () => {
  assert.equal(detectarSeparadorCSV('Data,Descricao,Valor\n2026-09-10,Item,45.90'), ',');
});

test('separador dentro de aspas no cabeçalho não conta', () => {
  assert.equal(detectarSeparadorCSV('"Nome; completo",Valor,Data\nAna,1,2026-09-10'), ',');
  assert.equal(detectarSeparadorCSV(''), ',');
});

test('valor legítimo perto do teto não é rejeitado por erro de ponto flutuante', () => {
  assert.equal(validarLancamento({ ...despesaOk, valor: 99999999.99 }, HOJE), null);
  assert.equal(validarLancamento({ ...despesaOk, valor: 12345678.91 }, HOJE), null);
  assert.equal(validarLancamento({ ...despesaOk, valor: 0.1 + 0.2 }, HOJE) !== null, true, '0.30000000000000004 tem mais de 2 casas');
});

test('data impossível (31/02) é rejeitada', () => {
  assert.match(validarLancamento({ ...despesaOk, data: '2026-02-31' }, HOJE), /data/i);
});

test('edição de lançamento legado: pode ignorar só as regras de data e o solicitante ausente', () => {
  const antiga = { ...despesaOk, data: '2018-03-05', solicitante: '' };
  assert.match(validarLancamento(antiga, HOJE), /ano|solicitou/);
  assert.equal(validarLancamento(antiga, HOJE, { ignorarRegrasDeData: true, solicitanteOpcional: true }), null);
  assert.match(validarLancamento({ ...antiga, valor: 0 }, HOJE, { ignorarRegrasDeData: true, solicitanteOpcional: true }), /valor/i);
});
