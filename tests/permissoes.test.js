'use strict';
/**
 * Testes de js/permissoes.js — a matriz de acesso é o coração do "cada
 * coordenadoria só vê a própria pasta, exceto Coordenação Geral e admin
 * que veem tudo" (pedido explícito do dono do projeto). Roda com o test
 * runner nativo do Node, sem dependência nova nenhuma:
 *   node --test tests/
 *
 * Fixture de ROLE_PAGES/GLOBAL_PAGES é sintética (não a real de js/app.js)
 * de propósito — testa a LÓGICA de acesso, não fica presa a nomes reais
 * de página que podem mudar.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const ROLE_PAGES = {
  'Geral':      [{ id: 'ger_exclusiva', icon: 'x', label: 'Só da Geral' }],
  'Marketing':  [{ id: 'mkt_exclusiva', icon: 'x', label: 'Só do Marketing' }],
  'Finanças':   [{ id: 'fin_exclusiva', icon: 'x', label: 'Só de Finanças' }],
};
const GLOBAL_PAGES = [{ id: 'inst_geral', icon: 'x', label: 'Institucional' }];

global.window = { ROLE_PAGES, GLOBAL_PAGES, _appProfile: null };
const Permissoes = require('../js/permissoes.js');

function setPerfil(perfil) { global.window._appProfile = perfil; }

test('admin vê qualquer página, mesmo uma inventada', () => {
  setPerfil({ role: 'admin' });
  assert.equal(Permissoes.podeVer('pagina_que_nem_existe'), true);
  assert.equal(Permissoes.isAdmin(), true);
});

test('coordenador da Geral (Coordenação Geral) vê tudo mas não tem poderes de admin', () => {
  setPerfil({ role: 'coordenador', coordenadorias: { nome: 'Geral', sigla: 'GER' } });
  assert.equal(Permissoes.podeVer('fin_exclusiva'), true, 'Coord. Geral deve ver página de outra coordenadoria');
  assert.equal(Permissoes.podeVer('pagina_que_nem_existe'), true);
  assert.equal(Permissoes.pode('podeVerFinanceiro'), true);
  assert.equal(Permissoes.pode('podeAprovarRelatorio'), true);
  assert.equal(Permissoes.pode('podeGerenciarUsuarios'), false, 'Coord. Geral não gerencia usuários — só admin');
  assert.equal(Permissoes.pode('podeLancarlancamento'), false, 'Coord. Geral só lê financeiro, não lança');
  assert.equal(Permissoes.isAdmin(), false);
});

test('coordenador de uma coordenadoria comum só vê a própria pasta + institucional', () => {
  setPerfil({ role: 'coordenador', coordenadorias: { nome: 'Marketing', sigla: 'MKT' } });
  assert.equal(Permissoes.podeVer('mkt_exclusiva'), true, 'vê a própria página');
  assert.equal(Permissoes.podeVer('inst_geral'), true, 'vê página institucional (GLOBAL_PAGES)');
  assert.equal(Permissoes.podeVer('fin_exclusiva'), false, 'NÃO vê página de outra coordenadoria');
  assert.equal(Permissoes.podeVer('ger_exclusiva'), false, 'NÃO vê página da Geral');
});

test('membro sem coordenadoria_id não vê nenhuma página exclusiva de coordenadoria', () => {
  setPerfil({ role: 'membro', coordenadorias: null });
  assert.equal(Permissoes.podeVer('mkt_exclusiva'), false);
  assert.equal(Permissoes.podeVer('fin_exclusiva'), false);
  assert.equal(Permissoes.podeVer('inst_geral'), true, 'institucional continua visível');
  assert.equal(Permissoes.podeVer('dashboard'), true, 'página universal continua visível');
});

test('páginas universais (SEMPRE) são visíveis pra qualquer papel autenticado', () => {
  const SEMPRE = ['dashboard','notificacoes','tarefas','compartilhado','demandas','abj','calendario','global_checkin'];
  for (const role of ['admin','coordenador','assessor','membro','conselheiro']) {
    setPerfil({ role, coordenadorias: null });
    for (const pageId of SEMPRE) {
      assert.equal(Permissoes.podeVer(pageId), true, `${role} deveria ver página universal "${pageId}"`);
    }
  }
});

test('conselheiro só vê a lista fixa dele + universais, nunca página de coordenadoria', () => {
  setPerfil({ role: 'conselheiro' });
  assert.equal(Permissoes.podeVer('geral_reunioes'), true);
  assert.equal(Permissoes.podeVer('global_assembleia'), true);
  assert.equal(Permissoes.podeVer('mkt_exclusiva'), false);
  assert.equal(Permissoes.podeVer('inst_geral'), false, 'conselheiro não está na lista global_pages, só na dele mesmo');
});

test('sem perfil logado, nada é visível', () => {
  setPerfil(null);
  assert.equal(Permissoes.podeVer('dashboard'), false);
  assert.equal(Permissoes.pode('podeVerFinanceiro'), false);
  assert.equal(Permissoes.isAdmin(), false);
});

test('role desconhecido cai no fallback de membro (fail-closed)', () => {
  setPerfil({ role: 'papel_que_nao_existe', coordenadorias: { nome: 'Marketing' } });
  assert.equal(Permissoes.podeVer('mkt_exclusiva'), true, 'fallback usa a mesma coordenadoria-scoping do membro');
  assert.equal(Permissoes.pode('podeGerenciarUsuarios'), false);
});

test('assessor tem a mesma pasta do coordenador mas sem poderes de gestão', () => {
  setPerfil({ role: 'assessor', coordenadorias: { nome: 'Finanças' } });
  assert.equal(Permissoes.podeVer('fin_exclusiva'), true);
  assert.equal(Permissoes.pode('podeCriarConvite'), false);
  assert.equal(Permissoes.pode('podeCriarEvento'), false);
});
