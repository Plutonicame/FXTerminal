'use strict';

/**
 * theme-colors.js
 * Système de personnalisation des couleurs, porté depuis l'ancien projet
 * (TJP) : roue de saturation/luminosité, curseur de teinte, champ hex,
 * couleurs récemment utilisées. Réutilisé pour n'importe quel champ de
 * couleur de l'appli (pour l'instant : la section "Connexion").
 *
 * Persistance : les couleurs choisies sont stockées dans localStorage.
 * La sauvegarde dans le cloud (Supabase) n'est pas encore branchée —
 * ce sera la prochaine étape une fois qu'une table de paramètres
 * utilisateur existera côté Supabase.
 */

const THEME_STORAGE_KEY = 'fx_theme_vars';

/* =========================================================
   1. Registre des champs de couleur personnalisables, par section
   ========================================================= */
const THEME_FIELDS = {
  connexion: [
    { v: '--auth-bg', l: 'Fond de la connexion', section: 'Écran de connexion' },
    { v: '--auth-google-btn-bg', l: 'Bouton Google — fond', section: 'Écran de connexion' },
    { v: '--auth-text-color', l: 'Texte au-dessus', section: 'Écran de connexion' },
    { v: '--auth-google-text-color', l: 'Texte du bouton Google', section: 'Écran de connexion' },
  ],
  analyse: [],
  evenements: [],
  parametres: [
    { v: '--settings-row-bg', l: 'Fond', category: 'Thème', section: 'Bandeau' },
    { v: '--settings-row-border', l: 'Bordure', category: 'Thème', section: 'Bandeau' },
    { v: '--settings-row-text', l: 'Texte', category: 'Thème', section: 'Bandeau' },

    { v: '--settings-btn-bg', l: 'Fond', category: 'Thème', section: 'Bouton' },
    { v: '--settings-btn-border', l: 'Bordure', category: 'Thème', section: 'Bouton' },
    { v: '--settings-btn-text', l: 'Texte', category: 'Thème', section: 'Bouton' },

    { v: '--accordion-content-bg', l: 'Fond', category: 'Menu déplié', section: 'Contenu (ex. Connexion)' },
    { v: '--accordion-content-title-color', l: 'Titre', category: 'Menu déplié', section: 'Contenu (ex. Connexion)' },
    { v: '--accordion-content-text', l: 'Texte', category: 'Menu déplié', section: 'Contenu (ex. Connexion)' },
    { v: '--accordion-content-border', l: 'Bordure du panneau', category: 'Menu déplié', section: 'Contenu (ex. Connexion)' },
    { v: '--accordion-swatch-border', l: 'Bordure des carrés de couleur', category: 'Menu déplié', section: 'Contenu (ex. Connexion)' },

    { v: '--cp-modal-bg', l: 'Fond', category: 'Sélecteur de couleur', section: 'Fenêtre' },
    { v: '--cp-modal-border', l: 'Bordure', category: 'Sélecteur de couleur', section: 'Fenêtre' },
    { v: '--cp-modal-text', l: 'Texte', category: 'Sélecteur de couleur', section: 'Fenêtre' },

    { v: '--btn-collapse-bg', l: 'Fond', category: 'Boutons du bas', section: 'Replier les couleurs' },
    { v: '--btn-collapse-border', l: 'Bordure', category: 'Boutons du bas', section: 'Replier les couleurs' },
    { v: '--btn-collapse-text', l: 'Texte', category: 'Boutons du bas', section: 'Replier les couleurs' },

    { v: '--btn-reset-bg', l: 'Fond', category: 'Boutons du bas', section: 'Réinitialiser' },
    { v: '--btn-reset-border', l: 'Bordure', category: 'Boutons du bas', section: 'Réinitialiser' },
    { v: '--btn-reset-text', l: 'Texte', category: 'Boutons du bas', section: 'Réinitialiser' },

    { v: '--btn-apply-bg', l: 'Fond', category: 'Boutons du bas', section: 'Appliquer' },
    { v: '--btn-apply-border', l: 'Bordure', category: 'Boutons du bas', section: 'Appliquer' },
    { v: '--btn-apply-text', l: 'Texte', category: 'Boutons du bas', section: 'Appliquer' },
  ],
  general: [
    { v: '--nav-bg', l: 'Fond', section: 'Barre de navigation' },
    { v: '--nav-border', l: 'Bordure (en dessous)', section: 'Barre de navigation' },
    { v: '--clock-time-color', l: "Texte de l'heure", section: 'Horloges' },
    { v: '--clock-city-color', l: 'Texte au-dessus (villes)', section: 'Horloges' },
    { v: '--session-bg', l: 'Fond', section: 'Case des sessions' },
    { v: '--session-text-color', l: 'Texte', section: 'Case des sessions' },
    { v: '--session-border', l: 'Bordure', section: 'Case des sessions' },
    { v: '--burger-bg', l: 'Fond', section: 'Menu burger' },
    { v: '--burger-border', l: 'Bordure', section: 'Menu burger' },
    { v: '--burger-bars-color', l: 'Les 3 traits', section: 'Menu burger' },
  ],
};

