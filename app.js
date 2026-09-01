/* ============================================================
   Palworld Tool - app.js
   Stufe 1: Pal-Datenbank mit Suche, Filtern und Detailansicht.
   Daten kommen aus paldex.js (erzeugt von tools/generate-paldex.mjs).
   ============================================================ */

'use strict';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---- Work-Typen: deutsche Beschriftung + Symbol ---- */
const WORK_LABEL = {
  Kindling:            ['🔥', 'Feuer machen'],
  Watering:            ['💧', 'Bewässern'],
  Planting:            ['🌱', 'Pflanzen'],
  GenerateElectricity: ['⚡', 'Strom erzeugen'],
  Handiwork:           ['🔨', 'Handwerk'],
  Gathering:           ['🧺', 'Sammeln'],
  Lumbering:           ['🪓', 'Holzfällen'],
  Mining:              ['⛏️', 'Bergbau'],
  MedicineProduction:  ['💊', 'Medizin'],
  Cooling:             ['❄️', 'Kühlen'],
  Transporting:        ['📦', 'Transport'],
  Farming:             ['🥚', 'Farm'],
};

const PAGE_SIZE = 60;

const state = {
  q: '',
  element: '',
  work: '',
  workLv: 1,
  sort: 'dex',
  nocturnal: false,
  hideVariants: false,
  shown: PAGE_SIZE,
};

/* Reverse-Index Kind -> Anzahl Elternpaare. Wird einmal beim Start gebaut;
   44.851 Eintraege durchlaufen dauert im Browser wenige Millisekunden. */
const parentPairCount = new Array(PALS.length).fill(0);
for (const row of BREEDING) parentPairCount[row[2]]++;

/* ============================================================
   Filtern & Sortieren
   ============================================================ */

function filtered() {
  const q = state.q.trim().toLowerCase();
  let list = PALS.filter(p => {
    if (state.hideVariants && p.variant) return false;
    if (state.nocturnal && !p.nocturnal) return false;
    if (state.element && !p.elements.includes(state.element)) return false;
    if (state.work && !((p.work[state.work] || 0) >= state.workLv)) return false;
    if (q) {
      const hay = [p.name, p.title, ...p.drops, ...p.elements]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const by = {
    dex:    (a, b) => (a.dex - b.dex) || a.name.localeCompare(b.name),
    name:   (a, b) => a.name.localeCompare(b.name),
    rarity: (a, b) => (b.rarity - a.rarity) || a.name.localeCompare(b.name),
    breed:  (a, b) => (a.breedPower - b.breedPower) || a.name.localeCompare(b.name),
  }[state.sort];

  return list.sort(by);
}

/* ============================================================
   Liste rendern
   ============================================================ */

function renderList() {
  const list = filtered();
  const slice = list.slice(0, state.shown);

  $('#palCount').textContent =
    list.length === PALS.length
      ? `${PALS.length} Pals`
      : `${list.length} von ${PALS.length} Pals`;

  $('#palList').innerHTML = slice.map(p => {
    const works = Object.entries(p.work)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, lv]) => `<span class="w">${(WORK_LABEL[k] || ['·'])[0]}${lv}</span>`)
      .join('');
    const elems = p.elements.map(e =>
      `<span class="elem ${esc(e)}">${esc(e)}</span>`).join('');
    const img = p.icon
      ? `<img src="${esc(p.icon)}" alt="" loading="lazy" decoding="async">`
      : '<div style="height:68px"></div>';

    return `<li class="pal-card" data-key="${esc(p.key)}">
      ${img}
      <div class="pal-dex">No.${p.dex}</div>
      <div class="pal-name">${esc(p.name)}</div>
      <div class="pal-elems">${elems || '<span class="elem">?</span>'}</div>
      <div class="pal-works">${works}</div>
    </li>`;
  }).join('');

  const more = list.length > state.shown;
  $('#loadMore').hidden = !more;
  if (more) $('#loadMore').textContent = `Weitere ${Math.min(PAGE_SIZE, list.length - state.shown)} anzeigen`;
}

