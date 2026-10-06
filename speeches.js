'use strict';

/**
 * speeches.js
 * Section « Discours » sous le calendrier de chaque devise.
 *
 * UN SEUL GABARIT DE CASE, rempli à partir d'une « fiche » par discours :
 *   - bandeau : statut (Votant / Non votant) à gauche, importance en étoiles à droite
 *   - carte   : prénom, nom, poste, date, silhouette
 *   - boutons : Discours (texte traduit) et Résumé -> ouvrent une pop-up
 *
 * Forme d'une fiche (c'est ce que l'IA devra produire plus tard) :
 *   {
 *     id:      'identifiant-unique',
 *     first:   'Prénom',
 *     last:    'Nom',
 *     role:    'Poste dans la banque centrale',
 *     voting:  true,                       // true = Votant, false = Non votant
 *     stars:   4,                          // importance de 0 à 5
 *     date:    '2026-10-06T14:30:00',      // date/heure du discours
 *     speech:  ['paragraphe 1', '...'],    // discours traduit en français
 *     summary: [                           // résumé, en blocs
 *       { heading: 'Axes principaux', items: ['...', '...'] },
 *       { heading: 'Ton', text: '...' },
 *     ],
 *   }
 *
 * Pour brancher l'IA plus tard : récupérer les fiches (table Supabase) puis
 * appeler  window.Speeches.render('USD', fiches).
 * Pour l'instant : deux fiches D'EXEMPLE (faux texte, fausse personne).
 */

// Banque centrale par devise (une section n'apparaît que pour les devises listées ici).
const SPEECH_BANKS = { USD: 'Fed' };

// Texte du bandeau selon le statut.
const SPEECH_STATUS = { true: 'Votant', false: 'Non votant' };