/* =========================================================
   2. État des couleurs personnalisées (chargé depuis localStorage)
   ========================================================= */
let themeVars = {};

function loadThemeVars() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    themeVars = raw ? JSON.parse(raw) : {};
  } catch (e) {
    themeVars = {};
  }
}

function saveThemeVars() {
  showSaveSpinner();
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeVars));
  } catch (e) {
    console.error('Impossible de sauvegarder les couleurs en local :', e);
  }
  // La sauvegarde locale est instantanée ; on garde le rond visible un
  // court instant pour qu'il soit perceptible (utile aussi le jour où
  // ce sera une vraie sauvegarde cloud, potentiellement plus longue).
  window.setTimeout(hideSaveSpinner, 500);
}

let saveSpinnerTimeout = null;

function showSaveSpinner() {
  const el = document.getElementById('saveSpinner');
  if (!el) return;
  if (saveSpinnerTimeout) {
    window.clearTimeout(saveSpinnerTimeout);
    saveSpinnerTimeout = null;
  }
  el.classList.add('is-visible');
}

function hideSaveSpinner() {
  const el = document.getElementById('saveSpinner');
  if (el) el.classList.remove('is-visible');
}

function previewThemeVars() {
  Object.entries(themeVars).forEach(([v, c]) => {
    document.documentElement.style.setProperty(v, c);
  });
}

/* =========================================================
   3. Conversions couleur (hex <-> hsl), identiques à TJP
   ========================================================= */
function hsl2hex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

