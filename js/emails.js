'use strict';
/**
 * emails.js — Templates e envios de e-mail via EmailJS
 * NÃO usar alert() / confirm() — usar mostrarToast()
 *
 * Serviço:  service_85bjukt
 * Remetente: nupieeprotreinamentos@gmail.com  (NUPIEEPRO Sistema)
 *
 * Templates necessários no dashboard EmailJS (criar manualmente):
 *   template_aniversario  → variáveis: {{nome}}, {{primeiro_nome}}
 *   template_despedida    → variáveis: {{nome}}, {{primeiro_nome}}, {{cargo}}, {{coord}}
 *   template_convite      → variáveis: {{nome_convidado}}, {{email}}, {{coord}}, {{cargo}}, {{link}}, {{criado_por}}
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
  async function enviarConvite({ email, coord, cargo, token, criadoPor }) {
    const link = `${location.origin}/convite.html?token=${token}`;
    return _send('template_convite', {
      para_email:   email,
      email:        email,
      coord:        coord  || 'NUPIEEPRO',
      cargo:        cargo  || 'membro',
      link,
      criado_por:   criadoPor || 'Equipe Nupi',
      assunto: 'Você acaba de dar o primeiro passo para algo incrível! ✨',
      mensagem: [
        'Olá!',
        '',
        'É com muita alegria que te convidamos para integrar oficialmente o nosso sistema e fazer parte do Nupi! 💙🧡',
        '',
        'A partir de agora, você faz parte de um ambiente focado em desenvolvimento, gestão e resultados.',
        'Aqui, nós construímos projetos, aprimoramos nossas habilidades e, o mais importante, crescemos juntos.',
        '',
        'Para começar a sua jornada com a gente, basta clicar no link abaixo, configurar o seu perfil',
        'e explorar o sistema.',
        '',
        `🔗 ${link}`,
        '',
        'O convite expira em 7 dias.',
        '',
        'Estamos muito felizes em ter você no time. Prepare-se para fazer a diferença!',
        '',
        'Seja muito bem-vindo(a),',
        'Equipe Nupi',
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

/* Integra com o boot do sistema */
document.addEventListener('nupi:booted', () => {
  /* Verifica aniversários uma vez por dia (além da push.js que faz local) */
  setTimeout(() => EmailsModule.checarAniversariosEmail(), 12000);
  setInterval(() => EmailsModule.checarAniversariosEmail(), 86400000); /* 24 h */
});
