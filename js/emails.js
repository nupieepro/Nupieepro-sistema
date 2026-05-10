'use strict';
/**
 * emails.js — Templates e envios de e-mail via EmailJS
 * NÃO usar alert() / confirm() — usar mostrarToast()
 *
 * Serviço:  service_4d8167g
 * Remetente: nupieeprotreinamentos@gmail.com  (NUPIEEPRO Sistema)
 *
 * Templates ativos no EmailJS (plano gratuito = 2 templates):
 *   template_convite → para_email, nome_convidado, coord, cargo, link, criado_por, assunto, mensagem
 *   template_demanda → para_email, nome, titulo_demanda, tipo_demanda, coord, prazo, criado_por, assunto, mensagem
 */

const EmailsModule = (() => {
  const SVC  = 'service_4d8167g';
  const PKEY = 'WIiLVFRJPDeqTP7Ox';

  /* ── garante SDK inicializado ── */
  function _init() {
    if (window.emailjs && !window._emailjsInited) {
      emailjs.init({ publicKey: PKEY });
      window._emailjsInited = true;
    }
  }

  /* ── envio genérico ── */
  async function _send(templateId, params) {
    _init();
    if (!window.emailjs) {
      console.warn('[Emails] SDK não carregado.');
      return false;
    }
    try {
      await emailjs.send(SVC, templateId, params);
      return true;
    } catch(e) {
      console.error('[Emails] Falha ao enviar', templateId, e);
      return false;
    }
  }

  /* ════════════════════════════════════════════
     🎂 1. FELIZ ANIVERSÁRIO
     Disparado diariamente pelo push.js / checarAniversarios()
  ════════════════════════════════════════════ */
  async function enviarAniversario(membro) {
    const primeiroNome = membro.apelido || membro.nome?.split(' ')[0] || 'membro';
    return _send('template_aniversario', {
      para_email:    membro.email,
      nome:          membro.nome,
      primeiro_nome: primeiroNome,
      /* Corpo conforme texto oficial: */
      assunto: `Hoje o dia é de celebração, ${primeiroNome}! 🎉`,
      mensagem: [
        `Olá, ${primeiroNome}!`,
        '',
        'Hoje é um dia mais do que especial! 💙🧡',
        '',
        'Em nome de todo o Nupi, queremos te desejar um feliz aniversário e um ano repleto de realizações,',
        'saúde e muito sucesso. Que a sua jornada continue sendo de constante evolução e que você continue',
        'agregando tanto valor aos nossos projetos e à nossa equipe.',
        '',
        'Aproveite muito o seu dia, celebre suas conquistas e conte com a gente para os próximos desafios!',
        '',
        'Um grande abraço,',
        'Equipe Nupi',
      ].join('\n'),
    });
  }

  /* ════════════════════════════════════════════
     📋 2. DEMANDA CADASTRADA
     Chamado ao criar demanda no sistema — notifica o responsável
     { email, nome, titulo, tipo, coord, prazo, criadoPor }
  ════════════════════════════════════════════ */
  async function enviarDemandaCadastrada({ email, nome, titulo, tipo, coord, prazo, criadoPor }) {
    const primeiroNome = nome?.split(' ')[0] || 'membro';
    const tipoPretty = { conteudo:'Conteúdo / Post', lojinha:'Lojinha', divulgacao:'Divulgação',
      melhoria:'Melhoria', parceria:'Parceria', abepro:'ABEPRO', talento:'Talento' }[tipo] || tipo || 'Demanda';
    const prazoFmt = prazo ? new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : null;
    return _send('template_demanda', {
      para_email:     email,
      nome:           nome,
      titulo_demanda: titulo,
      tipo_demanda:   tipoPretty,
      coord:          coord || 'NUPIEEPRO',
      prazo:          prazoFmt || 'Sem prazo definido',
      criado_por:     criadoPor || 'Sistema',
      assunto: `Nova demanda cadastrada: ${titulo}`,
      mensagem: [
        `Olá, ${primeiroNome}!`,
        '',
        'Uma nova demanda foi registrada no sistema e você está como responsável. ✅',
        '',
        `📌 Título: ${titulo}`,
        `📂 Tipo: ${tipoPretty}`,
        `🏛️ Coordenadoria: ${coord || 'NUPIEEPRO'}`,
        prazoFmt ? `📅 Prazo: ${prazoFmt}` : '',
        `👤 Registrado por: ${criadoPor || 'Sistema'}`,
        '',
        'Acesse o sistema para acompanhar o andamento:',
        `🔗 ${typeof location !== 'undefined' ? location.origin : 'https://nupieepro.pages.dev'}/dashboard.html`,
        '',
        'Equipe NUPIEEPRO',
      ].filter(l => l !== '').join('\n'),
    });
  }

  /* ════════════════════════════════════════════
     📩 3. CONVITE (onboarding)
     Chamado ao gerar um convite no sistema
  ════════════════════════════════════════════ */
  async function enviarConvite({ email, coord, cargo, token, criadoPor, nomeConvidado, anoGestao }) {
    const link = `${location.origin}/convite.html?token=${token}`;
    return _send('template_convite', {
      para_email:     email,
      email:          email,
      nome_convidado: nomeConvidado || 'Novo membro',
      coord:          coord  || 'NUPIEEPRO',
      cargo:          cargo  || 'membro',
      ano_gestao:     anoGestao || new Date().getFullYear().toString(),
      link,
      criado_por:     criadoPor || 'Equipe Nupi',
      assunto: 'O NUPI está de cara nova — e você faz parte disso 💙🧡',
      mensagem: [
        'Olá!',
        '',
        'É oficial: o NUPI ganhou um sistema de gestão próprio e você está sendo convidado(a) para acessá-lo. 🚀',
        '',
        'Tudo que já era feito — planejamento, demandas, ABJ, eventos, finanças — agora acontece em um só lugar,',
        'de forma organizada e transparente. A gestão ficou digital, e a sua participação está garantida aqui dentro.',
        '',
        'Para criar o seu perfil e começar a usar, clique no link abaixo:',
        '',
        `🔗 ${link}`,
        '',
        'O convite expira em 7 dias. Qualquer dúvida, fala com a coordenação.',
        '',
        'Bem-vindo(a) à nova era do NUPI,',
        'Equipe NUPIEEPRO',
      ].join('\n'),
    });
  }

  /* ════════════════════════════════════════════
     Verificação diária de aniversários — integra com push.js
     Envia e-mail E notificação local
  ════════════════════════════════════════════ */
  async function checarAniversariosEmail() {
    if (!window._supabase) return;
    const hoje = new Date();
    const dia  = hoje.getDate();
    const mes  = hoje.getMonth() + 1;
    try {
      const { data } = await window._supabase
        .from('users')
        .select('nome, apelido, email, aniversario')
        .eq('ativo', true);

      for (const p of (data || [])) {
        if (!p.aniversario || !p.email) continue;
        const [, mP, dP] = p.aniversario.split('-').map(Number);
        if (dP === dia && mP === mes) {
          /* Notificação local (push.js já dispara — aqui só o e-mail) */
          await enviarAniversario(p);
          console.log('[Emails] Aniversário enviado para', p.nome);
        }
      }
    } catch(e) { console.warn('[Emails] checarAniversariosEmail:', e); }
  }

  /* ── Expõe API pública ── */
  return {
    enviarAniversario,
    enviarDemandaCadastrada,
    enviarConvite,
    checarAniversariosEmail,
  };
})();

window.EmailsModule = EmailsModule;

/* template_aniversario desabilitado — plano gratuito EmailJS suporta 2 templates (convite + demanda) */
