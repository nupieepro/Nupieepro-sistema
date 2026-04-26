'use strict';
const PushModule = (() => {
  const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40DXRkFfVY4-GFf_VGZ4tTBHSvxJ_D3nw8Ga_hCHLpkRm6bJ0tLRRn8Ai4w';
  function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = window.atob(base64);
    return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
  }
  async function registrarSW() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service Worker não suportado.');
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[SW] Registrado:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const novo = reg.installing;
        novo.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            mostrarToast('Nova versão disponível! Recarregue para atualizar.', 'info', 0);
          }
        });
      });
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'navigate') App.navigate(e.data.url.replace('/dashboard.html','') || 'dashboard');
        if (e.data?.type === 'sync-abj') ABJModule?.carregar();
      });
      return reg;
    } catch(e) {
      console.error('[SW] Erro ao registrar:', e);
      return null;
    }
  }
  async function solicitarPermissao() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  {
      mostrarToast('Notificações bloqueadas nas configurações do navegador.', 'warning');
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      mostrarToast('Notificações ativadas! 🔔', 'success');
      await _assinarPush();
      return true;
    }
    return false;
  }
  async function _assinarPush() {
    if (!window._supabase) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      const user = window._appProfile;
      await window._supabase.from('push_subscriptions').upsert({
        user_id: user?.id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
        auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      console.log('[Push] Subscription salva!');
    } catch(e) {
      console.warn('[Push] Erro ao assinar:', e);
    }
  }
  function notificarLocal(titulo, corpo, url = '/dashboard.html') {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(titulo, {
      body:  corpo,
      icon:  '/assets/icon.svg',
      badge: '/assets/icon.svg',
      data:  { url }
    });
    n.onclick = () => { window.focus(); App.navigate('dashboard'); n.close(); };
    setTimeout(() => n.close(), 6000);
  }
  async function checarPrazosABJ() {
    if (typeof ABJ_ATIVIDADES === 'undefined') return;
    const hoje = new Date();
    ABJ_ATIVIDADES.forEach(a => {
      const prazo = new Date(a.prazo + 'T23:59:59');
      const dias  = Math.ceil((prazo - hoje) / 86400000);
      if (dias === 7 || dias === 1) {
        notificarLocal(
          `⏰ Prazo ABJ em ${dias} dia${dias > 1 ? 's' : ''}!`,
          `Atividade ${a.id}: ${a.nome} — prazo ${new Date(a.prazo).toLocaleDateString('pt-BR')}`,
          '/dashboard.html'
        );
      }
    });
  }
  const Notificacoes = {
    atividadeEnviada(nomeAtividade) {
      notificarLocal('✅ Atividade ABJ enviada!', `${nomeAtividade} foi enviada para revisão.`);
    },
    membroNovo(nome, coord) {
      notificarLocal('👤 Novo membro!', `${nome} entrou na ${coord}.`);
    },
    relatorioFaltando() {
      notificarLocal('📋 Relatório mensal pendente!', 'Hoje é o último dia para enviar o relatório.', '/dashboard.html');
    },
    aniversario(nome) {
      notificarLocal(`🎂 Aniversário de ${nome}!`, 'Não esqueça de parabenizar! 🎉');
    },
    demandaNova(titulo, coord) {
      notificarLocal('📋 Nova demanda!', `${titulo} — ${coord}`);
    },
    pesquisaClima() {
      notificarLocal('🌡️ Pesquisa de clima disponível!', 'Acesse o sistema para responder.');
    }
  };
  async function checarAniversarios() {
    if (!window._supabase) return;
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;
    try {
      const { data } = await window._supabase
        .from('profiles')
        .select('nome, data_nascimento')
        .eq('ativo', true);
      data?.forEach(p => {
        if (!p.data_nascimento) return;
        const [, mes, dia] = p.data_nascimento.split('-').map(Number);
        if (dia === diaHoje && mes === mesHoje) {
          Notificacoes.aniversario(p.nome?.split(' ')[0] || 'alguém do time');
        }
      });
    } catch(e) { console.warn('[Aniversários]', e); }
  }
  async function init() {
    const reg = await registrarSW();
    if (!reg) return;
    if (Notification.permission === 'default') {
      setTimeout(async () => {
        if (document.hasFocus()) await solicitarPermissao();
      }, 3000);
    }
    setTimeout(() => checarPrazosABJ(), 5000);
    setInterval(() => checarPrazosABJ(), 3600000);
    setTimeout(() => checarAniversarios(), 8000);
    setInterval(() => checarAniversarios(), 43200000);
    const ultimoDia = new Date();
    ultimoDia.setMonth(ultimoDia.getMonth() + 1, 0);
    if (new Date().getDate() === ultimoDia.getDate()) {
      setTimeout(() => Notificacoes.relatorioFaltando(), 10000);
    }
  }
  return { init, solicitarPermissao, notificarLocal, Notificacoes, checarPrazosABJ };
})();
window.PushModule = PushModule;
document.addEventListener('nupi:booted', () => PushModule.init());
