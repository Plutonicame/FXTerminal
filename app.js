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

const MOBILE_QUERY = window.matchMedia('(max-width: 640px)');

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: MOBILE_QUERY.matches ? undefined : '2-digit',
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
  const tabButtons = Array.from(document.querySelectorAll('.menu-tab[data-tab]'));
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

  if (!loginScreen || !appShell || !googleBtn) return;

  if (!window.Auth || !window.Auth.isConfigured()) {
    if (loginNote) {
      loginNote.hidden = false;
      loginNote.textContent = 'Supabase non configuré — renseigne supabase-config.js.';
    }
    googleBtn.disabled = true;
    return;
  }

  function showApp() {
    loginScreen.hidden = true;
    appShell.hidden = false;
  }

  function showLogin() {
    loginScreen.hidden = false;
    appShell.hidden = true;
  }

  // IMPORTANT : on met en place l'écouteur AVANT de vérifier la session
  // initiale. Si on faisait l'inverse, l'événement de connexion déclenché
  // par le retour de redirection Google pourrait arriver pendant qu'on
  // attend getSession(), et on le raterait complètement.
  window.Auth.onAuthStateChange((newSession) => {
    if (newSession) showApp();
    else showLogin();
  });

  const session = await window.Auth.getSession();
  if (session) {
    showApp();
  } else {
    showLogin();
  }

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
   7. Panneau Thème & Mode Stylo
   ========================================================= */
function initThemePanel() {
  const openBtn = document.getElementById('themeBtn');
  const closeBtn = document.getElementById('themePanelToggleBtn');
  const panel = document.getElementById('themePanel');

  if (!openBtn || !closeBtn || !panel) return;

  function openPanel() {
    panel.classList.add('is-open');
  }

  function closePanel() {
    panel.classList.remove('is-open');
    // Referme tout ce qui aurait pu rester ouvert (menus dépliés,
    // sélecteur de couleur), pour repartir sur une base propre la
    // prochaine fois qu'on rouvre le panneau.
    document.querySelectorAll('.theme-accordion-row.is-open').forEach((row) => {
      row.classList.remove('is-open');
    });
    document.querySelectorAll('.theme-accordion.is-open').forEach((wrapper) => {
      wrapper.classList.remove('is-open');
    });
    const cpOverlay = document.getElementById('cpOverlay');
    if (cpOverlay) cpOverlay.classList.remove('is-open');
  }

  openBtn.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      closePanel();
    }
  });

  // Accordéons : bascule la ligne ET son conteneur parent (qui contrôle
  // l'affichage du contenu dépliable via CSS).
  const rows = Array.from(document.querySelectorAll('.theme-accordion-row'));
  for (const row of rows) {
    row.addEventListener('click', () => {
      row.classList.toggle('is-open');
      const wrapper = row.closest('.theme-accordion');
      if (wrapper) wrapper.classList.toggle('is-open');
    });
  }

  // "Replier les couleurs" : referme les menus dépliés ET ferme le
  // panneau entier (même effet que de recliquer sur "Thème").
  const collapseBtn = document.getElementById('collapseColorsBtn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      for (const row of rows) {
        row.classList.remove('is-open');
        const wrapper = row.closest('.theme-accordion');
        if (wrapper) wrapper.classList.remove('is-open');
      }
      closePanel();
    });
  }

  // "Appliquer" et "Réinitialiser" pilotent désormais le vrai système de
  // couleurs personnalisables (voir theme-colors.js). La sauvegarde
  // cloud (Supabase) n'est pas encore branchée à ce stade — pour
  // l'instant, tout est sauvegardé en local sur l'appareil.
  const applyBtn = document.getElementById('applySettingsBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      if (window.ThemeColors) window.ThemeColors.apply();
    });
  }

  const resetBtn = document.getElementById('resetSettingsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (window.ThemeColors) window.ThemeColors.reset();
    });
  }
}