/* ============================================================
   Detail-Modal
   ============================================================ */

function openPal(key) {
  const p = PALS.find(x => x.key === key);
  if (!p) return;

  const elems = p.elements.map(e => `<span class="elem ${esc(e)}">${esc(e)}</span>`).join('')
    || '<span class="no-data">keine Elementdaten</span>';

  const works = Object.entries(p.work).sort((a, b) => b[1] - a[1]).map(([k, lv]) => {
    const [ico, label] = WORK_LABEL[k] || ['·', k];
    return `<div class="work-item"><span class="wi">${ico}</span>
      <span class="wn">${esc(label)}</span><span class="wl">Lv ${lv}</span></div>`;
  }).join('') || '<p class="no-data">Keine Arbeitseignung.</p>';

  const kv = (k, v) => `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;
  // -1 heisst im Datensatz "nicht vorhanden" (z. B. nicht reitbar) - nicht als Zahl zeigen.
  const num = v => (v === -1 || v === null || v === undefined ? '–' : v);
  const stats = [
    kv('HP', p.stats.hp),
    kv('Angriff', p.stats.attack),
    kv('Verteidigung', p.stats.defense),
    kv('Ausdauer', p.stats.stamina),
    kv('Laufen', num(p.stats.runSpeed)),
    kv('Reiten', num(p.stats.rideSprintSpeed)),
    kv('Traglast', num(p.stats.transportSpeed)),
    kv('Nahrung', p.stats.food),
  ].join('');

  const meta = [
    kv('Seltenheit', p.rarity),
    kv('Größe', p.size),
    kv('Wildlevel', `${p.wildLevel[0]}–${p.wildLevel[1]}`),
    kv('Preis', p.price),
    kv('Nachtaktiv', p.nocturnal ? 'ja' : 'nein'),
    kv('♂ / ♀', `${Math.round(p.gender.male * 100)} / ${Math.round(p.gender.female * 100)}%`),
    kv('Breeding Power', p.breedPower),
    kv('Elternpaare', parentPairCount[p.i]),
  ].join('');

  const drops = p.drops.length
    ? `<div class="chip-row">${p.drops.map(d => `<span class="chip">${esc(d)}</span>`).join('')}</div>`
    : '<p class="no-data">Keine Drop-Daten.</p>';

  const passives = p.guaranteedPassives.length
    ? `<div class="dex-section-title">Garantierte Passives</div>
       <div class="chip-row">${p.guaranteedPassives.map(x =>
         `<span class="chip pass">${esc(x)}</span>`).join('')}</div>`
    : '';

  const partner = p.partnerSkill
    ? `<div class="dex-section-title">Partner-Skill</div>
       <div class="partner">
         <div class="p-name">${esc(p.partnerSkill.name)}</div>
         ${p.partnerSkill.description
           ? `<div class="p-desc">${esc(p.partnerSkill.description)}</div>` : ''}
       </div>`
    : '';

  const habitat = p.habitat
    ? `<div class="dex-section-title">Wo zu finden</div>
       <div class="habitat">
         <div class="habitat-toggle">
           <button class="on" data-action="hab" data-when="day">☀️ Tag</button>
           <button data-action="hab" data-when="night">🌙 Nacht</button>
         </div>
         <img id="habImg" src="${esc(p.habitat.day || p.habitat.night)}"
              alt="Fundorte von ${esc(p.name)}" loading="lazy">
       </div>`
    : `<div class="dex-section-title">Wo zu finden</div>
       <p class="no-data">Für diesen Pal liegt keine Habitat-Karte vor.</p>`;

  $('#modalContent').innerHTML = `
    <div class="dex-head">
      ${p.icon ? `<img src="${esc(p.icon)}" alt="">` : ''}
      <div class="h-main">
        <div class="h-dex">No.${p.dex}${p.variant ? ' · Variante' : ''}</div>
        <h2>${esc(p.name)}</h2>
        ${p.title ? `<div class="h-title">${esc(p.title)}</div>` : ''}
        <div class="pal-elems">${elems}</div>
      </div>
    </div>

    <div class="dex-section-title">Arbeitseignung</div>
    <div class="work-list">${works}</div>

    <div class="dex-section-title">Werte</div>
    <div class="kv-grid">${stats}</div>

    <div class="dex-section-title">Allgemein</div>
    <div class="kv-grid">${meta}</div>

    <div class="dex-section-title">Drops</div>
    ${drops}
    ${passives}
    ${partner}
    ${habitat}`;

  // Tag/Nacht-Umschalter der Habitat-Karte
  if (p.habitat) {
    $('#modalContent').querySelectorAll('[data-action="hab"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const when = btn.dataset.when;
        const src = p.habitat[when];
        if (!src) return;
        $('#habImg').src = src;
        $('#modalContent').querySelectorAll('[data-action="hab"]')
          .forEach(b => b.classList.toggle('on', b === btn));
      });
    });
  }

  $('#modalOverlay').hidden = false;
}

/* ============================================================
   Verdrahtung
   ============================================================ */

function initFilters() {
  $('#fElement').innerHTML =
    '<option value="">alle</option>' +
    ELEMENTS.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join('');

  $('#fWork').innerHTML =
    '<option value="">alle</option>' +
    WORK_TYPES.map(w => {
      const [ico, label] = WORK_LABEL[w] || ['·', w];
      return `<option value="${esc(w)}">${ico} ${esc(label)}</option>`;
    }).join('');
}

function resetPageAndRender() {
  state.shown = PAGE_SIZE;
  renderList();
}

function init() {
  initFilters();
  $('#stubPairs').textContent = BREEDING.length.toLocaleString('de-DE');

  // Header-Hoehe an die echte Hoehe angleichen (Notch/Safe-Area)
  const syncHeader = () => document.documentElement.style
    .setProperty('--header-h', $('#appHeader').offsetHeight + 'px');
  syncHeader();
  window.addEventListener('resize', syncHeader);

  $('#palSearch').addEventListener('input', e => {
    state.q = e.target.value;
    resetPageAndRender();
  });

  const bind = (sel, key, transform = v => v) =>
    $(sel).addEventListener('change', e => {
      state[key] = transform(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
      resetPageAndRender();
    });

  bind('#fElement', 'element');
  bind('#fWork', 'work');
  bind('#fWorkLv', 'workLv', Number);
  bind('#fSort', 'sort');
  bind('#fNocturnal', 'nocturnal');
  bind('#fVariant', 'hideVariants');

  document.addEventListener('click', e => {
    const card = e.target.closest('.pal-card');
    if (card) return openPal(card.dataset.key);

    const nav = e.target.closest('.nav-btn');
    if (nav) {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === nav));
      document.querySelectorAll('.tab-panel').forEach(s =>
        s.classList.toggle('active', s.id === 'tab-' + nav.dataset.nav));
      window.scrollTo(0, 0);
      return;
    }

    const act = e.target.closest('[data-action]');
    if (!act) return;
    switch (act.dataset.action) {
      case 'toggle-filters': {
        const panel = $('#filterPanel');
        panel.hidden = !panel.hidden;
        $('#filterToggle').classList.toggle('on', !panel.hidden);
        break;
      }
      case 'reset-filters':
        Object.assign(state, { element: '', work: '', workLv: 1, nocturnal: false, hideVariants: false });
        $('#fElement').value = ''; $('#fWork').value = ''; $('#fWorkLv').value = '1';
        $('#fNocturnal').checked = false; $('#fVariant').checked = false;
        resetPageAndRender();
        break;
      case 'load-more':
        state.shown += PAGE_SIZE;
        renderList();
        break;
      case 'modal-close':
        $('#modalOverlay').hidden = true;
        break;
      case 'open-map':
        window.open('https://palworld.gg/map', '_blank', 'noopener');
        break;
    }
  });

  // Klick auf den abgedunkelten Hintergrund schliesst das Modal
  $('#modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') $('#modalOverlay').hidden = true;
  });

  renderList();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline egal */ });
  }
}

document.addEventListener('DOMContentLoaded', init);
