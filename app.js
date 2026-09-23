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
const CALENDAR_REFRESH_MS = 60000;

// Filtre d'impact (orange seul / les deux / rouge seul) : partagé entre
// TOUTES les devises (le curseur ne fait pas partie d'une fenêtre de
// devise en particulier, voir index.html). Mémorisé sur l'appareil pour
// rester d'une session à l'autre.
const CALENDAR_IMPACT_STORAGE_KEY = 'fx-calendar-impact-filter';
let calendarImpactFilter = 'both'; // 'medium' | 'both' | 'high'
try {
  const stored = localStorage.getItem(CALENDAR_IMPACT_STORAGE_KEY);
  if (stored === 'medium' || stored === 'both' || stored === 'high') calendarImpactFilter = stored;
} catch (e) { /* stockage indisponible : on garde la valeur par défaut */ }

function getCalendarImpacts() {
  if (calendarImpactFilter === 'medium') return ['medium'];
  if (calendarImpactFilter === 'high') return ['high'];
  return ['high', 'medium'];
}

// MODE DÉMONSTRATION : si mis à true, le calendrier affiche
// uniquement les données FICTIVES ci-dessous et ne lit pas Supabase.
// À false, l'appli lit la table "calendar_events" : elle affiche les
// vraies données une fois le bot activé (voir supabase/INSTRUCTIONS.md),
// et se rabat sur les données fictives (avec un bandeau "Données
// d'exemple") seulement si la lecture échoue (table vide ou absente,
// pas encore connecté...).
const CALENDAR_USE_DEMO = false;

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
  const impacts = getCalendarImpacts();
  return (CALENDAR_DEMO[code] || [])
    .filter((r) => impacts.includes(r[1]))
    .map((r) => ({
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
    .in('impact', getCalendarImpacts())
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
  "Non-Farm Employment Change": "Créations d'emplois non agricoles (NFP)",
  "Unemployment Rate": "Taux de chômage",
  "Average Hourly Earnings m/m": "Salaire horaire moyen (mensuel)",
  "Unemployment Claims": "Demandes d'allocations chômage",
  "CPI m/m": "Inflation (CPI) mensuelle",
  "Core CPI m/m": "Inflation de base (CPI) mensuelle",
  "Core Retail Sales m/m": "Ventes au détail de base (mensuel)",
  "Federal Funds Rate": "Taux directeur de la Fed",
  "FOMC Statement": "Communiqué de la Fed (FOMC)",
  "German Flash Manufacturing PMI": "PMI manufacturier allemand (flash)",
  "German ZEW Economic Sentiment": "Confiance des investisseurs allemands (ZEW)",
  "Core CPI Flash Estimate y/y": "Inflation de base (CPI), estimation flash annuelle",
  "CPI Flash Estimate y/y": "Inflation (CPI), estimation flash annuelle",
  "ECB Main Refinancing Rate": "Taux directeur de la BCE",
  "ECB Press Conference": "Conférence de presse de la BCE",
  "Tokyo Core CPI y/y": "Inflation de base de Tokyo (CPI) annuelle",
  "Average Cash Earnings y/y": "Salaires moyens en espèces (annuel)",
  "National Core CPI y/y": "Inflation de base nationale (CPI) annuelle",
  "Prelim GDP q/q": "PIB (GDP) préliminaire trimestriel",
  "Tankan Manufacturing Index": "Enquête Tankan, industrie manufacturière",
  "BOJ Policy Rate": "Taux directeur de la BoJ",
  "BOJ Press Conference": "Conférence de presse de la BoJ",
  "Average Earnings Index 3m/y": "Salaires moyens sur 3 mois (annuel)",
  "Claimant Count Change": "Variation du nombre de demandeurs d'emploi",
  "CPI y/y": "Inflation (CPI) annuelle",
  "GDP m/m": "PIB (GDP) mensuel",
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
  "CPI q/q": "Inflation (CPI) trimestrielle",
  "GDP q/q": "PIB (GDP) trimestriel",
  "Official Cash Rate": "Taux directeur de la Banque de Nouvelle-Zélande",
  "RBNZ Rate Statement": "Communiqué de la Banque de Nouvelle-Zélande",
  "Manufacturing PMI": "PMI manufacturier",
  "Non-Manufacturing PMI": "PMI non manufacturier",
  "Caixin Manufacturing PMI": "PMI manufacturier Caixin",
  "GDP q/y": "PIB (GDP) annuel",
};

function translateEventTitle(title) {
  return CALENDAR_TRANSLATIONS[title] || String(title);
}

// =========================================================
// Traduction automatique (bouton "Traduire" de la barre d'outils).
// Complète les titres absents de CALENDAR_TRANSLATIONS ci-dessus, via
// un service gratuit mais NON officiel de Google (aucune clé, aucune
// inscription) : il peut ralentir, se limiter ou changer sans préavis,
// contrairement à une vraie API de traduction payante. Les traductions
// obtenues sont mémorisées (jamais redemandées deux fois pour le même
// texte) et persistées sur l'appareil.
// =========================================================
const CALENDAR_AUTO_TRANSLATE_STORAGE_KEY = 'fx-calendar-auto-translate';
const CALENDAR_TRANSLATE_CACHE_STORAGE_KEY = 'fx-calendar-translate-cache';
let calendarAutoTranslate = false;
let calendarTranslateCache = new Map();
try {
  calendarAutoTranslate = localStorage.getItem(CALENDAR_AUTO_TRANSLATE_STORAGE_KEY) === '1';
  const rawCache = localStorage.getItem(CALENDAR_TRANSLATE_CACHE_STORAGE_KEY);
  if (rawCache) calendarTranslateCache = new Map(Object.entries(JSON.parse(rawCache)));
} catch (e) { /* stockage indisponible : on repart sans historique */ }

function saveCalendarTranslateCache() {
  try {
    localStorage.setItem(CALENDAR_TRANSLATE_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(calendarTranslateCache)));
  } catch (e) { /* stockage indisponible : tant pis, on retraduira la prochaine fois */ }
}

// Titre affiché : dictionnaire connu en priorité, sinon (si la
// traduction automatique est activée) une traduction déjà en cache,
// sinon le titre d'origine en attendant.
function resolveEventTitle(title) {
  if (CALENDAR_TRANSLATIONS[title]) return CALENDAR_TRANSLATIONS[title];
  if (calendarAutoTranslate && calendarTranslateCache.has(title)) return calendarTranslateCache.get(title);
  return String(title);
}

async function translateToFrench(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Traduction : HTTP ${res.status}`);
  const data = await res.json();
  return data[0].map((chunk) => chunk[0]).join('');
}

// Traduit tous les titres de la liste qui ne sont ni dans le
// dictionnaire ni déjà en cache, puis redessine le calendrier une fois
// que c'est fait (peu importe l'ordre d'arrivée des réponses).
async function autoTranslateMissingTitles(code, events) {
  const missing = [...new Set(
    events
      .map((ev) => ev.title)
      .filter((title) => !CALENDAR_TRANSLATIONS[title] && !calendarTranslateCache.has(title)),
  )];
  if (!missing.length) return;

  await Promise.all(missing.map(async (title) => {
    try {
      const translated = await translateToFrench(title);
      calendarTranslateCache.set(title, translated);
    } catch (e) {
      console.error('Traduction automatique impossible pour « ' + title + ' » :', e);
    }
  }));

  saveCalendarTranslateCache();
  if (calendarAutoTranslate && lastCalendarEventsByCurrency[code] === events) {
    renderCalendar(code, events, false);
  }
}

// Icône "calendrier" — reprise à l'identique de period-calendar.js (TJP).
const CALENDAR_DATE_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5.5 1.5v3M10.5 1.5v3"/></svg>';

// "Prévue le ..." si l'événement n'a pas encore eu lieu, "Publiée le ..."
// sinon (Forex Factory ne donne jamais l'heure exacte de publication de
// la donnée sortie, seulement l'heure prévue de l'annonce).
function formatCalendarDateTime(iso) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const label = d.getTime() > Date.now() ? 'Prévue le' : 'Publiée le';
  return `${label} ${datePart} à ${timePart}`;
}

// Une seule bulle réutilisée pour tous les boutons calendrier du tableau.
let calendarDatePopup = null;
let calendarDateOpenBtn = null;

function closeCalendarDatePopup() {
  if (calendarDateOpenBtn) calendarDateOpenBtn.classList.remove('is-open');
  calendarDateOpenBtn = null;
  if (calendarDatePopup) calendarDatePopup.hidden = true;
}

function openCalendarDatePopup(btn) {
  if (calendarDateOpenBtn === btn) { closeCalendarDatePopup(); return; }
  closeCalendarDatePopup();

  if (!calendarDatePopup) {
    calendarDatePopup = document.createElement('div');
    calendarDatePopup.className = 'calendar-date-popup';
    calendarDatePopup.hidden = true;
    document.body.appendChild(calendarDatePopup);
  }

  calendarDatePopup.textContent = formatCalendarDateTime(btn.dataset.eventTime);
  calendarDatePopup.hidden = false;
  btn.classList.add('is-open');
  calendarDateOpenBtn = btn;

  // Positionnée juste sous le bouton, sans déborder de l'écran.
  const rect = btn.getBoundingClientRect();
  const popupRect = calendarDatePopup.getBoundingClientRect();
  let left = rect.left;
  if (left + popupRect.width > window.innerWidth - 8) left = window.innerWidth - popupRect.width - 8;
  if (left < 8) left = 8;
  calendarDatePopup.style.left = `${left}px`;
  calendarDatePopup.style.top = `${rect.bottom + 6}px`;
}

// Délégation sur tout le document : les lignes du calendrier sont
// régénérées à chaque rafraîchissement, un écouteur par bouton serait
// donc perdu à chaque fois.
document.addEventListener('click', (event) => {
  const btn = event.target.closest('.calendar-date-btn');
  if (btn) { openCalendarDatePopup(btn); return; }
  if (calendarDateOpenBtn && !event.target.closest('.calendar-date-popup')) closeCalendarDatePopup();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCalendarDatePopup();
});

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
      <td>
        <button type="button" class="calendar-date-btn" data-event-time="${escapeHtml(ev.event_time)}" aria-label="Voir la date et l'heure">${CALENDAR_DATE_ICON}</button>
        <span class="calendar-impact calendar-impact--${impact}"></span><span class="calendar-name" title="${escapeHtml(ev.title)}">${escapeHtml(resolveEventTitle(ev.title))}</span>
      </td>
      ${calendarCell(ev.actual, 'calendar-value--actual' + (actualDirection(ev) ? ' calendar-value--' + actualDirection(ev) : ''))}
      ${calendarCell(ev.forecast_mid)}
      ${calendarCell(ev.previous)}
    </tr>`;
  }).join('');

  html += `<div class="calendar-scroll">
    <table class="calendar-table">
      <thead>
        <tr>
          <th scope="col">Événement</th>
          <th scope="col">Sortie</th>
          <th scope="col">Prévision</th>
          <th scope="col">Avant</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  container.innerHTML = html;
}

const calendarRequestId = {};

// =========================================================
// Point de réinitialisation par devise : la dernière réunion de la
// banque centrale de cette devise. Tout ce qui précède cette réunion
// n'est plus affiché ; tout ce qui suit reste affiché indéfiniment
// (même sans valeur "Sortie", que Forex Factory ne donne jamais),
// jusqu'à la réunion suivante.
const CENTRAL_BANK_ANCHORS = {
  USD: 'FOMC Statement',
  EUR: 'ECB Press Conference',
  JPY: 'BOJ Press Conference',
  GBP: 'Official Bank Rate',
  CHF: 'SNB Monetary Policy Assessment',
  CAD: 'BOC Rate Statement',
  AUD: 'RBA Rate Statement',
  NZD: 'RBNZ Rate Statement',
  CNY: 'Loan Prime Rate', // PBoC, annoncé chaque mois (pas de réunion à date fixe comme les autres).
};

// Ne garde que les événements arrivés depuis la dernière réunion déjà
// passée de la banque centrale de cette devise (elle reste incluse).
// Si aucune réunion n'a encore été repérée dans les données reçues
// (le bot ne tourne peut-être pas encore depuis assez longtemps),
// on garde tout en attendant.
function filterSinceLastCentralBankMeeting(code, events) {
  const anchorTitle = CENTRAL_BANK_ANCHORS[code];
  if (!anchorTitle) return events;

  const now = Date.now();
  let cutoff = null;
  for (const ev of events) {
    if (!ev.title || !ev.title.toLowerCase().includes(anchorTitle.toLowerCase())) continue;
    const t = new Date(ev.event_time).getTime();
    if (t <= now && (cutoff === null || t > cutoff)) cutoff = t;
  }
  if (cutoff === null) return events;

  return events.filter((ev) => new Date(ev.event_time).getTime() >= cutoff);
}

const lastCalendarEventsByCurrency = {};

async function loadCalendar(code) {
  const requestId = (calendarRequestId[code] || 0) + 1;
  calendarRequestId[code] = requestId;

  let events, isDemo;
  if (CALENDAR_USE_DEMO) {
    events = demoCalendarEvents(code);
    isDemo = false;
  } else {
    const result = await fetchCalendarEvents(code);
    // Une réponse plus récente est déjà arrivée : on ignore celle-ci.
    if (calendarRequestId[code] !== requestId) return;
    isDemo = result.events === null;
    events = isDemo ? demoCalendarEvents(code) : filterSinceLastCentralBankMeeting(code, result.events);
  }

  lastCalendarEventsByCurrency[code] = events;
  renderCalendar(code, events, isDemo);
  if (calendarAutoTranslate) autoTranslateMissingTitles(code, events);
}

// Devise actuellement affichée : au niveau du module, pour que la barre
// d'outils partagée (filtre d'impact, traduction) sache quelle fenêtre
// rafraîchir quand on la manipule.
let currentCalendarCurrency = null;

function initCurrencyTabs() {
  const buttons = Array.from(document.querySelectorAll('.currency-card[data-currency]'));
  const panels = Array.from(document.querySelectorAll('.currency-panel'));
  if (!buttons.length) return;

  function selectCurrency(code) {
    currentCalendarCurrency = code;
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
  // la devise affichée toutes les minutes. Le statut du bot (fraîcheur
  // des données) est vérifié en même temps.
  window.setInterval(() => {
    if (currentCalendarCurrency && !document.hidden) loadCalendar(currentCalendarCurrency);
    if (!document.hidden) refreshCalendarStatus();
  }, CALENDAR_REFRESH_MS);
  refreshCalendarStatus();

  // Au démarrage, la session peut ne pas être encore restaurée : on
  // recharge dès qu'elle l'est (sinon les règles d'accès renverraient 0 ligne).
  if (window.Auth && window.Auth.onAuthStateChange) {
    window.Auth.onAuthStateChange((session) => {
      if (session && currentCalendarCurrency) loadCalendar(currentCalendarCurrency);
    });
  }

  // Devise affichée au démarrage : la première de la liste (USD).
  selectCurrency(buttons[0].dataset.currency);
}

// Fraîcheur du calendrier : lit l'heure de dernière exécution du bot
// (table "bot_status") et prévient si elle date de plus de 40 minutes
// (le bot tourne toutes les 30 minutes normalement) — un moyen simple
// de voir si le bot s'est arrêté de tourner, sans avoir à vérifier sur
// Supabase à chaque fois.
const CALENDAR_STATUS_STALE_MS = 40 * 60 * 1000;

async function refreshCalendarStatus() {
  const el = document.getElementById('calendarStatus');
  if (!el) return;
  const client = window.Auth && window.Auth.getClient ? window.Auth.getClient() : null;
  if (!client) return;

  const { data, error } = await client
    .from('bot_status')
    .select('last_run, ok, events_written')
    .eq('id', 'fetch-calendar')
    .maybeSingle();

  if (error || !data) { el.hidden = true; return; }

  const elapsedMs = Date.now() - new Date(data.last_run).getTime();
  const elapsedMin = Math.max(0, Math.round(elapsedMs / 60000));
  const isStale = elapsedMs > CALENDAR_STATUS_STALE_MS || !data.ok;

  el.hidden = false;
  el.classList.toggle('is-stale', isStale);
  el.textContent = isStale
    ? `⚠ Calendrier peut-être en retard — dernière mise à jour il y a ${elapsedMin} min`
    : `Calendrier à jour — dernière mise à jour il y a ${elapsedMin} min`;
}

// =========================================================
// Barre d'outils partagée du calendrier (filtre d'impact, traduction).
// Ne dépend d'aucune devise en particulier : son état est le même quel
// que soit l'onglet affiché (voir currentCalendarCurrency ci-dessus).
// =========================================================
function initCalendarToolbar() {
  const impactToggle = document.getElementById('calendarImpactToggle');
  const translateBtn = document.getElementById('calendarTranslateBtn');

  if (impactToggle) {
    impactToggle.dataset.value = calendarImpactFilter;
    for (const btn of impactToggle.querySelectorAll('.calendar-impact-toggle-btn')) {
      btn.setAttribute('aria-checked', String(btn.dataset.value === calendarImpactFilter));
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        if (value === calendarImpactFilter) return;
        calendarImpactFilter = value;
        impactToggle.dataset.value = value;
        for (const b of impactToggle.querySelectorAll('.calendar-impact-toggle-btn')) {
          b.setAttribute('aria-checked', String(b.dataset.value === value));
        }
        try { localStorage.setItem(CALENDAR_IMPACT_STORAGE_KEY, value); } catch (e) { /* tant pis */ }
        if (currentCalendarCurrency) loadCalendar(currentCalendarCurrency);
      });
    }
  }

  if (translateBtn) {
    translateBtn.setAttribute('aria-pressed', String(calendarAutoTranslate));
    translateBtn.addEventListener('click', () => {
      calendarAutoTranslate = !calendarAutoTranslate;
      translateBtn.setAttribute('aria-pressed', String(calendarAutoTranslate));
      try { localStorage.setItem(CALENDAR_AUTO_TRANSLATE_STORAGE_KEY, calendarAutoTranslate ? '1' : '0'); } catch (e) { /* tant pis */ }

      if (!currentCalendarCurrency) return;
      const events = lastCalendarEventsByCurrency[currentCalendarCurrency];
      if (!events) return;
      renderCalendar(currentCalendarCurrency, events, false);
      if (calendarAutoTranslate) autoTranslateMissingTitles(currentCalendarCurrency, events);
    });
  }
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  tick();
  window.setInterval(tick, 1000);

  const menu = initBurgerMenu();
  initTabs(() => menu && menu.closeMenu());
  initCalendarToolbar();
  initCurrencyTabs();

  initAuth();
  initThemePanel();
  registerServiceWorker();
});
