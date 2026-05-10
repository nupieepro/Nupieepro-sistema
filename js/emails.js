'use strict';
/**
 * emails.js — Templates e envios de e-mail via EmailJS
 * NÃO usar alert() / confirm() — usar mostrarToast()
 *
 * Serviço:  service_4d8167g
 * Remetente: nupieeprotreinamentos@gmail.com  (NUPIEEPRO Sistema)
 *
 * Templates ativos no EmailJS:
 *   template_convite   → para_email, nome_convidado, coord, cargo, ano_gestao, link, criado_por
 *   template_despedida → para_email, nome, primeiro_nome, cargo, coord
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
     👋 2. DESPEDIDA (desligamento)
     Chamado ao desativar membro (ativo = false)
  ════════════════════════════════════════════ */
  async function enviarDespedida(membro, coord) {
    const primeiroNome = membro.apelido || membro.nome?.split(' ')[0] || 'membro';
    return _send('template_despedida', {
      para_email:    membro.email,
      nome:          membro.nome,
      primeiro_nome: primeiroNome,
      cargo:         membro.cargo || membro.role || 'membro',
      coord:         coord || 'NUPIEEPRO',
      assunto: 'Até logo e muito sucesso na sua jornada! 🚀',
      mensagem: [
        `Olá, ${primeiroNome}.`,
        '',
        'Grandes ciclos se encerram para que novas e incríveis histórias possam ser escritas. 💙🧡',
        '',
        'Hoje nos despedimos, mas o sentimento que fica é de uma imensa gratidão por toda a sua dedicação,',
        'produtividade e pelas marcas positivas que você deixa no Nupi. Trabalhar ao seu lado foi um grande',
        'aprendizado para todos nós.',
        '',
        'Desejamos que a sua trajetória seja brilhante e cheia de novas conquistas. Lembre-se de que as',
        'portas estarão sempre abertas e que você sempre fará parte da nossa história. Voa alto!',
        '',
        'Com carinho e admiração,',
        'Equipe Nupi',
      ].join('\n'),
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
    enviarDespedida,
    enviarConvite,
    checarAniversariosEmail,
  };
})();

window.EmailsModule = EmailsModule;

/* template_aniversario desabilitado — plano gratuito EmailJS suporta 2 templates (convite + despedida) */
