'use strict';
/**
 * Testes de js/permissoes.js — REGRAS (prazos e bloqueios do Regimento).
 * Usa o mock de timers nativo do Node pra controlar "hoje" com precisão —
 * essas regras são só cálculo de datas, então sem isso os testes ficariam
 * reféns do dia em que rodam (e alguns bugs só aparecem em certos dias
 * do mês, como o próprio bug do relatório ABJ mostrou).
 */
const test = require('node:test');
const assert = require('node:assert/strict');

global.window = { ROLE_PAGES: {}, GLOBAL_PAGES: [], _appProfile: null };
const Permissoes = require('../js/permissoes.js');
const { REGRAS } = Permissoes;

function comHojeFixo(t, isoString, fn) {
  t.mock.timers.enable({ apis: ['Date'] });
  t.mock.timers.setTime(new Date(isoString).getTime());
  fn();
}

/* ── alertaCalendario60Dias ── */
test('alertaCalendario60Dias: evento a 73 dias não bloqueia', (t) => {
  comHojeFixo(t, '2026-01-01T12:00:00', () => {
    const r = REGRAS.alertaCalendario60Dias('2026-03-15');
    assert.equal(r.bloqueado, false);
  });
});

test('alertaCalendario60Dias: evento a 19 dias bloqueia', (t) => {
  comHojeFixo(t, '2026-01-01T12:00:00', () => {
    const r = REGRAS.alertaCalendario60Dias('2026-01-20');
    assert.equal(r.bloqueado, true);
    assert.match(r.mensagem, /⛔/);
  });
});

test('alertaCalendario60Dias: admin sempre passa, mesmo em cima da hora', (t) => {
  comHojeFixo(t, '2026-01-01T12:00:00', () => {
    const r = REGRAS.alertaCalendario60Dias('2026-01-02', true);
    assert.equal(r.bloqueado, false);
    assert.equal(r.diasRestantes, Infinity);
  });
});

/* ── relatorioABJBloqueado ── */
test('relatorioABJBloqueado: nunca bloqueia de fato (regra "impossível" documentada no código)', (t) => {
  comHojeFixo(t, '2026-03-10T12:00:00', () => {
    assert.equal(REGRAS.relatorioABJBloqueado().bloqueado, false);
  });
});

test('relatorioABJBloqueado: dia 1 do mês não tem desconto (limite exato)', (t) => {
  comHojeFixo(t, '2026-03-01T12:00:00', () => {
    const r = REGRAS.relatorioABJBloqueado();
    assert.equal(r.ateDia3, true);
    assert.equal(r.desconto, false, 'dia 1 é o próprio prazo, não atraso');
  });
});

test('relatorioABJBloqueado: dia 2 do mês tem desconto de atraso', (t) => {
  comHojeFixo(t, '2026-03-02T12:00:00', () => {
    const r = REGRAS.relatorioABJBloqueado();
    assert.equal(r.desconto, true);
    assert.match(r.mensagem, /fora do prazo/);
  });
});

test('relatorioABJBloqueado: dia 3 do mês (último dia de tolerância) ainda tem desconto', (t) => {
  comHojeFixo(t, '2026-03-03T12:00:00', () => {
    assert.equal(REGRAS.relatorioABJBloqueado().desconto, true);
  });
});

test('relatorioABJBloqueado: dia 4 do mês já não tem mais desconto nem alerta', (t) => {
  comHojeFixo(t, '2026-03-04T12:00:00', () => {
    const r = REGRAS.relatorioABJBloqueado();
    assert.equal(r.desconto, false);
    assert.equal(r.ateDia3, false);
    assert.equal(r.mensagem, '');
  });
});

test('relatorioABJBloqueado: no último dia do mês avisa mas não desconta ainda', (t) => {
  comHojeFixo(t, '2026-02-28T12:00:00', () => { /* fev/2026 tem 28 dias */
    const r = REGRAS.relatorioABJBloqueado();
    assert.equal(r.noUltimoDia, true);
    assert.match(r.mensagem, /Último dia/);
  });
});

test('relatorioABJBloqueado: admin nunca é bloqueado nem descontado', (t) => {
  comHojeFixo(t, '2026-03-02T12:00:00', () => {
    assert.deepEqual(REGRAS.relatorioABJBloqueado(true), { bloqueado: false, desconto: false });
  });
});

/* ── alertaRepasse24h ── */
test('alertaRepasse24h: dentro das 24h ainda não venceu', (t) => {
  comHojeFixo(t, '2026-01-10T12:00:00', () => {
    const inicio = new Date('2026-01-10T10:00:00').toISOString(); // 2h atrás
    const r = REGRAS.alertaRepasse24h(inicio);
    assert.equal(r.vencido, false);
    assert.equal(r.infracaoGravissima, false);
    assert.match(r.mensagem, /⏱️/);
  });
});

test('alertaRepasse24h: passou de 24h é infração gravíssima', (t) => {
  comHojeFixo(t, '2026-01-11T13:00:00', () => {
    const inicio = new Date('2026-01-10T12:00:00').toISOString(); // 25h atrás
    const r = REGRAS.alertaRepasse24h(inicio);
    assert.equal(r.vencido, true);
    assert.equal(r.infracaoGravissima, true);
    assert.match(r.mensagem, /INFRAÇÃO GRAVÍSSIMA/);
  });
});

/* ── mandatoExcedido ── */
test('mandatoExcedido: 2 anos de mandato ainda está dentro do limite', (t) => {
  comHojeFixo(t, '2026-01-01T12:00:00', () => {
    assert.equal(REGRAS.mandatoExcedido('2024-01-01'), false);
  });
});

test('mandatoExcedido: 4 anos de mandato excede o limite de 3', (t) => {
  comHojeFixo(t, '2026-01-01T12:00:00', () => {
    assert.equal(REGRAS.mandatoExcedido('2022-01-01'), true);
  });
});

test('mandatoExcedido: admin nunca excede mandato', (t) => {
  comHojeFixo(t, '2026-01-01T12:00:00', () => {
    assert.equal(REGRAS.mandatoExcedido('2010-01-01', true), false);
  });
});

/* ── conselheiroExpirado ── */
test('conselheiroExpirado: sem data de entrada, trata como expirado (fail-closed)', () => {
  assert.equal(REGRAS.conselheiroExpirado(null), true);
  assert.equal(REGRAS.conselheiroExpirado(undefined), true);
});

test('conselheiroExpirado: 6 meses de conselho ainda está no prazo de 1 ano', (t) => {
  comHojeFixo(t, '2026-06-01T12:00:00', () => {
    assert.equal(REGRAS.conselheiroExpirado('2026-01-01'), false);
  });
});

test('conselheiroExpirado: 13 meses de conselho já expirou', (t) => {
  comHojeFixo(t, '2026-06-01T12:00:00', () => {
    assert.equal(REGRAS.conselheiroExpirado('2025-05-01'), true);
  });
});
