'use strict';
/**
 * Testes de segurança "estática" — rodam no `npm test` (e portanto travam o
 * deploy no CI se algo regredir). Sem dependências externas.
 *  1. Integridade das libs vendorizadas (hash em security/integridade.sha256)
 *  2. Nenhum segredo commitado (service_role, chaves privadas, tokens)
 *  3. Padrões perigosos de JS (eval, new Function, document.write)
 *  4. target="_blank" sempre com rel="noopener"
 *  5. Headers de segurança obrigatórios no _headers
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.join(__dirname, '..');
const IGNORAR = new Set(['.git', 'node_modules', 'vendor', 'tests', 'security']);

function arquivos(dir, exts, out = []) {
  for (const nome of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(nome.name)) continue;
    const p = path.join(dir, nome.name);
    if (nome.isDirectory()) arquivos(p, exts, out);
    else if (exts.some(e => nome.name.endsWith(e))) out.push(p);
  }
  return out;
}
const rel = p => path.relative(RAIZ, p);

test('libs vendorizadas batem com o manifesto de integridade', () => {
  const linhas = fs.readFileSync(path.join(RAIZ, 'security/integridade.sha256'), 'utf8')
    .split('\n').filter(Boolean);
  assert.ok(linhas.length > 0, 'manifesto vazio');
  for (const l of linhas) {
    const [hash, arq] = l.split(/\s+/);
    const real = crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, arq))).digest('hex');
    assert.equal(real, hash, `${arq} foi alterado. Se a troca foi intencional, rode: sha256sum js/vendor/*.js > security/integridade.sha256`);
  }
});

test('nenhum segredo commitado no código', () => {
  const alvos = arquivos(RAIZ, ['.js', '.html', '.json', '.ts', '.sql', '.md', '.yml', '.txt']);
  const padroes = [
    [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'chave privada'],
    [/sb_secret_[A-Za-z0-9_\-]{10,}/, 'Supabase secret key'],
    [/\bghp_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/, 'token do GitHub'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'chave AWS'],
    [/cloudflare[_-]?api[_-]?token\s*[:=]\s*['"][A-Za-z0-9_\-]{30,}['"]/i, 'token Cloudflare'],
  ];
  for (const f of alvos) {
    const txt = fs.readFileSync(f, 'utf8');
    for (const [re, desc] of padroes) assert.ok(!re.test(txt), `${desc} encontrado em ${rel(f)}`);
    // JWT do Supabase com role service_role
    for (const m of txt.matchAll(/eyJ[A-Za-z0-9_\-]+\.([A-Za-z0-9_\-]+)\.[A-Za-z0-9_\-]+/g)) {
      let payload = {};
      try { payload = JSON.parse(Buffer.from(m[1], 'base64url').toString()); } catch (_) {}
      assert.notEqual(payload.role, 'service_role', `service_role key em ${rel(f)}`);
    }
  }
});

test('sem eval / new Function / document.write no código da aplicação', () => {
  for (const f of arquivos(RAIZ, ['.js', '.html'])) {
    const txt = fs.readFileSync(f, 'utf8');
    assert.ok(!/\beval\s*\(/.test(txt), `eval() em ${rel(f)}`);
    assert.ok(!/new Function\s*\(/.test(txt), `new Function() em ${rel(f)}`);
    assert.ok(!/document\.write\s*\(/.test(txt), `document.write() em ${rel(f)}`);
  }
});

test('todo target="_blank" tem rel="noopener"', () => {
  for (const f of arquivos(RAIZ, ['.js', '.html'])) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (l.includes('target="_blank"')) assert.ok(/noopener/.test(l), `${rel(f)}:${i + 1} sem rel=noopener`);
    });
  }
});

test('_headers mantém os cabeçalhos de segurança obrigatórios', () => {
  const h = fs.readFileSync(path.join(RAIZ, '_headers'), 'utf8');
  for (const k of ['X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Strict-Transport-Security',
                   'Content-Security-Policy', "frame-ancestors 'none'", "object-src 'none'",
                   'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy']) {
    assert.ok(h.includes(k), `falta ${k} no _headers`);
  }
  const csp = (h.match(/Content-Security-Policy:(.*)/) || [])[1] || '';
  assert.ok(!/connect-src[^;]*\s\*(\s|;|$)/.test(csp), 'connect-src não pode ser curinga');
  assert.ok(!/default-src[^;]*\s\*(\s|;|$)/.test(csp), 'default-src não pode ser curinga');
});
