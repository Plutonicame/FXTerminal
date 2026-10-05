'use strict';

/**
 * speeches.js
 * Section « Discours » sous le calendrier de chaque devise : une case par
 * membre de la banque centrale qui peut prendre la parole (votant ou non).
 * Chaque case = un bandeau (identique pour tous) + une carte (prénom, nom,
 * fonction à gauche, silhouette à droite) + les boutons Discours / Résumé
 * (pour le moment ils ne font rien).
 *
 * POUR MODIFIER LA LISTE : édite SPEECH_MEMBERS ci-dessous.
 *  - first / last / role : prénom, nom et fonction affichés sur la carte
 *  - voting              : true = votant, false = non votant (pas affiché
 *                          pour l'instant : réservé pour la suite)
 * Pour ajouter une autre devise, ajoute une clé (EUR, JPY...) avec sa banque
 * et sa liste de membres : la section apparaît toute seule dans l'onglet.
 */

const SPEECH_MEMBERS = {
  USD: {
    bank: 'Fed',
    members: [
      // Conseil des gouverneurs (tous votants)
      { first: 'Kevin',       last: 'Warsh',     role: 'Président',                      voting: true },
      { first: 'Philip',      last: 'Jefferson', role: 'Vice-président',                 voting: true },
      { first: 'Michelle',    last: 'Bowman',    role: 'Vice-présidente supervision',    voting: true },
      { first: 'Michael',     last: 'Barr',      role: 'Gouverneur',                     voting: true },
      { first: 'Lisa',        last: 'Cook',      role: 'Gouverneure',                    voting: true },
      { first: 'Jerome',      last: 'Powell',    role: 'Gouverneur',                     voting: true },
      { first: 'Christopher', last: 'Waller',    role: 'Gouverneur',                     voting: true },
      // Présidents des banques régionales : votants 2026
      { first: 'John',        last: 'Williams',  role: 'New York · vice-président FOMC', voting: true },
      { first: 'Beth',        last: 'Hammack',   role: 'Cleveland',                      voting: true },
      { first: 'Neel',        last: 'Kashkari',  role: 'Minneapolis',                    voting: true },
      { first: 'Lorie',       last: 'Logan',     role: 'Dallas',                         voting: true },
      { first: 'Anna',        last: 'Paulson',   role: 'Philadelphie',                   voting: true },
      // Présidents des banques régionales : non votants 2026
      { first: 'Susan',       last: 'Collins',   role: 'Boston',                         voting: false },
      { first: 'Thomas',      last: 'Barkin',    role: 'Richmond',                       voting: false },
      { first: 'Austan',      last: 'Goolsbee',  role: 'Chicago',                        voting: false },
      { first: 'Alberto',     last: 'Musalem',   role: 'Saint-Louis',                    voting: false },
      { first: 'Jeffrey',     last: 'Schmid',    role: 'Kansas City',                    voting: false },
      { first: 'Mary',        last: 'Daly',      role: 'San Francisco',                  voting: false },
      // Atlanta : pas de président confirmé à ce jour (Bostic parti en février 2026).
    ],
  },
};

// Texte du bandeau : le même pour toutes les cases pour le moment.
// Plus tard, il affichera le statut réel (votant / non votant) du discours.
const SPEECH_BADGE_PLACEHOLDER = 'Votant / Non votant';

function speechEscape(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildSpeechCard(member) {
  return `
    <div class="speech-item">
      <div class="speech-badge">${speechEscape(SPEECH_BADGE_PLACEHOLDER)}</div>
      <article class="speech-card">
        <div class="speech-card-name">
          <span class="speech-card-first">${speechEscape(member.first)}</span>
          <span class="speech-card-last">${speechEscape(member.last)}</span>
          <span class="speech-card-role">${speechEscape(member.role)}</span>
        </div>
        <div class="speech-card-photo" aria-hidden="true"></div>
      </article>
      <div class="speech-card-actions">
        <button type="button" class="speech-btn">Discours</button>
        <button type="button" class="speech-btn">Résumé</button>
      </div>
    </div>`;
}

function renderSpeeches() {
  Object.entries(SPEECH_MEMBERS).forEach(([code, cfg]) => {
    const panel = document.querySelector(`.currency-panel[data-currency="${code}"]`);
    if (!panel || panel.querySelector('.speeches')) return;

    const section = document.createElement('div');
    section.className = 'speeches';
    section.innerHTML = `
      <div class="speeches-toolbar">
        <span class="speeches-toolbar-title">Discours</span>
        <span class="speeches-toolbar-info">${speechEscape(cfg.bank)} · ${cfg.members.length} intervenants</span>
      </div>
      <div class="speeches-grid">
        ${cfg.members.map(buildSpeechCard).join('')}
      </div>`;
    panel.appendChild(section);
  });
}

document.addEventListener('DOMContentLoaded', renderSpeeches);
