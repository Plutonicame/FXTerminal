'use strict';

/**
 * speeches.js
 * Section « Discours » sous le calendrier de chaque devise : une carte par
 * membre de la banque centrale qui peut prendre la parole (votant ou non).
 * Pour le moment : design seulement (les boutons Discours / Résumé ne font rien).
 *
 * POUR MODIFIER LA LISTE : édite SPEECH_MEMBERS ci-dessous.
 *  - first / last : prénom et nom affichés
 *  - role         : fonction (affichée sous le nom)
 *  - photo        : nom du fichier dans le dossier ./photos/fed/ (PNG détouré,
 *                   tête + buste, fond transparent). S'il n'existe pas, la
 *                   silhouette provisoire s'affiche à la place.
 * Pour ajouter une autre devise, ajoute une clé (EUR, JPY...) avec sa banque
 * et sa liste de membres : la section apparaît toute seule dans l'onglet.
 */

const SPEECH_MEMBERS = {
  USD: {
    bank: 'Fed',
    folder: 'fed',
    members: [
      // Conseil des gouverneurs (tous votants)
      { first: 'Kevin',       last: 'Warsh',     role: 'Président',                      photo: 'warsh.png' },
      { first: 'Philip',      last: 'Jefferson', role: 'Vice-président',                 photo: 'jefferson.png' },
      { first: 'Michelle',    last: 'Bowman',    role: 'Vice-présidente supervision',    photo: 'bowman.png' },
      { first: 'Michael',     last: 'Barr',      role: 'Gouverneur',                     photo: 'barr.png' },
      { first: 'Lisa',        last: 'Cook',      role: 'Gouverneure',                    photo: 'cook.png' },
      { first: 'Jerome',      last: 'Powell',    role: 'Gouverneur',                     photo: 'powell.png' },
      { first: 'Christopher', last: 'Waller',    role: 'Gouverneur',                     photo: 'waller.png' },
      // Présidents des banques régionales : votants 2026
      { first: 'John',        last: 'Williams',  role: 'New York · vice-président FOMC', photo: 'williams.png' },
      { first: 'Beth',        last: 'Hammack',   role: 'Cleveland',                      photo: 'hammack.png' },
      { first: 'Neel',        last: 'Kashkari',  role: 'Minneapolis',                    photo: 'kashkari.png' },
      { first: 'Lorie',       last: 'Logan',     role: 'Dallas',                         photo: 'logan.png' },
      { first: 'Anna',        last: 'Paulson',   role: 'Philadelphie',                   photo: 'paulson.png' },
      // Présidents des banques régionales : non votants 2026
      { first: 'Susan',       last: 'Collins',   role: 'Boston',                         photo: 'collins.png' },
      { first: 'Thomas',      last: 'Barkin',    role: 'Richmond',                       photo: 'barkin.png' },
      { first: 'Austan',      last: 'Goolsbee',  role: 'Chicago',                        photo: 'goolsbee.png' },
      { first: 'Alberto',     last: 'Musalem',   role: 'Saint-Louis',                    photo: 'musalem.png' },
      { first: 'Jeffrey',     last: 'Schmid',    role: 'Kansas City',                    photo: 'schmid.png' },
      { first: 'Mary',        last: 'Daly',      role: 'San Francisco',                  photo: 'daly.png' },
      // Atlanta : pas de président confirmé à ce jour (Bostic parti en février 2026).
    ],
  },
};

function speechEscape(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildSpeechCard(member, folder) {
  const src = `./photos/${folder}/${encodeURIComponent(member.photo)}`;
  return `
    <div class="speech-item">
      <article class="speech-card">
        <div class="speech-card-name">
          <span class="speech-card-first">${speechEscape(member.first)}</span>
          <span class="speech-card-last">${speechEscape(member.last)}</span>
          <span class="speech-card-role">${speechEscape(member.role)}</span>
        </div>
        <div class="speech-card-photo">
          <img src="${src}" alt="${speechEscape(member.first + ' ' + member.last)}" loading="lazy" decoding="async">
        </div>
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
        ${cfg.members.map((m) => buildSpeechCard(m, cfg.folder)).join('')}
      </div>`;
    panel.appendChild(section);

    // Pas de photo déposée : on retire l'image, la silhouette du fond reste.
    section.querySelectorAll('.speech-card-photo img').forEach((img) => {
      img.addEventListener('error', () => img.remove());
      // Photo chargée : on masque la silhouette de fond.
      img.addEventListener('load', () => img.parentElement.classList.add('has-photo'));
      if (img.complete && img.naturalWidth) img.parentElement.classList.add('has-photo');
    });
  });
}

document.addEventListener('DOMContentLoaded', renderSpeeches);
