'use strict';
const PremiumCursor = (() => {
  let cx = -100, cy = -100;
  let rx = -100, ry = -100;
  let raf;
  function init() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    const dot  = document.createElement('div'); dot.id  = 'nupi-cursor';
    const ring = document.createElement('div'); ring.id = 'nupi-cursor-ring';
    document.body.append(dot, ring);
    document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1'; ring.style.opacity = '1';
    });
    document.addEventListener('mousedown', () => {
      dot.style.transform  = 'translate(-50%,-50%) scale(0.6)';
      ring.style.transform = 'translate(-50%,-50%) scale(0.85)';
    });
    document.addEventListener('mouseup', () => {
      dot.style.transform  = '';
      ring.style.transform = '';
    });
    function loop() {
      rx += (cx - rx) * 0.12;
      ry += (cy - ry) * 0.12;
      dot.style.left  = cx + 'px';
      dot.style.top   = cy + 'px';
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      raf = requestAnimationFrame(loop);
    }
    loop();
  }
  return { init };
})();
const PremiumParticles = (() => {
  let canvas, ctx, W, H, particles = [], raf;
  const CONFIG = {
    count:  55,
    speed:  0.25,
    radius: { min: 0.8, max: 2.2 },
    colors: [
      'rgba(247,84,18,',   
      'rgba(155,123,232,', 
      'rgba(180,155,255,', 
      'rgba(45,212,160,',  
    ],
    connect: 130, 
  };
  class Particle {
    constructor() { this.reset(true); }
    reset(initial) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : H + 10;
      this.vx = (Math.random() - .5) * CONFIG.speed;
      this.vy = -Math.random() * CONFIG.speed - .1;
      this.r  = CONFIG.radius.min + Math.random() * (CONFIG.radius.max - CONFIG.radius.min);
      this.a  = Math.random() * .6 + .1;
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      this.pulse = Math.random() * Math.PI * 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += 0.02;
      const pa = this.a * (.7 + .3 * Math.sin(this.pulse));
      if (this.y < -10 || this.x < -20 || this.x > W + 20) this.reset(false);
      return pa;
    }
    draw(alpha) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha + ')';
      ctx.fill();
    }
  }
  function connect() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < CONFIG.connect) {
          const a = (1 - d / CONFIG.connect) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(180,155,255,${a})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }
  }
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { const a = p.update(); p.draw(a); });
    connect();
    raf = requestAnimationFrame(loop);
  }
  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'nupi-particles';
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < CONFIG.count; i++) particles.push(new Particle());
    loop();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else loop();
  });
  return { init };
})();
const PremiumTilt = (() => {
  const MAX = 8; 
  function apply(card) {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = (e.clientX - cx) / (r.width  / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      card.style.transform = `perspective(600px) rotateX(${-dy*MAX}deg) rotateY(${dx*MAX}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform .5s var(--spring)';
      setTimeout(() => card.style.transition = '', 500);
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .12s var(--smooth)';
    });
  }
  function init() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('.sum-card').forEach(apply);
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.classList?.contains('sum-card')) apply(n);
        n.querySelectorAll?.('.sum-card').forEach(apply);
      }));
    }).observe(document.body, { childList: true, subtree: true });
  }
  return { init };
})();
const PremiumConfetti = (() => {
  const CORES = ['#f75412','#ff8040','#9b7be8','#2DD4A0','#F5C518','#ffffff'];
  function disparar(x, y) {
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed; width:${4+Math.random()*6}px; height:${4+Math.random()*6}px;
        border-radius:${Math.random()>.5?'50%':'2px'};
        background:${CORES[Math.floor(Math.random()*CORES.length)]};
        left:${x}px; top:${y}px; pointer-events:none; z-index:99999;
        animation: confettiPremium .9s ease-out forwards;
        --tx: ${(Math.random()-0.5)*160}px;
        --ty: ${-(Math.random()*120+40)}px;
        --rot: ${Math.random()*720}deg;
        animation-delay: ${Math.random()*.15}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confettiPremium {
      0%   { transform: translate(0,0) rotate(0deg); opacity:1; }
      100% { transform: translate(var(--tx),var(--ty)) rotate(var(--rot)); opacity:0; }
    }
  `;
  document.head.appendChild(style);
  return { disparar };
})();
const Haptic = {
  light()  { navigator.vibrate?.([10]); },
  medium() { navigator.vibrate?.([20]); },
  heavy()  { navigator.vibrate?.([40]); },
  success(){ navigator.vibrate?.([15, 10, 25]); },
  error()  { navigator.vibrate?.([30, 10, 30, 10, 30]); },
};
document.addEventListener('click', e => {
  const btn = e.target.closest('button, .btn, .nav-item, .sum-card, .kanban-card');
  if (!btn) return;
  if (btn.classList.contains('btn-primary')) Haptic.medium();
  else Haptic.light();
});
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.sum-card, .section-card, .kanban-card, .setting-card').forEach(el => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
    el.style.setProperty('--mouse-y', (e.clientY - r.top)  + 'px');
  });
});
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .nav-item');
  if (!btn) return;
  const r   = btn.getBoundingClientRect();
  const x   = e.clientX - r.left;
  const y   = e.clientY - r.top;
  const size = Math.max(r.width, r.height) * 2;
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position:absolute; border-radius:50%; pointer-events:none;
    width:${size}px; height:${size}px;
    left:${x - size/2}px; top:${y - size/2}px;
    background: rgba(255,255,255,0.18);
    transform: scale(0); opacity:1;
    animation: ripplePremium .55s var(--ease) forwards;
  `;
  if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripplePremium {
    to { transform: scale(1); opacity: 0; }
  }
`;
document.head.appendChild(rippleStyle);
function initPremium() {
  PremiumCursor.init();
  PremiumParticles.init();
  PremiumTilt.init();
  console.log('[NUPI Premium] v1.0 — Cursor, Partículas, 3D Tilt ativos.');
}
window.PremiumConfetti = PremiumConfetti;
window.Haptic = Haptic;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPremium);
} else {
  initPremium();
}