/* =========================================================
   8. Enregistrement du Service Worker (installabilité PWA)
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
   6bis. Barre des devises + calendrier économique
   (onglet Analyse par devise). Un clic sur une devise affiche sa
   propre fenêtre, avec les événements importants (impact rouge et
   orange) lus dans la table Supabase "calendar_events".
   ========================================================= */
const CALENDAR_IMPACTS = ['high', 'medium'];
const CALENDAR_REFRESH_MS = 60000;

// Données FICTIVES, affichées seulement tant que la table Supabase
// "calendar_events" est inaccessible (pas encore créée), avec un bandeau
// "Données d'exemple". Dès que la table existe, elles ne servent plus.
// Ligne : [nom, impact, avant, prév. basse, prév. moyenne, prév. haute, sortie]
const CALENDAR_DEMO = {
  USD: [["Non-Farm Employment Change", "high", "73K", "40K", "75K", "110K", null], ["CPI m/m", "high", "0.2%", "0.1%", "0.3%", "0.4%", "0.3%"], ["Unemployment Claims", "medium", "231K", "225K", "230K", "238K", null]],
  EUR: [["ECB Main Refinancing Rate", "high", "2.15%", "2.15%", "2.15%", "2.15%", "2.15%"], ["CPI Flash Estimate y/y", "high", "2.0%", "1.9%", "2.1%", "2.2%", null], ["German ZEW Economic Sentiment", "medium", "34.7", "30.0", "36.0", "41.0", null]],
  JPY: [["BOJ Policy Rate", "high", "0.50%", "0.50%", "0.50%", "0.75%", null], ["National Core CPI y/y", "medium", "3.1%", "2.9%", "3.0%", "3.2%", "3.0%"]],
  GBP: [["Official Bank Rate", "high", "4.00%", "4.00%", "4.00%", "4.00%", null], ["CPI y/y", "high", "3.8%", "3.7%", "3.8%", "3.9%", null], ["GDP m/m", "medium", "0.0%", "-0.1%", "0.1%", "0.2%", null]],
  CHF: [["SNB Policy Rate", "high", "0.00%", "0.00%", "0.00%", "0.00%", "0.00%"], ["CPI m/m", "medium", "0.0%", "-0.1%", "0.0%", "0.1%", null]],
  CAD: [["Employment Change", "high", "-40.8K", "-5.0K", "5.0K", "15.0K", null], ["BOC Rate Statement", "high", "", "", "", "", null], ["CPI m/m", "medium", "0.3%", "0.1%", "0.2%", "0.3%", null]],
  AUD: [["Cash Rate", "high", "3.60%", "3.60%", "3.60%", "3.60%", null], ["Employment Change", "high", "24.5K", "15.0K", "22.0K", "30.0K", null], ["Wage Price Index q/q", "medium", "0.9%", "0.8%", "0.9%", "1.0%", null]],
  NZD: [["Official Cash Rate", "high", "3.00%", "2.75%", "3.00%", "3.00%", null], ["GDP q/q", "high", "-0.9%", "0.1%", "0.3%", "0.5%", null], ["Trade Balance", "medium", "-390M", "-450M", "-300M", "-150M", null]],
  CNY: [["GDP q/y", "high", "5.2%", "4.9%", "5.1%", "5.3%", null], ["Manufacturing PMI", "medium", "49.4", "49.3", "49.5", "49.8", "49.4"], ["CPI y/y", "medium", "0.0%", "-0.1%", "0.1%", "0.2%", null]],
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function demoCalendarEvents(code) {
  return (CALENDAR_DEMO[code] || []).map((r) => ({
    title: r[0],
    impact: r[1],
    previous: r[2],
    forecast_low: r[3],
    forecast_mid: r[4],
    forecast_high: r[5],
    actual: r[6],
  }));
}

// Renvoie { events } (tableau, éventuellement vide) ou { events: null }
// si la lecture est impossible (client absent, table inexistante...).
async function fetchCalendarEvents(code) {
  const client = window.Auth && window.Auth.getClient ? window.Auth.getClient() : null;
  if (!client) return { events: null };
  const { data, error } = await client
    .from('calendar_events')
    .select('title, impact, previous, forecast_low, forecast_mid, forecast_high, actual, event_time')
    .eq('currency', code)
    .in('impact', CALENDAR_IMPACTS)
    .order('event_time', { ascending: true });
  if (error) {
    console.error('Calendrier économique : lecture impossible :', error);
    return { events: null };
  }
  return { events: data || [] };
}

function calendarCell(value, extraClass) {
  const text = value === null || value === undefined || value === '' ? '—' : escapeHtml(value);
  return `<td class="calendar-value${extraClass ? ' ' + extraClass : ''}">${text}</td>`;
}

function renderCalendar(code, events, isDemo) {
  const container = document.querySelector(`.calendar[data-currency="${code}"]`);
  if (!container) return;

  let html = '';
  if (isDemo) {
    html += '<p class="calendar-note">Données d\'exemple — calendrier réel pas encore branché</p>';
  }

  if (!events.length) {
    html += '<div class="calendar-scroll"><p class="calendar-empty">Aucun événement important</p></div>';
    container.innerHTML = html;
    return;
  }

  const rows = events.map((ev) => {
    const impact = ev.impact === 'high' ? 'high' : 'medium';
    return `<tr>
      <td><span class="calendar-impact calendar-impact--${impact}"></span><span class="calendar-name">${escapeHtml(ev.title)}</span></td>
      ${calendarCell(ev.previous)}
      ${calendarCell(ev.forecast_low)}
      ${calendarCell(ev.forecast_mid)}
      ${calendarCell(ev.forecast_high)}
      ${calendarCell(ev.actual, 'calendar-value--actual')}
    </tr>`;
  }).join('');

  html += `<div class="calendar-scroll">
    <table class="calendar-table">
      <thead>
        <tr>
          <th scope="col">Événement</th>
          <th scope="col">Avant</th>
          <th scope="col">Prév. basse</th>
          <th scope="col">Prév. moy.</th>
          <th scope="col">Prév. haute</th>
          <th scope="col">Sortie</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  container.innerHTML = html;
}

const calendarRequestId = {};

async function loadCalendar(code) {
  const requestId = (calendarRequestId[code] || 0) + 1;
  calendarRequestId[code] = requestId;

  const { events } = await fetchCalendarEvents(code);
  // Une réponse plus récente est déjà arrivée : on ignore celle-ci.
  if (calendarRequestId[code] !== requestId) return;

  if (events === null) renderCalendar(code, demoCalendarEvents(code), true);
  else renderCalendar(code, events, false);
}

function initCurrencyTabs() {
  const buttons = Array.from(document.querySelectorAll('.currency-card[data-currency]'));
  const panels = Array.from(document.querySelectorAll('.currency-panel'));
  if (!buttons.length) return;

  let activeCode = null;

  function selectCurrency(code) {
    activeCode = code;
    for (const btn of buttons) {
      const isActive = btn.dataset.currency === code;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.currency !== code;
    }
    loadCalendar(code);
  }

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      selectCurrency(btn.dataset.currency);
      btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    });
  }

  // Les valeurs "sortie" arrivent après la publication : on rafraîchit
  // la devise affichée toutes les minutes.
  window.setInterval(() => {
    if (activeCode && !document.hidden) loadCalendar(activeCode);
  }, CALENDAR_REFRESH_MS);

  // Au démarrage, la session peut ne pas être encore restaurée : on
  // recharge dès qu'elle l'est (sinon les règles d'accès renverraient 0 ligne).
  if (window.Auth && window.Auth.onAuthStateChange) {
    window.Auth.onAuthStateChange((session) => {
      if (session && activeCode) loadCalendar(activeCode);
    });
  }

  // Devise affichée au démarrage : la première de la liste (USD).
  selectCurrency(buttons[0].dataset.currency);
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  tick();
  window.setInterval(tick, 1000);

  const menu = initBurgerMenu();
  initTabs(() => menu && menu.closeMenu());
  initCurrencyTabs();

  initAuth();
  initThemePanel();
  registerServiceWorker();
});
