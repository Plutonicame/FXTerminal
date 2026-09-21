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

// MODE DÉMONSTRATION : tant que c'est à true, le calendrier affiche
// uniquement les données FICTIVES ci-dessous (événements rouges et
// orange dans le style de Forex Factory) et ne lit pas Supabase.
// Passer à false quand les vraies données seront branchées dans la
// table "calendar_events".
const CALENDAR_USE_DEMO = true;

// Ligne : [nom, impact, avant, prév. basse, prév. moyenne, prév. haute, sortie]
const CALENDAR_DEMO = {
  USD: [["Non-Farm Employment Change", "high", "73K", "45K", "75K", "110K", "82K"], ["Unemployment Rate", "high", "4.3%", "4.2%", "4.3%", "4.4%", "4.3%"], ["Average Hourly Earnings m/m", "high", "0.3%", "0.2%", "0.3%", "0.4%", "0.4%"], ["Unemployment Claims", "medium", "231K", "224K", "230K", "238K", "228K"], ["CPI m/m", "high", "0.2%", "0.1%", "0.3%", "0.4%", null], ["Core CPI m/m", "high", "0.3%", "0.2%", "0.3%", "0.4%", null], ["Core Retail Sales m/m", "medium", "0.4%", "0.1%", "0.3%", "0.6%", null], ["Federal Funds Rate", "high", "4.25%", "4.00%", "4.00%", "4.25%", null], ["FOMC Statement", "high", "", "", "", "", null]],
  EUR: [["German Flash Manufacturing PMI", "medium", "49.8", "49.5", "50.2", "51.0", "50.4"], ["German ZEW Economic Sentiment", "medium", "34.7", "30.0", "36.0", "41.0", "37.3"], ["Core CPI Flash Estimate y/y", "high", "2.3%", "2.2%", "2.3%", "2.4%", "2.3%"], ["CPI Flash Estimate y/y", "high", "2.0%", "1.9%", "2.1%", "2.2%", null], ["Unemployment Rate", "medium", "6.2%", "6.2%", "6.3%", "6.4%", null], ["ECB Main Refinancing Rate", "high", "2.15%", "2.15%", "2.15%", "2.15%", null], ["ECB Press Conference", "high", "", "", "", "", null]],
  JPY: [["Tokyo Core CPI y/y", "medium", "2.5%", "2.4%", "2.6%", "2.8%", "2.6%"], ["Average Cash Earnings y/y", "medium", "3.4%", "2.8%", "3.2%", "3.6%", "3.1%"], ["National Core CPI y/y", "medium", "3.1%", "2.9%", "3.0%", "3.2%", null], ["Prelim GDP q/q", "medium", "0.5%", "-0.3%", "0.1%", "0.4%", null], ["Tankan Manufacturing Index", "medium", "13", "11", "13", "15", null], ["BOJ Policy Rate", "high", "0.50%", "0.50%", "0.50%", "0.75%", null], ["BOJ Press Conference", "high", "", "", "", "", null]],
  GBP: [["Average Earnings Index 3m/y", "high", "5.0%", "4.7%", "4.9%", "5.1%", "4.8%"], ["Claimant Count Change", "medium", "8.9K", "5.0K", "10.0K", "18.0K", "12.4K"], ["CPI y/y", "high", "3.8%", "3.7%", "3.8%", "3.9%", null], ["GDP m/m", "medium", "0.0%", "-0.1%", "0.1%", "0.2%", null], ["Retail Sales m/m", "medium", "0.6%", "-0.4%", "0.2%", "0.6%", null], ["MPC Official Bank Rate Votes", "high", "5-4-0", "6-3-0", "6-3-0", "6-3-0", null], ["Official Bank Rate", "high", "4.00%", "4.00%", "4.00%", "4.00%", null]],
  CHF: [["Trade Balance", "medium", "3.85B", "3.50B", "3.90B", "4.30B", "3.72B"], ["CPI m/m", "medium", "0.0%", "-0.1%", "0.0%", "0.1%", "0.1%"], ["KOF Economic Barometer", "medium", "98.4", "97.0", "98.5", "100.0", null], ["Retail Sales y/y", "medium", "0.6%", "-0.2%", "0.5%", "1.1%", null], ["SNB Policy Rate", "high", "0.00%", "0.00%", "0.00%", "0.00%", null], ["SNB Monetary Policy Assessment", "high", "", "", "", "", null]],
  CAD: [["Employment Change", "high", "-40.8K", "-8.0K", "5.0K", "18.0K", "12.3K"], ["Unemployment Rate", "high", "7.1%", "7.1%", "7.2%", "7.3%", "7.1%"], ["CPI m/m", "high", "0.3%", "0.1%", "0.2%", "0.3%", null], ["Core Retail Sales m/m", "medium", "0.2%", "0.0%", "0.3%", "0.6%", null], ["GDP m/m", "high", "0.1%", "-0.1%", "0.1%", "0.3%", null], ["Ivey PMI", "medium", "54.1", "51.0", "53.0", "56.0", null], ["Overnight Rate", "high", "2.50%", "2.50%", "2.50%", "2.50%", null], ["BOC Rate Statement", "high", "", "", "", "", null]],
  AUD: [["Westpac Consumer Sentiment", "medium", "-3.5%", "-2.0%", "0.5%", "3.0%", "1.2%"], ["Wage Price Index q/q", "high", "0.9%", "0.8%", "0.9%", "1.0%", "0.9%"], ["Employment Change", "high", "24.5K", "15.0K", "22.0K", "30.0K", null], ["Unemployment Rate", "high", "4.2%", "4.2%", "4.3%", "4.4%", null], ["Retail Sales m/m", "medium", "0.5%", "0.1%", "0.4%", "0.7%", null], ["Cash Rate", "high", "3.60%", "3.60%", "3.60%", "3.60%", null], ["RBA Rate Statement", "high", "", "", "", "", null]],
  NZD: [["GDT Price Index", "medium", "-1.2%", "-2.0%", "0.0%", "1.5%", "0.6%"], ["Trade Balance", "medium", "-390M", "-450M", "-300M", "-150M", "-262M"], ["CPI q/q", "high", "0.5%", "0.4%", "0.6%", "0.8%", null], ["Employment Change", "high", "0.1%", "-0.2%", "0.1%", "0.3%", null], ["GDP q/q", "high", "-0.9%", "0.1%", "0.3%", "0.5%", null], ["Official Cash Rate", "high", "3.00%", "2.75%", "3.00%", "3.00%", null], ["RBNZ Rate Statement", "high", "", "", "", "", null]],
  CNY: [["Manufacturing PMI", "medium", "49.4", "49.3", "49.5", "49.8", "49.6"], ["Non-Manufacturing PMI", "medium", "50.1", "50.0", "50.2", "50.5", "50.3"], ["Caixin Manufacturing PMI", "medium", "50.3", "49.8", "50.2", "50.6", null], ["CPI y/y", "medium", "0.0%", "-0.1%", "0.1%", "0.2%", null], ["Trade Balance", "medium", "98.2B", "90.0B", "96.0B", "102.0B", null], ["Retail Sales y/y", "medium", "3.4%", "2.6%", "3.0%", "3.5%", null], ["GDP q/y", "high", "5.2%", "4.9%", "5.1%", "5.3%", null]],
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

// Convertit "73K", "-40.8K", "4.3%", "3.85B"... en nombre. Renvoie null si
// la valeur n'est pas un simple nombre (ex. "5-4-0", vide).
function parseCalendarNumber(value) {
  if (value === null || value === undefined) return null;
  const m = String(value).trim().match(/^(-?\d+(?:\.\d+)?)\s*([KMBT])?\s*%?$/i);
  if (!m) return null;
  const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  return parseFloat(m[1]) * (m[2] ? multipliers[m[2].toUpperCase()] : 1);
}

// Sens de la valeur sortie par rapport à la prévision moyenne :
// 'up' (au-dessus), 'down' (en dessous) ou '' (égale / non comparable).
function actualDirection(ev) {
  const actual = parseCalendarNumber(ev.actual);
  const forecast = parseCalendarNumber(ev.forecast_mid);
  if (actual === null || forecast === null) return '';
  if (actual > forecast) return 'up';
  if (actual < forecast) return 'down';
  return '';
}

// Noms des événements en français. Les clés sont les noms d'origine
// (en anglais, tels que Forex Factory les publie). Un événement absent de
// cette liste s'affiche avec son nom d'origine. Le nom d'origine reste
// visible en maintenant le doigt (ou en survolant) le nom. Pour ajouter
// une traduction, ajouter simplement une ligne à cette liste.
const CALENDAR_TRANSLATIONS = {
  "Non-Farm Employment Change": "Créations d'emplois non agricoles",
  "Unemployment Rate": "Taux de chômage",
  "Average Hourly Earnings m/m": "Salaire horaire moyen (mensuel)",
  "Unemployment Claims": "Demandes d'allocations chômage",
  "CPI m/m": "Inflation (IPC) mensuelle",
  "Core CPI m/m": "Inflation de base (IPC) mensuelle",
  "Core Retail Sales m/m": "Ventes au détail de base (mensuel)",
  "Federal Funds Rate": "Taux directeur de la Fed",
  "FOMC Statement": "Communiqué de la Fed",
  "German Flash Manufacturing PMI": "PMI manufacturier allemand (flash)",
  "German ZEW Economic Sentiment": "Confiance des investisseurs allemands (ZEW)",
  "Core CPI Flash Estimate y/y": "Inflation de base, estimation flash (annuelle)",
  "CPI Flash Estimate y/y": "Inflation, estimation flash (annuelle)",
  "ECB Main Refinancing Rate": "Taux directeur de la BCE",
  "ECB Press Conference": "Conférence de presse de la BCE",
  "Tokyo Core CPI y/y": "Inflation de base de Tokyo (annuelle)",
  "Average Cash Earnings y/y": "Salaires moyens en espèces (annuel)",
  "National Core CPI y/y": "Inflation de base nationale (annuelle)",
  "Prelim GDP q/q": "PIB préliminaire (trimestriel)",
  "Tankan Manufacturing Index": "Enquête Tankan, industrie manufacturière",
  "BOJ Policy Rate": "Taux directeur de la BoJ",
  "BOJ Press Conference": "Conférence de presse de la BoJ",
  "Average Earnings Index 3m/y": "Salaires moyens sur 3 mois (annuel)",
  "Claimant Count Change": "Variation du nombre de demandeurs d'emploi",
  "CPI y/y": "Inflation (IPC) annuelle",
  "GDP m/m": "PIB (mensuel)",
  "Retail Sales m/m": "Ventes au détail (mensuel)",
  "MPC Official Bank Rate Votes": "Votes du comité de politique monétaire",
  "Official Bank Rate": "Taux directeur de la BoE",
  "Trade Balance": "Balance commerciale",
  "KOF Economic Barometer": "Baromètre économique KOF",
  "Retail Sales y/y": "Ventes au détail (annuel)",
  "SNB Policy Rate": "Taux directeur de la BNS",
  "SNB Monetary Policy Assessment": "Évaluation de politique monétaire de la BNS",
  "Employment Change": "Variation de l'emploi",
  "Ivey PMI": "PMI Ivey",
  "Overnight Rate": "Taux directeur de la Banque du Canada",
  "BOC Rate Statement": "Communiqué de la Banque du Canada",
  "Westpac Consumer Sentiment": "Confiance des consommateurs Westpac",
  "Wage Price Index q/q": "Indice des salaires (trimestriel)",
  "Cash Rate": "Taux directeur de la Banque d'Australie",
  "RBA Rate Statement": "Communiqué de la Banque d'Australie",
  "GDT Price Index": "Prix des produits laitiers (GDT)",
  "CPI q/q": "Inflation (IPC) trimestrielle",
  "GDP q/q": "PIB (trimestriel)",
  "Official Cash Rate": "Taux directeur de la Banque de Nouvelle-Zélande",
  "RBNZ Rate Statement": "Communiqué de la Banque de Nouvelle-Zélande",
  "Manufacturing PMI": "PMI manufacturier",
  "Non-Manufacturing PMI": "PMI non manufacturier",
  "Caixin Manufacturing PMI": "PMI manufacturier Caixin",
  "GDP q/y": "PIB (annuel)",
};

function translateEventTitle(title) {
  return CALENDAR_TRANSLATIONS[title] || String(title);
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
      <td><span class="calendar-impact calendar-impact--${impact}"></span><span class="calendar-name" title="${escapeHtml(ev.title)}">${escapeHtml(translateEventTitle(ev.title))}</span></td>
      ${calendarCell(ev.actual, 'calendar-value--actual' + (actualDirection(ev) ? ' calendar-value--' + actualDirection(ev) : ''))}
      ${calendarCell(ev.forecast_high)}
      ${calendarCell(ev.forecast_mid)}
      ${calendarCell(ev.forecast_low)}
      ${calendarCell(ev.previous)}
    </tr>`;
  }).join('');

  html += `<div class="calendar-scroll">
    <table class="calendar-table">
      <thead>
        <tr>
          <th scope="col">Événement</th>
          <th scope="col">Sortie</th>
          <th scope="col">Prévision haute</th>
          <th scope="col">Prévision moyenne</th>
          <th scope="col">Prévision basse</th>
          <th scope="col">Avant</th>
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

  if (CALENDAR_USE_DEMO) {
    renderCalendar(code, demoCalendarEvents(code), false);
    return;
  }

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
