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
     */
    coordenador_geral: {
      pagesVisible: [
        'dashboard','abj','notificacoes','tarefas','demandas','calendario',
        'geral_reunioes','geral_planejamento','geral_melhorias','geral_parcerias',
        'global_visitas','global_apresentacoes','global_producao','global_assembleia','global_gestao',
        'pessoas','compartilhado','dev_usuarios',
        'gp_aniversarios','gp_treinamentos','prj_parcerias',
      ],
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
     * membro — visitante sem coord definida
     */
    membro: {
      pagesVisible: ['dashboard','notificacoes'],
      isAdmin: false,
    },
  };

  /* ── Páginas por coordenadoria ── */
  const PAGES_POR_COORD = {
    'Geral':       ['geral_reunioes','geral_planejamento','geral_melhorias','geral_parcerias','global_visitas','global_apresentacoes','global_producao','global_assembleia','global_gestao'],
    'Marketing':   ['mkt_tracker','mkt_kanban','global_visitas','global_apresentacoes'],
    'Finanças':    ['fin_fluxo','fin_abepro','fin_comercial','global_visitas','global_apresentacoes'],
    'Projetos':    ['prj_eventos','prj_enegep','prj_treinamentos','prj_nupicast','prj_parcerias','global_visitas','global_apresentacoes','global_producao'],
    'Operações':   ['ops_relatorios','ops_pops','ops_arquivo','global_visitas','global_apresentacoes'],
    'G. Pessoas':  ['gp_talentos','gp_clima','gp_tap','gp_aniversarios','gp_treinamentos','global_visitas','global_apresentacoes'],
  };

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
    const SEMPRE = ['dashboard','notificacoes','tarefas','compartilhado','demandas','abj','calendario'];
    if (SEMPRE.includes(pageId)) return true;
    if (Array.isArray(m.pagesVisible)) return m.pagesVisible.includes(pageId);
    if (m.pagesVisible === 'coordenadoria') {
      const coordNome = p.coordenadorias?.nome || '';
      const paginas   = PAGES_POR_COORD[coordNome] || [];
      return paginas.includes(pageId);
    }
    return false;
  }

  function isAdmin() {
    return getPerfil()?.role === 'admin';
  }

  function getCoordPages(coordNome) {
    return PAGES_POR_COORD[coordNome] || [];
  }

  /* ══════════════════════════════════════════
     NÍVEIS DE PERMISSÃO (para exibição na aba Dev)
  ══════════════════════════════════════════ */
  const NIVEL_LABEL = {
    admin:      { label: 'Dev / Admin',        cor: '#f75412', badge: '👨‍💻 DEV' },
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
    PAGES_POR_COORD,
    MATRIZ,
  };
})();

window.Permissoes = Permissoes;