function hex2hsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h, s;
  const l = (mx + mn) / 2;
  if (mx === mn) {
    h = s = 0;
  } else {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

/* =========================================================
   4. Moteur du sélecteur de couleur (canvas + curseur + teinte)
   ========================================================= */
let cpCB = null;
let cpH = 0, cpS = 1, cpL = 0.5, cpCX = 1, cpCY = 0, cpDrag = false;
const cpMem = (() => {
  try {
    return JSON.parse(localStorage.getItem('fx_cp_mem') || '[]');
  } catch (e) {
    return [];
  }
})();

function drawSpec() {
  const c = document.getElementById('cpCanvas');
  const w = document.getElementById('cpWrap');
  if (!c || !w) return;
  c.width = w.offsetWidth || 300;
  c.height = 144;
  const ctx = c.getContext('2d');
  const gW = ctx.createLinearGradient(0, 0, c.width, 0);
  gW.addColorStop(0, '#fff');
  gW.addColorStop(1, `hsl(${cpH},100%,50%)`);
  ctx.fillStyle = gW;
  ctx.fillRect(0, 0, c.width, c.height);
  const gB = ctx.createLinearGradient(0, 0, 0, c.height);
  gB.addColorStop(0, 'rgba(0,0,0,0)');
  gB.addColorStop(1, '#000');
  ctx.fillStyle = gB;
  ctx.fillRect(0, 0, c.width, c.height);
}

function upCur() {
  const c = document.getElementById('cpCursor');
  if (!c) return;
  c.style.left = cpCX * 100 + '%';
  c.style.top = cpCY * 100 + '%';
}

function upPrev() {
  const hex = hsl2hex(cpH, cpS, cpL);
  const sw = document.getElementById('cpSwatch');
  const hexInput = document.getElementById('cpHex');
  if (sw) sw.style.background = hex;
  if (hexInput) hexInput.value = hex;
}

function pickXY(x, y) {
  const wrap = document.getElementById('cpWrap');
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  cpCX = Math.max(0, Math.min(1, (x - r.left) / r.width));
  cpCY = Math.max(0, Math.min(1, (y - r.top) / r.height));
  cpS = cpCX;
  cpL = Math.max(0.02, Math.min(0.98, 1 - cpCY * 0.97));
  upCur();
  upPrev();
}

function renderMemSwatches() {
  const mem = document.getElementById('cpMem');
  if (!mem) return;
  mem.innerHTML = [...cpMem]
    .reverse()
    .map((c) => `<div class="cp-ms" style="background:${c};border-color:${c}" data-hex="${c}" title="${c}"></div>`)
    .join('');
  mem.querySelectorAll('.cp-ms').forEach((el) => {
    el.addEventListener('click', () => cpSelectHex(el.dataset.hex));
  });
}

function cpSelectHex(hex) {
  try {
    const [h, s, l] = hex2hsl(hex);
    cpH = h; cpS = s; cpL = l; cpCX = s; cpCY = 1 - l;
    const hue = document.getElementById('cpHue');
    if (hue) hue.value = h;
  } catch (e) {}
  drawSpec();
  upCur();
  upPrev();
}

function openColorPicker(label, curHex, callback) {
  cpCB = callback;
  const title = document.getElementById('cpTitle');
  if (title) title.textContent = label || 'Couleur';
  try {
    if (curHex && curHex.trim().startsWith('#')) {
      const [h, s, l] = hex2hsl(curHex.trim());
      cpH = h; cpS = s; cpL = l; cpCX = s; cpCY = 1 - l;
      const hue = document.getElementById('cpHue');
      if (hue) hue.value = h;
    }
  } catch (e) {}
  const overlay = document.getElementById('cpOverlay');
  if (overlay) overlay.classList.add('is-open');
  requestAnimationFrame(() => {
    drawSpec();
    upCur();
    upPrev();
  });
  renderMemSwatches();
}

function closeColorPicker() {
  const overlay = document.getElementById('cpOverlay');
  if (overlay) overlay.classList.remove('is-open');
}

function confirmColorPicker() {
  const hexInput = document.getElementById('cpHex');
  const raw = hexInput ? hexInput.value : '';
  const hex = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : hsl2hex(cpH, cpS, cpL);
  if (!cpMem.includes(hex)) {
    cpMem.push(hex);
    if (cpMem.length > 22) cpMem.shift();
    try { localStorage.setItem('fx_cp_mem', JSON.stringify(cpMem)); } catch (e) {}
  }
  if (cpCB) cpCB(hex);
  // Valider une couleur ici a le même effet que cliquer sur "Appliquer"
  // tout en bas : aperçu + sauvegarde immédiats, pas besoin d'un second clic.
  applyThemeVars();
  closeColorPicker();
}

function initColorPickerEngine() {
  const wrap = document.getElementById('cpWrap');
  const hue = document.getElementById('cpHue');
  const hexInput = document.getElementById('cpHex');
  const cancelBtn = document.getElementById('cpCancelBtn');
  const confirmBtn = document.getElementById('cpConfirmBtn');
  if (!wrap || !hue || !hexInput) return;

  wrap.addEventListener('mousedown', (e) => {
    cpDrag = true;
    pickXY(e.clientX, e.clientY);
    e.preventDefault();
  });
  wrap.addEventListener('touchstart', (e) => {
    cpDrag = true;
    pickXY(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('mousemove', (e) => { if (cpDrag) pickXY(e.clientX, e.clientY); });
  document.addEventListener('touchmove', (e) => { if (cpDrag) pickXY(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  document.addEventListener('mouseup', () => { cpDrag = false; });
  document.addEventListener('touchend', () => { cpDrag = false; });

  hue.addEventListener('input', function () {
    cpH = parseFloat(this.value);
    drawSpec();
    upPrev();
  });

  hexInput.addEventListener('input', function () {
    if (/^#[0-9a-f]{6}$/i.test(this.value)) {
      try {
        const [h, s, l] = hex2hsl(this.value);
        cpH = h; cpS = s; cpL = l; cpCX = s; cpCY = 1 - l;
        hue.value = h;
        drawSpec();
        upCur();
      } catch (e) {}
      const sw = document.getElementById('cpSwatch');
      if (sw) sw.style.background = this.value;
    }
  });

  if (cancelBtn) cancelBtn.addEventListener('click', closeColorPicker);
  if (confirmBtn) confirmBtn.addEventListener('click', confirmColorPicker);
}

/* =========================================================
   5. Construction des lignes de champs par section
   ========================================================= */
function currentValueFor(varName) {
  if (themeVars[varName]) return themeVars[varName];
  const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return computed || '#000000';
}

function renderThemeFields(sectionKey) {
  const container = document.getElementById(`themeFields-${sectionKey}`);
  const fields = THEME_FIELDS[sectionKey] || [];
  if (!container) return;

  if (!fields.length) {
    container.innerHTML = '<p class="theme-field-empty">Rien à personnaliser ici pour le moment.</p>';
    return;
  }

  // Regroupement à 2 niveaux : catégorie (ex. "Thème") puis sous-section
  // (ex. "Bandeau", "Bouton"). Les champs sans "category" tombent dans
  // une catégorie implicite unique (pas de titre de catégorie affiché).
  const categories = [];
  for (const f of fields) {
    const catKey = f.category || '';
    let cat = categories.find((c) => c.title === catKey);
    if (!cat) {
      cat = { title: catKey, groups: [] };
      categories.push(cat);
    }
    let group = cat.groups.find((g) => g.title === f.section);
    if (!group) {
      group = { title: f.section, items: [] };
      cat.groups.push(group);
    }
    group.items.push(f);
  }

  container.innerHTML = categories
    .map((cat) => {
      const groupsHtml = cat.groups
        .map((group) => {
          const rows = group.items
            .map((f) => {
              const hex = currentValueFor(f.v);
              return `<div class="theme-field-row">
                <span class="theme-field-label">${f.l}</span>
                <button type="button" class="theme-field-swatch" style="background:${hex}" data-var="${f.v}" data-label="${f.l}"></button>
              </div>`;
            })
            .join('');
          const groupHeading = group.title ? `<p class="theme-field-group-title">${group.title}</p>` : '';
          return `<div class="theme-field-group">${groupHeading}${rows}</div>`;
        })
        .join('');
      const catHeading = cat.title ? `<p class="theme-field-category-title">${cat.title}</p>` : '';
      return `<div class="theme-field-category">${catHeading}${groupsHtml}</div>`;
    })
    .join('');

  container.querySelectorAll('.theme-field-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      const varName = btn.dataset.var;
      const label = btn.dataset.label;
      openColorPicker(label, currentValueFor(varName), (newHex) => {
        themeVars[varName] = newHex;
        previewThemeVars();
        btn.style.background = newHex;
      });
    });
  });
}

function renderAllThemeFields() {
  Object.keys(THEME_FIELDS).forEach(renderThemeFields);
}

/* =========================================================
   6. Appliquer / Réinitialiser (appelés depuis app.js)
   ========================================================= */
function applyThemeVars() {
  previewThemeVars();
  saveThemeVars();
  // TODO : sauvegarde cloud (Supabase) — nécessite une table de
  // paramètres utilisateur, pas encore créée à ce stade du projet.
}

function resetThemeVars() {
  themeVars = {};
  saveThemeVars();
  document.documentElement.removeAttribute('style');
  renderAllThemeFields();
}

/* =========================================================
   Init
   ========================================================= */
function initThemeColors() {
  loadThemeVars();
  previewThemeVars();
  initColorPickerEngine();
  renderAllThemeFields();
}

window.ThemeColors = {
  init: initThemeColors,
  apply: applyThemeVars,
  reset: resetThemeVars,
};

document.addEventListener('DOMContentLoaded', () => {
  initThemeColors();
});
