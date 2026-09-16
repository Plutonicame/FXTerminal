'use strict';

/**
 * app.js
 * Squelette de la PWA : nav bar (horloges + session), menu burger,
 * navigation entre les 2 onglets. Aucune donnée métier pour l'instant.
 */

/* =========================================================
   1. Horloges de sessions (New York / London / Tokyo)
   ========================================================= */
const CLOCKS = [
  { id: 'clock-ny', timeZone: 'America/New_York' },
  { id: 'clock-ldn', timeZone: 'Europe/London' },
  { id: 'clock-tky', timeZone: 'Asia/Tokyo' },
];

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function updateClocks() {
  const now = new Date();
  for (const clock of CLOCKS) {
    const el = document.getElementById(clock.id);
    if (!el) continue;
    el.textContent = formatTime(now, clock.timeZone);
  }
}

/* =========================================================
   2. Session de trading active (basé sur l'heure UTC)
   Plages indicatives standard du marché Forex :
   - Tokyo   : 00:00–09:00 UTC
   - London  : 08:00–17:00 UTC
   - New York: 13:00–22:00 UTC
   ========================================================= */
function getActiveSession(date) {
  const h = date.getUTCHours();

  const tokyoOpen = h >= 0 && h < 9;
  const londonOpen = h >= 8 && h < 17;
  const nyOpen = h >= 13 && h < 22;

  const open = [];
  if (tokyoOpen) open.push('Tokyo');
  if (londonOpen) open.push('London');
  if (nyOpen) open.push('New York');

  if (open.length === 0) return 'Marché calme';
  if (open.length === 1) return open[0];
  return open.join(' + ');
}

function updateSessionBadge() {
  const label = document.getElementById('sessionLabel');
  if (!label) return;
  label.textContent = getActiveSession(new Date());
}

/* =========================================================
   3. Boucle de mise à jour (1x / seconde)
   ========================================================= */
function tick() {
  updateClocks();
  updateSessionBadge();
}

/* =========================================================
   4. Menu burger
   ========================================================= */
function initBurgerMenu() {
  const burgerBtn = document.getElementById('burgerBtn');
  const sideMenu = document.getElementById('sideMenu');
  const closeBtn = document.getElementById('menuCloseBtn');

  if (!burgerBtn || !sideMenu || !closeBtn) return;

  function openMenu() {
    sideMenu.classList.add('is-open');
    sideMenu.setAttribute('aria-hidden', 'false');
    burgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sideMenu.classList.remove('is-open');
    sideMenu.setAttribute('aria-hidden', 'true');
    burgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    const isOpen = sideMenu.classList.contains('is-open');
    if (isOpen) closeMenu(); else openMenu();
  }

  burgerBtn.addEventListener('click', toggleMenu);
  closeBtn.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sideMenu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  return { closeMenu };
}

/* =========================================================
   5. Navigation entre les onglets
   ========================================================= */
function initTabs(onNavigate) {
  const tabButtons = Array.from(document.querySelectorAll('.menu-tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));

  function activateTab(tabId) {
    for (const btn of tabButtons) {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('is-active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    }
    for (const panel of panels) {
      const isActive = panel.id === tabId;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    }
  }

  for (const btn of tabButtons) {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tab);
      if (typeof onNavigate === 'function') onNavigate();
    });
  }
}

/* =========================================================
   6. Authentification (Supabase + Google)
   ========================================================= */
async function initAuth() {
  const loginScreen = document.getElementById('loginScreen');
  const appShell = document.getElementById('appShell');
  const googleBtn = document.getElementById('googleSignInBtn');
  const loginNote = document.getElementById('loginNote');
  const logoutBtn = document.getElementById('logoutBtn');
  const emailEl = document.getElementById('menuAccountEmail');

  if (!loginScreen || !appShell || !googleBtn) return;

  if (!window.Auth || !window.Auth.isConfigured()) {
    if (loginNote) {
      loginNote.hidden = false;
      loginNote.textContent = 'Supabase non configuré — renseigne js/supabase-config.js.';
    }
    googleBtn.disabled = true;
    return;
  }

  function showApp(session) {
    loginScreen.hidden = true;
    appShell.hidden = false;
    if (emailEl && session && session.user) {
      emailEl.textContent = session.user.email || '';
    }
  }

  function showLogin() {
    loginScreen.hidden = false;
    appShell.hidden = true;
  }

  const session = await window.Auth.getSession();
  if (session) {
    showApp(session);
  } else {
    showLogin();
  }

  window.Auth.onAuthStateChange((newSession) => {
    if (newSession) showApp(newSession);
    else showLogin();
  });

  googleBtn.addEventListener('click', () => {
    window.Auth.signInWithGoogle();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.Auth.signOut();
    });
  }
}

/* =========================================================
   7. Enregistrement du Service Worker (installabilité PWA)
   ========================================================= */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('Échec de l\'enregistrement du service worker :', err);
    });
  });
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  tick();
  window.setInterval(tick, 1000);

  const menu = initBurgerMenu();
  initTabs(() => menu && menu.closeMenu());

  initAuth();
  registerServiceWorker();
});
