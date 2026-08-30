'use strict';
/**
 * permissoes.js — Matriz de acesso e regras de negócio do NUPIEEPRO
 * Autor: JR + Claude Code  |  v1.0  |  2026
 *
 * REGRAS DE OURO (Art. 4, 9, 10, 11 e 29 do Regimento):
 *  • Mandato de coordenação ≤ 3 anos
 *  • Conselheiros têm acesso por 1 ano, sem renovação
 *  • Membro que conclui o curso perde acesso automaticamente
 *  • Membro com desempenho insuficiente por 2 meses → alerta PCD
 *  • Modificações no regimento exigem maioria absoluta dos efetivos
 */

const Permissoes = (() => {

  /* ══════════════════════════════════════════
     MATRIZ DE ACESSO POR PAPEL
  ══════════════════════════════════════════ */
  const MATRIZ = {
    /**
     * admin — Desenvolvedor / Diagramador (JR)
     * Vê e edita absolutamente tudo.
     * Bypass de todas as regras de negócio para testes.
     */
    admin: {
      pagesVisible: '*',           /* todos */
      podeGerenciarUsuarios: true,
      podeAlterarRoles: true,
      podeVerLogs: true,
      podeCriarConvite: true,
      podeCriarEvento: true,
      podeEditarDemanda: true,
      podeAprovarRelatorio: true,
      podeVerFinanceiro: true,
      podeLancarlancamento: true,
      bypassRegrasNegocio: true,   /* ignora bloqueios como alerta 60 dias */
      isAdmin: true,
    },

    /**
     * coordenador-geral — Ana Lívia, Luís Henrique
     * Leitura global + poder estratégico (aprovar, KPIs, PCD).
     * A sidebar (buildSidebar, js/app.js) mostra a esse papel TODAS as
     * pastas de coordenadoria, igual ao admin — pagesVisible '*' só
     * controla navegação/leitura; os poderes de escrita continuam presos
     * nas flags abaixo (podeGerenciarUsuarios etc, todas false pra este
     * papel), que é onde a diferença pro admin de fato mora.
     */
    coordenador_geral: {
      pagesVisible: '*',
      podeGerenciarUsuarios: false, /* só GP e admin */
      podeAlterarRoles: false,
      podeVerLogs: false,
      podeCriarConvite: true,
      podeCriarEvento: true,
      podeEditarDemanda: true,
      podeAprovarRelatorio: true,  /* aprova relatório antes do envio ABJ */
      podeVerFinanceiro: true,     /* leitura */
      podeLancarlancamento: false,
      bypassRegrasNegocio: false,
      isAdmin: false,
    },

    /**
     * coordenador — coordenador da sua coord + acesso a módulos dela
     * Pode gerenciar membros da SUA coordenadoria.
     */
    coordenador: {
      pagesVisible: 'coordenadoria', /* resolvido em runtime pela coord */
      podeGerenciarUsuarios: false,
      podeAlterarRoles: false,
      podeCriarConvite: true,       /* pode convidar alguém para a sua coord */
      podeCriarEvento: true,
      podeEditarDemanda: true,
      podeAprovarRelatorio: false,
      podeVerFinanceiro: false,     /* a não ser que seja coord financeira */
      podeLancarlancamento: false,
      bypassRegrasNegocio: false,
      isAdmin: false,
    },

    /**
     * assessor — acesso restrito à sua coord + módulos globais
     */
    assessor: {
      pagesVisible: 'coordenadoria',
      podeGerenciarUsuarios: false,
      podeAlterarRoles: false,
      podeCriarConvite: false,
      podeCriarEvento: false,
      podeEditarDemanda: false,
      podeAprovarRelatorio: false,
      podeVerFinanceiro: false,
      podeLancarlancamento: false,
      bypassRegrasNegocio: false,
      isAdmin: false,
    },

    /**
     * conselheiro — Coordenadoria Geral da gestão anterior
     * Acesso de auditoria por exatamente 1 ano, sem renovação.
     * Pode acompanhar e comentar, nunca editar.
     */
    conselheiro: {
      pagesVisible: [
        'dashboard','abj','notificacoes',
        'geral_reunioes','global_assembleia',
      ],
      podeGerenciarUsuarios: false,
      podeAlterarRoles: false,
      podeCriarConvite: false,
      podeCriarEvento: false,
      podeEditarDemanda: false,
      podeAprovarRelatorio: false,
      podeVerFinanceiro: false,
      podeLancarlancamento: false,
      bypassRegrasNegocio: false,
      isAdmin: false,
      acessoExpirado: null, /* preenchido em runtime */
    },

    /**
     * membro — mesma pasta da sua coordenadoria (só sem os poderes de
     * gestão do coordenador/assessor). Sem coordenadoria_id, não vê
     * nada além do universal (getCoordPages devolve lista vazia).
     */
    membro: {
      pagesVisible: 'coordenadoria',
      isAdmin: false,
    },
  };

  /* ── Páginas por coordenadoria ──
     Antes esta lista era digitada à mão aqui, em paralelo à sidebar real
     (ROLE_PAGES em js/app.js) — as duas foram desalinhando com o tempo
     (ex: "Gestão de Inscrições" e "Nupi-Eventos (App)" apareciam clicáveis
     na pasta de Operações mas Permissoes.podeVer() barrava os dois com
     "Acesso restrito"). Agora deriva direto de ROLE_PAGES + GLOBAL_PAGES
     (window.*, definidas em js/app.js), que é a mesma fonte que desenha a
     sidebar — só existe um lugar pra manter essa lista atualizada. */
  function getCoordPages(coordNome) {
    const propria = (window.ROLE_PAGES?.[coordNome] || []).map(p => p.id);
    const institucional = (window.GLOBAL_PAGES || []).map(p => p.id);
    return [...propria, ...institucional];
  }

  /* ══════════════════════════════════════════
     REGRAS DE NEGÓCIO — Prazos e Bloqueios
  ══════════════════════════════════════════ */
  const REGRAS = {

    /* ── Alerta de 60 dias (Financeiro / Calendário Comercial) ── */
    alertaCalendario60Dias(dataEvento, isAdmin = false) {
      if (isAdmin) return { bloqueado: false, diasRestantes: Infinity };
      const hoje    = new Date();
      const evento  = new Date(dataEvento);
      const diff    = Math.ceil((evento - hoje) / 86400000);
      return {
        bloqueado:     diff < 60,
        diasRestantes: diff,
        mensagem:      diff < 60
          ? `⛔ Plano de ação deve ser submetido com 60 dias de antecedência. Faltam apenas ${diff} dias para o evento.`
          : `✅ ${diff} dias restantes para o evento.`,
      };
    },

    /* ── Bloqueio de relatório ABJ (último dia do mês) ── */
    relatorioABJBloqueado(isAdmin = false) {
      if (isAdmin) return { bloqueado: false, desconto: false };
      const hoje    = new Date();
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const diaAtual  = hoje.getDate();
      return {
        bloqueado:  diaAtual > ultimoDia,  /* impossível, mas deixa extensível */
        noUltimoDia: diaAtual === ultimoDia,
        ateDia3:    diaAtual <= 3,          /* até 3º dia do mês seguinte = -2pts */
        desconto:   diaAtual > 1 && diaAtual <= 3,
        mensagem: diaAtual === ultimoDia
          ? '⚠️ Último dia para envio! Submissões após hoje resultam em desconto de 2 pontos.'
          : diaAtual <= 3
          ? `🔴 Envio fora do prazo. -2 pontos serão descontados automaticamente.`
          : '',
      };
    },

    /* ── Timer 24h para repasse transitório (Financeiro) ── */
    alertaRepasse24h(timestampRepasse) {
      const inicio    = new Date(timestampRepasse);
      const limite    = new Date(inicio.getTime() + 86400000);
      const agora     = new Date();
      const vencido   = agora > limite;
      const horasRestantes = Math.max(0, Math.ceil((limite - agora) / 3600000));
      return {
        vencido,
        horasRestantes,
        infracaoGravissima: vencido,
        mensagem: vencido
          ? '🚨 INFRAÇÃO GRAVÍSSIMA: Repasse transitório excedeu 24h. Alerta enviado ao PCD.'
          : `⏱️ Repasse transitório: ${horasRestantes}h restantes para transferência à conta oficial.`,
      };
    },

    /* ── Limite de mandato de coordenação (3 anos) ── */
    mandatoExcedido(dataEntrada, isAdmin = false) {
      if (isAdmin) return false;
      const entrada = new Date(dataEntrada);
      const anos    = (new Date() - entrada) / (365.25 * 86400000);
      return anos >= 3;
    },

    /* ── Acesso de conselheiro expirado (1 ano) ── */
    conselheiroExpirado(dataEntradaConselho) {
      if (!dataEntradaConselho) return true;
      const entrada = new Date(dataEntradaConselho);
      const anos    = (new Date() - entrada) / (365.25 * 86400000);
      return anos >= 1;
    },

    /* ── Verificação de inatividade do núcleo (extinção) ── */
    async alertaExtincao(supabase) {
      if (!supabase) return null;
      try {
        const { data } = await supabase
          .from('eventos')
          .select('data_inicio')
          .eq('tipo', 'reuniao')
          .order('data_inicio', { ascending: false })
          .limit(1);
        if (!data?.length) return { risco: true, mesesSemAtividade: 24 };
        const ultima  = new Date(data[0].data_inicio);
        const meses   = Math.floor((new Date() - ultima) / (30 * 86400000));
        return {
          risco:               meses >= 18,
          mesesSemAtividade:   meses,
          mensagem: meses >= 18
            ? `⚠️ Núcleo em risco: ${meses} meses sem reunião registrada. Artigo 28 do Regimento.`
            : null,
        };
      } catch { return null; }
    },

    /* ── Alerta PCD: 2 meses sem entrega ── */
    async checarPCD(supabase, userId) {
      if (!supabase || !userId) return false;
      try {
        const doisMesesAtras = new Date();
        doisMesesAtras.setMonth(doisMesesAtras.getMonth() - 2);
        const { count } = await supabase
          .from('progresso_abj')
          .select('id', { count: 'exact', head: true })
          .eq('registrado_por', userId)
          .gte('created_at', doisMesesAtras.toISOString());
        return count === 0; /* verdadeiro = sem entrega em 2 meses = alerta PCD */
      } catch { return false; }
    },
  };

  /* ══════════════════════════════════════════
     HELPERS DE ACESSO
  ══════════════════════════════════════════ */
  function getPerfil() {
    return window._appProfile || null;
  }

  function getMatriz(role) {
    /* 'admin' e 'coordenador' (Geral) têm matrizes especiais */
    if (role === 'admin') return MATRIZ.admin;
    const p = getPerfil();
    if ((role === 'coordenador') && p?.coordenadorias?.sigla === 'GER') {
      return MATRIZ.coordenador_geral;
    }
    return MATRIZ[role] || MATRIZ.membro;
  }

  function pode(feature) {
    const p = getPerfil();
    if (!p) return false;
    const m = getMatriz(p.role);
    return m[feature] === true;
  }

  function podeVer(pageId) {
    const p = getPerfil();
    if (!p) return false;
    const m = getMatriz(p.role);
    if (m.pagesVisible === '*') return true;
    /* Páginas universais: todos os papéis ativos têm acesso */
    const SEMPRE = ['dashboard','notificacoes','tarefas','compartilhado','demandas','abj','calendario','global_checkin'];
    if (SEMPRE.includes(pageId)) return true;
    if (Array.isArray(m.pagesVisible)) return m.pagesVisible.includes(pageId);
    if (m.pagesVisible === 'coordenadoria') {
      const coordNome = p.coordenadorias?.nome || '';
      return getCoordPages(coordNome).includes(pageId);
    }
    return false;
  }

  function isAdmin() {
    return getPerfil()?.role === 'admin';
  }

  /* ══════════════════════════════════════════
     NÍVEIS DE PERMISSÃO (para exibição na aba Dev)
  ══════════════════════════════════════════ */
  const NIVEL_LABEL = {
    admin:      { label: 'Dev / Admin',        cor: '#d0541a', badge: '👨‍💻 DEV' },
    coordenador_geral: { label: 'Coord. Geral', cor: '#6366f1', badge: '🏛️ GERAL' },
    coordenador: { label: 'Coordenador',        cor: '#a855f7', badge: '📋 COORD' },
    assessor:    { label: 'Assessor',           cor: '#22c55e', badge: '✅ ASS' },
    conselheiro: { label: 'Conselheiro',        cor: '#eab308', badge: '⭐ CONS' },
    membro:      { label: 'Membro',             cor: '#6b7280', badge: '👤 MBR' },
  };

  function getNivelInfo(role, coordSigla) {
    if (role === 'admin') return NIVEL_LABEL.admin;
    if (role === 'coordenador' && coordSigla === 'GER') return NIVEL_LABEL.coordenador_geral;
    return NIVEL_LABEL[role] || NIVEL_LABEL.membro;
  }

  /* ── API pública ── */
  return {
    pode,
    podeVer,
    isAdmin,
    getCoordPages,
    getMatriz,
    getNivelInfo,
    REGRAS,
    NIVEL_LABEL,
    /* Mantido pra tela "Páginas por Coordenadoria" do painel Dev — computado
       na hora a partir de ROLE_PAGES em vez de lista fixa (ver getCoordPages). */
    get PAGES_POR_COORD() {
      const nomes = Object.keys(window.ROLE_PAGES || {}).filter(k => k !== 'Conselheiro');
      return Object.fromEntries(nomes.map(nome => [nome, getCoordPages(nome)]));
    },
    MATRIZ,
  };
})();

window.Permissoes = Permissoes;

/* Exporta como CommonJS quando rodando em Node (testes) — não afeta o
   navegador, onde `module` não existe e este bloco nunca executa. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Permissoes;
}