// ---------------------------------------------------------------------------
// Fiches d'exemple (FAUX contenu, pour juger le design)
// ---------------------------------------------------------------------------
const SPEECH_ENTRIES = {
  USD: [
    {
      id: 'exemple-1',
      first: 'Prénom',
      last: 'Nom',
      role: 'Poste · Banque centrale (exemple)',
      voting: true,
      stars: 4,
      date: '2026-10-06T14:30:00',
      speech: [
        "[Texte d'exemple pour juger le design : ce n'est pas un vrai discours.]",
        "Mesdames et Messieurs, je vous remercie de votre accueil. Je voudrais ce soir faire le point sur la situation économique et sur la façon dont nous abordons les prochains mois. Les données récentes montrent une économie qui continue de croître à un rythme modéré, avec un marché du travail qui se normalise progressivement et une inflation qui poursuit sa décrue, sans que ce mouvement soit pour autant linéaire.",
        "Sur le front des prix, nous avons observé plusieurs mois de progrès, mais les composantes les plus persistantes, notamment les services et le logement, restent plus rigides que nous ne l'espérions. Il serait prématuré de déclarer la victoire. Notre objectif est clair : ramener durablement l'inflation vers la cible que nous nous sommes fixée, tout en préservant autant que possible la solidité du marché du travail.",
        "En ce qui concerne la politique monétaire, nos décisions continueront de dépendre des données. Chaque réunion sera abordée sans engagement préalable sur la trajectoire des taux. Si l'inflation devait se montrer plus tenace que prévu, nous n'hésiterions pas à maintenir une orientation restrictive plus longtemps. À l'inverse, si le marché du travail se dégradait plus vite qu'attendu, nous disposons de la marge nécessaire pour ajuster notre position.",
        "Je souhaite également dire un mot sur notre bilan. La réduction de nos avoirs se poursuit de manière ordonnée et prévisible, et nous suivons de près le fonctionnement des marchés de financement afin de nous assurer que ce processus n'entraîne aucune tension indésirable.",
        "Enfin, les incertitudes demeurent nombreuses : évolution du commerce mondial, conditions financières, comportement des ménages et des entreprises. Notre rôle est de rester humbles face à ces incertitudes, d'expliquer clairement notre raisonnement et de garder la flexibilité nécessaire pour réagir. Je vous remercie de votre attention et je me tiens à votre disposition pour vos questions.",
      ],
      summary: [
        {
          heading: 'Axes principaux',
          items: [
            "Croissance modérée et marché du travail qui se normalise progressivement.",
            "Inflation en baisse, mais services et logement restent rigides : pas de victoire déclarée.",
            "Décisions dépendantes des données, sans engagement sur la trajectoire des taux.",
            "Réduction du bilan poursuivie de façon ordonnée, avec surveillance des marchés de financement.",
          ],
        },
        { heading: 'Ton', text: 'Prudent, plutôt ferme sur l’inflation, avec une porte ouverte à un assouplissement si l’emploi se dégrade.' },
        { heading: 'Impact possible sur la devise', text: 'Légèrement favorable : le refus de s’engager sur une baisse des taux soutient la devise à court terme.' },
        {
          heading: 'À surveiller',
          items: ['Prochaine publication d’inflation', 'Rapport sur l’emploi', 'Compte rendu de la prochaine réunion'],
        },
        { heading: 'Pourquoi cette note', text: 'Membre votant, propos nuancés sur la trajectoire des taux : importance élevée mais pas décisive.' },
      ],
    },
    {
      id: 'exemple-2',
      first: 'Prénom',
      last: 'Nom',
      role: 'Poste · Banque régionale (exemple)',
      voting: false,
      stars: 2,
      date: '2026-10-05T09:10:00',
      speech: [
        "[Texte d'exemple court, pour tester une pop-up avec peu de contenu.]",
        "Merci de m'avoir invité. Dans notre région, l'activité reste solide, mais les entreprises que nous interrogeons font état d'une prudence croissante sur leurs investissements. Les pressions sur les prix s'atténuent sans disparaître. Je reste attentif aux prochaines données avant de former un jugement sur la suite.",
      ],
      summary: [
        { heading: 'Axes principaux', items: ['Activité régionale solide mais prudence sur les investissements.', 'Pressions sur les prix en recul.'] },
        { heading: 'Ton', text: 'Neutre, sans signal nouveau.' },
        { heading: 'Pourquoi cette note', text: 'Membre non votant, propos généraux : importance faible.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Référence : membres de la Fed pouvant s'exprimer (non affichée pour l'instant,
// servira à retrouver poste et statut votant à partir du nom de l'orateur).
// ---------------------------------------------------------------------------
const SPEECH_ROSTER = {
  USD: [
    { first: 'Kevin', last: 'Warsh', role: 'Président', voting: true },
    { first: 'Philip', last: 'Jefferson', role: 'Vice-président', voting: true },
    { first: 'Michelle', last: 'Bowman', role: 'Vice-présidente supervision', voting: true },
    { first: 'Michael', last: 'Barr', role: 'Gouverneur', voting: true },
    { first: 'Lisa', last: 'Cook', role: 'Gouverneure', voting: true },
    { first: 'Jerome', last: 'Powell', role: 'Gouverneur', voting: true },
    { first: 'Christopher', last: 'Waller', role: 'Gouverneur', voting: true },
    { first: 'John', last: 'Williams', role: 'New York · vice-président FOMC', voting: true },
    { first: 'Beth', last: 'Hammack', role: 'Cleveland', voting: true },
    { first: 'Neel', last: 'Kashkari', role: 'Minneapolis', voting: true },
    { first: 'Lorie', last: 'Logan', role: 'Dallas', voting: true },
    { first: 'Anna', last: 'Paulson', role: 'Philadelphie', voting: true },
    { first: 'Susan', last: 'Collins', role: 'Boston', voting: false },
    { first: 'Thomas', last: 'Barkin', role: 'Richmond', voting: false },
    { first: 'Austan', last: 'Goolsbee', role: 'Chicago', voting: false },
    { first: 'Alberto', last: 'Musalem', role: 'Saint-Louis', voting: false },
    { first: 'Jeffrey', last: 'Schmid', role: 'Kansas City', voting: false },
    { first: 'Mary', last: 'Daly', role: 'San Francisco', voting: false },
  ],
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const speechStore = new Map(); // "USD:exemple-1" -> fiche

function speechEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function speechFormatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function speechStarsHtml(value) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  let html = '';
  for (let i = 1; i <= 5; i += 1) {
    html += `<span class="speech-star${i <= n ? ' is-on' : ''}">★</span>`;
  }
  return `<span class="speech-stars" role="img" aria-label="Importance ${n} sur 5">${html}</span>`;
}

// ---------------------------------------------------------------------------
// Gabarit unique de la case
// ---------------------------------------------------------------------------
function buildSpeechCard(code, entry) {
  const key = `${code}:${entry.id}`;
  speechStore.set(key, entry);
  return `
    <div class="speech-item">
      <div class="speech-badge">
        <span class="speech-badge-status">${speechEscape(SPEECH_STATUS[Boolean(entry.voting)])}</span>
        ${speechStarsHtml(entry.stars)}
      </div>
      <article class="speech-card">
        <div class="speech-card-name">
          <span class="speech-card-first">${speechEscape(entry.first)}</span>
          <span class="speech-card-last">${speechEscape(entry.last)}</span>
          <span class="speech-card-role">${speechEscape(entry.role)}</span>
        </div>
        <span class="speech-card-date">${speechEscape(speechFormatDate(entry.date))}</span>
        <div class="speech-card-photo" aria-hidden="true"></div>
      </article>
      <div class="speech-card-actions">
        <button type="button" class="speech-btn" data-open="speech" data-key="${speechEscape(key)}">Discours</button>
        <button type="button" class="speech-btn" data-open="summary" data-key="${speechEscape(key)}">Résumé</button>
      </div>
    </div>`;
}

function renderSpeechSection(code, entries) {
  const bank = SPEECH_BANKS[code];
  const panel = document.querySelector(`.currency-panel[data-currency="${code}"]`);
  if (!bank || !panel) return;

  let section = panel.querySelector('.speeches');
  if (!section) {
    section = document.createElement('div');
    section.className = 'speeches';
    panel.appendChild(section);
    section.addEventListener('click', (event) => {
      const btn = event.target.closest('.speech-btn[data-open]');
      if (!btn) return;
      openSpeechPopup(btn.dataset.key, btn.dataset.open, btn);
    });
  }

  const list = Array.isArray(entries) ? entries : [];
  const count = list.length;
  section.innerHTML = `
    <div class="speeches-toolbar">
      <span class="speeches-toolbar-title">Discours</span>
      <span class="speeches-toolbar-info">${speechEscape(bank)} · ${count} discours</span>
    </div>
    ${count
      ? `<div class="speeches-grid">${list.map((e) => buildSpeechCard(code, e)).join('')}</div>`
      : '<p class="speeches-empty">Aucun discours pour le moment.</p>'}`;
}

// ---------------------------------------------------------------------------
// Pop-up (une seule, réutilisée)
// ---------------------------------------------------------------------------
let speechPopup = null;
let speechLastTrigger = null;

function ensureSpeechPopup() {
  if (speechPopup) return speechPopup;
  const el = document.createElement('div');
  el.className = 'speech-popup';
  el.hidden = true;
  el.innerHTML = `
    <div class="speech-popup-card" role="dialog" aria-modal="true" aria-labelledby="speechPopupTitle">
      <header class="speech-popup-head">
        <div class="speech-popup-heading">
          <span class="speech-popup-kind" id="speechPopupKind"></span>
          <h2 class="speech-popup-title" id="speechPopupTitle"></h2>
          <span class="speech-popup-meta" id="speechPopupMeta"></span>
        </div>
        <button type="button" class="speech-popup-close" id="speechPopupClose" aria-label="Fermer">✕</button>
      </header>
      <div class="speech-popup-body" id="speechPopupBody" tabindex="0"></div>
    </div>`;
  document.body.appendChild(el);

  el.addEventListener('click', (event) => { if (event.target === el) closeSpeechPopup(); });
  el.querySelector('#speechPopupClose').addEventListener('click', closeSpeechPopup);
  document.addEventListener('keydown', (event) => {
    if (el.hidden) return;
    if (event.key === 'Escape') { closeSpeechPopup(); return; }
    if (event.key !== 'Tab') return;
    const first = el.querySelector('#speechPopupClose');
    const last = el.querySelector('#speechPopupBody');
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  speechPopup = el;
  return el;
}

function speechSummaryHtml(blocks) {
  return (blocks || []).map((b) => `
    <section class="speech-block">
      <h3>${speechEscape(b.heading)}</h3>
      ${b.text ? `<p>${speechEscape(b.text)}</p>` : ''}
      ${Array.isArray(b.items) && b.items.length
        ? `<ul>${b.items.map((i) => `<li>${speechEscape(i)}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
}

function openSpeechPopup(key, kind, trigger) {
  const entry = speechStore.get(key);
  if (!entry) return;
  const el = ensureSpeechPopup();
  const isSummary = kind === 'summary';

  el.querySelector('#speechPopupKind').textContent = isSummary ? 'Résumé' : 'Discours (traduit en français)';
  el.querySelector('#speechPopupTitle').textContent = `${entry.first} ${entry.last}`;
  el.querySelector('#speechPopupMeta').textContent =
    [entry.role, speechFormatDate(entry.date)].filter(Boolean).join(' · ');
  el.querySelector('#speechPopupBody').innerHTML = isSummary
    ? speechSummaryHtml(entry.summary)
    : (entry.speech || []).map((p) => `<p>${speechEscape(p)}</p>`).join('');
  el.querySelector('#speechPopupBody').scrollTop = 0;

  speechLastTrigger = trigger || null;
  el.hidden = false;
  document.documentElement.classList.add('speech-popup-open');
  el.querySelector('#speechPopupClose').focus();
}

function closeSpeechPopup() {
  if (!speechPopup || speechPopup.hidden) return;
  speechPopup.hidden = true;
  document.documentElement.classList.remove('speech-popup-open');
  if (speechLastTrigger) speechLastTrigger.focus();
}

window.Speeches = { render: renderSpeechSection, open: openSpeechPopup, close: closeSpeechPopup, roster: SPEECH_ROSTER };

document.addEventListener('DOMContentLoaded', () => {
  Object.keys(SPEECH_BANKS).forEach((code) => renderSpeechSection(code, SPEECH_ENTRIES[code] || []));
});
