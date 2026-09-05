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

/**
 * Nach jeder Bestandsaenderung: alles neu zeichnen, was davon abhaengt.
 * Der Bestand steckt im Zuchtplan, in der Merkliste und im Kombinierer.
 */
function afterDataChange() {
  renderRoster();
  renderBreeding();
  renderWatchlist();
  renderCombine();
}

/** Wechselt den Tab. Wird auch aus Modalen heraus aufgerufen. */
function showTab(name) {
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));
  document.querySelectorAll('.tab-panel').forEach(s =>
    s.classList.toggle('active', s.id === 'tab-' + name));
  window.scrollTo(0, 0);
}

/**
 * Zuchtabschnitt fürs Detailfenster: der kürzeste Weg aus dem eigenen
 * Bestand UND die allgemeinen Elternpaare. Bewusst gekürzt — der volle
 * Umfang steht im Zucht-Tab, hierher gehört die schnelle Antwort.
 */
function breedingSection(p) {
  buildBreedIndexes();
  const pairs = childToPairs[p.i];
  const ownedKeys = new Set(roster.map(r => r.key));
  const ownedIdx = PALS.filter(x => ownedKeys.has(x.key)).map(x => x.i);

  /* --- Weg aus dem eigenen Bestand --- */
  let mine;
  if (ownedKeys.has(p.key)) {
    mine = '<p class="ok-note">✅ Diesen Pal hast du bereits.</p>';
  } else if (!ownedIdx.length) {
    mine = `<p class="no-data">Noch kein eigener Bestand hinterlegt — trage unter
      „Meine Pals“ ein, was du besitzt, dann steht hier dein kürzester Weg.</p>`;
  } else {
    const { cost, via } = solvePath(ownedIdx);
    if (!isFinite(cost[p.i])) {
      mine = `<p class="no-data">Aus deinem Bestand nicht erreichbar. Fang einen der
        unten gelisteten Eltern-Pals, dann geht es.</p>`;
    } else {
      const steps = planSteps(p.i, via, ownedIdx);
      const gens = cost[p.i];
      const gezeigt = steps.slice(0, 6);
      mine = `<p class="ok-note"><b>${steps.length}</b>
        ${steps.length === 1 ? 'Zuchtschritt' : 'Zuchtschritte'} über <b>${gens}</b>
        ${gens === 1 ? 'Generation' : 'Generationen'}</p>
        <ol class="step-list">${renderSteps(gezeigt, ownedIdx)}</ol>
        ${steps.length > gezeigt.length
          ? `<p class="no-data">… und ${steps.length - gezeigt.length} weitere Schritte.</p>`
          : ''}`;
    }
  }

  /* --- Allgemeine Möglichkeiten --- */
  let allgemein;
  if (!pairs.length) {
    allgemein = `<p class="no-data">${esc(p.name)} lässt sich nicht erzüchten —
      es gibt kein Elternpaar, das ihn ergibt.</p>`;
  } else {
    const sortiert = pairs.map(([a, b, g]) => ({
      a, b, g,
      own: (ownedKeys.has(PALS[a].key) ? 1 : 0) + (ownedKeys.has(PALS[b].key) ? 1 : 0),
    })).sort((x, y) => y.own - x.own || PALS[x.a].name.localeCompare(PALS[y.a].name));

    const cell = i => palChip(i, ownedKeys.has(PALS[i].key) ? 'mine' : '');

    const top = sortiert.slice(0, 10);
    allgemein = `<ul class="pair-list">${top.map(({ a, b, g, own }) =>
      `<li class="pair-row${own === 2 ? ' both' : ''}">${cell(a)}<span class="x">×</span>${cell(b)}
        ${g ? `<span class="tn-tag">nur ${g === 'MALE' ? '♂ links' : '♀ links'}</span>` : ''}</li>`
      ).join('')}</ul>
      ${pairs.length > top.length
        ? `<p class="no-data">… ${pairs.length - top.length} weitere Paare.
           Paare mit deinen Pals stehen oben.</p>` : ''}`;
  }

  return `
    <div class="dex-section-title">Zucht — dein Weg</div>
    ${mine}
    <div class="dex-section-title">Zucht — alle Elternpaare (${pairs.length})</div>
    ${allgemein}
    <div class="modal-actions">
      <button class="tool-btn" data-action="goto-breeding" data-key="${esc(p.key)}">
        🥚 Im Zucht-Tab</button>
      <button class="tool-btn${isWatched(p.key) ? ' on' : ''}"
              data-action="watch-toggle" data-key="${esc(p.key)}">
        ${isWatched(p.key) ? '📌 gemerkt' : '📌 Merken'}</button>
      <button class="tool-btn${hasPal(p.key) ? ' on' : ''}"
              data-action="own-toggle" data-key="${esc(p.key)}">
        ${hasPal(p.key) ? '✅ im Bestand' : '➕ Besitze ich'}</button>
    </div>`;
}

/**
 * @param {string} key      InternalName des Pals
 * @param {string} [tierCtx] Wenn gesetzt: zusätzlich die Tier-Auswahl für diese Liste
 */
function openPal(key, tierCtx) {
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

  // Aus der Tier List heraus: Stufe direkt hier ändern können
  let tierBlock = '';
  if (tierCtx && TIERLISTS[tierCtx]) {
    const ov = tierOverrides[tierCtx] || {};
    const current = ov[key] || TIER_ORDER.find(t =>
      (TIERLISTS[tierCtx].tiers[t] || []).includes(p.i));
    tierBlock = `
      <div class="dex-section-title">Stufe · ${esc(TIERLISTS[tierCtx].label)}</div>
      <div class="tier-picker">
        ${TIER_ORDER.map(t => `<button class="tier-badge t-${t}${t === current ? ' on' : ''}"
          data-action="tier-set" data-key="${esc(key)}" data-tier="${t}">${t}</button>`).join('')}
      </div>
      ${ov[key] ? `<button class="tool-btn wide" data-action="tier-clear"
        data-key="${esc(key)}">Eigene Einstufung entfernen</button>` : ''}`;
  }

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
    ${tierBlock}
    ${breedingSection(p)}

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
   Zucht: Indizes, Bestand und Pathfinder
   ============================================================ */

const ROSTER_KEY = 'palworldapp-roster-v1';

/**
 * Bestand: [{ key, gender }] mit gender 'M' | 'F' | '?'.
 * Jede Art steht hoechstens EINMAL drin - es geht nur darum, ob man sie hat.
 */
let roster = [];
try { roster = JSON.parse(localStorage.getItem(ROSTER_KEY)) || []; } catch { roster = []; }
const saveRoster = () => {
  try { localStorage.setItem(ROSTER_KEY, JSON.stringify(roster)); } catch { /* voll/privat */ }
};

// Altbestaende koennen Doppelte enthalten (frueher war Mehrfachauswahl moeglich).
// Bereinigtes Ergebnis gleich zurueckschreiben, sonst schleppt der Speicher
// die Doppelten weiter mit.
{
  const vorher = roster.length;
  roster = roster.filter((r, i, all) => r && all.findIndex(x => x.key === r.key) === i);
  if (roster.length !== vorher) saveRoster();
}
const hasPal = key => roster.some(r => r.key === key);

/* ---- Merkliste: Pals, die man spaeter zuechten moechte ---- */
const WATCH_KEY = 'palworldapp-watchlist-v1';
let watchlist = [];
try { watchlist = JSON.parse(localStorage.getItem(WATCH_KEY)) || []; } catch { watchlist = []; }
watchlist = watchlist.filter((k, i, all) => typeof k === 'string' && all.indexOf(k) === i);

const saveWatchlist = () => {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist)); } catch { /* egal */ }
};
const isWatched = key => watchlist.includes(key);

/* Indizes werden erst beim ersten Zucht-Aufruf gebaut - der Pals-Tab
   soll nicht auf 45.000 Zeilen warten muessen. */
let childToPairs = null;   // Kind-Index  -> [[elternA, elternB, geschlecht|null], ...]
let pairsByParent = null;  // Eltern-Index -> [[andererElternteil, kind], ...]

function buildBreedIndexes() {
  if (childToPairs) return;
  childToPairs = Array.from({ length: PALS.length }, () => []);
  pairsByParent = Array.from({ length: PALS.length }, () => []);
  for (const row of BREEDING) {
    const [a, b, c, g] = row;
    childToPairs[c].push([a, b, g || null]);
    pairsByParent[a].push([b, c]);
    if (a !== b) pairsByParent[b].push([a, c]);
  }
}

/** Besitzt der Nutzer diese Art, und mit welchem Geschlecht? */
function ownedInfo(palIdx) {
  const e = roster.find(r => r.key === PALS[palIdx].key);
  return {
    owned: !!e,
    male: e?.gender === 'M',
    female: e?.gender === 'F',
    unknown: !e || e.gender === '?',
  };
}

/**
 * Kürzester Zuchtweg vom eigenen Bestand zum Ziel.
 *
 * Das ist kein normaler Graph: ein Pal entsteht aus ZWEI Eltern, die beide
 * erst gezüchtet sein wollen.
 *
 * Gemessen wird in GENERATIONEN: Kosten(Kind) = max(Kosten(A), Kosten(B)) + 1.
 * Wichtig ist das "max" statt einer Summe - einen einmal gezüchteten Pal
 * benutzt man ja weiter. Mit einer Summe würde jeder gemeinsam genutzte
 * Zwischenschritt doppelt gezählt und die Wege explodierten ins Absurde
 * (Anubis kam so auf 2970 statt 21 Schritte).
 *
 * Weil die Kosten dabei nie sinken, löst ein Dijkstra das Problem: immer den
 * billigsten fertigen Pal herausnehmen und damit neue Kinder aufschliessen.
 *
 * Rückgabe: { cost, via } - via[i] = [elternA, elternB] oder null (= im Bestand).
 */
function solvePath(ownedIdx) {
  const N = PALS.length;
  const cost = new Float64Array(N).fill(Infinity);
  const via = new Array(N).fill(null);
  const done = new Uint8Array(N);

  // Kleiner Binary-Heap; 299 Pals brauchen nichts Ausgefeilteres.
  const heap = [];
  const push = (i, c) => {
    heap.push([c, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        let s = k;
        if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
        if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
        if (s === k) break;
        [heap[s], heap[k]] = [heap[k], heap[s]];
        k = s;
      }
    }
    return top;
  };

  for (const i of ownedIdx) { cost[i] = 0; push(i, 0); }

  while (heap.length) {
    const [c, i] = pop();
    if (done[i] || c > cost[i]) continue;
    done[i] = 1;

    for (const [other, child] of pairsByParent[i]) {
      // Erst wenn BEIDE Eltern endgültig sind, steht die Kindsumme fest.
      if (!done[other]) continue;
      const nc = Math.max(cost[i], cost[other]) + 1;
      if (nc < cost[child]) {
        cost[child] = nc;
        via[child] = [i, other];
        push(child, nc);
      }
    }
  }

  return { cost, via };
}

/**
 * Macht aus dem via-Array einen abarbeitbaren Zuchtplan.
 *
 * Bewusst als Liste, nicht als Baum: derselbe Zwischen-Pal taucht in einem
 * Baum mehrfach auf (bei Anubis waren es tausende Knoten), gezüchtet wird er
 * aber nur einmal. Die Liste ist topologisch sortiert - jeder Schritt nutzt
 * nur Pals, die vorher schon da sind.
 */
function planSteps(targetIdx, via, ownedIdx) {
  const need = new Set();
  const collect = i => {
    if (!via[i] || need.has(i)) return;
    need.add(i);
    collect(via[i][0]);
    collect(via[i][1]);
  };
  collect(targetIdx);

  const have = new Set(ownedIdx);
  const pending = new Set(need);
  const steps = [];
  const ready = i => !via[i] || have.has(i);

  while (pending.size) {
    let progressed = false;
    for (const i of [...pending]) {
      const [a, b] = via[i];
      if (ready(a) && ready(b)) {
        steps.push({ child: i, a, b });
        have.add(i);
        pending.delete(i);
        progressed = true;
      }
    }
    if (!progressed) break; // sollte nicht vorkommen; lieber abbrechen als haengen
  }
  return steps;
}

/** Anklickbarer Pal-Name mit Icon. Oeffnet ueberall das Detailfenster. */
function palChip(i, extraClass = '') {
  const p = PALS[i];
  return `<button class="pp ${extraClass}" data-action="open-pal" data-key="${esc(p.key)}">
    ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}${esc(p.name)}</button>`;
}

function renderSteps(steps, ownedIdx) {
  const ownedSet = new Set(ownedIdx);
  const bred = new Set();

  const cell = i => palChip(i, ownedSet.has(i) ? 'mine' : (bred.has(i) ? 'bred' : ''));

  return steps.map((s, n) => {
    // Jede Zucht braucht ♂ und ♀. Gewarnt wird nur, wenn beide Eltern im
    // Bestand stehen UND alle Geschlechter bekannt und gleich sind - sonst
    // wuerde bei lauter "?" dauernd falscher Alarm entstehen.
    // (Ein Schritt mit A === B kann hier nicht auftreten: gleiche Art mit
    //  gleicher Art ergibt wieder dieselbe Art, das bringt nie etwas Neues.)
    let warn = '';
    if (ownedSet.has(s.a) && ownedSet.has(s.b)) {
      const oa = ownedInfo(s.a), ob = ownedInfo(s.b);
      const known = !oa.unknown && !ob.unknown;
      const paarbar = (oa.male && ob.female) || (oa.female && ob.male);
      if (known && !paarbar) {
        const g = o => (o.male ? '♂' : '♀');
        warn = `<div class="tn-warn">⚠️ Beide sind ${g(oa)} — für die Zucht brauchst du
          ein Paar aus ♂ und ♀.</div>`;
      }
    }
    const row = `<li class="step-row">
      <span class="step-no">${n + 1}</span>
      <div class="step-main">
        <div class="step-eq">${cell(s.a)}<span class="x">×</span>${cell(s.b)}
          <span class="arrow">→</span>${cell(s.child)}</div>
        ${warn}
      </div>
    </li>`;
    bred.add(s.child);
    return row;
  }).join('');
}

/* ---- Zucht-Ansicht ---- */

let breedTarget = null;

function renderBreeding() {
  const box = $('#breedResult');
  if (breedTarget === null) {
    box.innerHTML = `<div class="stub">🥚<span>Wähle oben einen Ziel-Pal.
      <b>${BREEDING.length.toLocaleString('de-DE')}</b> Zuchtpaare sind geladen,
      inklusive der Unique-Combos.</span></div>`;
    return;
  }

  buildBreedIndexes();
  const t = PALS[breedTarget];
  const pairs = childToPairs[breedTarget];
  const ownedKeys = new Set(roster.map(r => r.key));
  const ownedIdx = PALS.filter(p => ownedKeys.has(p.key)).map(p => p.i);

  /* --- Weg aus dem eigenen Bestand --- */
  let pathHtml;
  if (!ownedIdx.length) {
    pathHtml = `<p class="no-data">Trage unter „Meine Pals" ein, was du besitzt —
      dann zeigt dir der Pathfinder hier den kürzesten Weg von deinem Bestand aus.</p>`;
  } else if (ownedKeys.has(t.key)) {
    pathHtml = `<p class="ok-note">✅ Diesen Pal hast du bereits.</p>`;
  } else {
    const { cost, via } = solvePath(ownedIdx);
    if (!isFinite(cost[breedTarget])) {
      pathHtml = `<p class="no-data">Aus deinem aktuellen Bestand ist ${esc(t.name)}
        nicht erreichbar. Fang zuerst weitere Arten — unten stehen die Eltern,
        die direkt zum Ziel führen.</p>`;
    } else {
      const steps = planSteps(breedTarget, via, ownedIdx);
      const gens = cost[breedTarget];
      // Lange Ketten sind zwar korrekt, aber unbrauchbar. Dann lieber ehrlich
      // sagen, dass Fangen der schnellere Weg ist.
      const long = steps.length > 12;
      pathHtml = `<p class="ok-note"><b>${steps.length}</b>
        ${steps.length === 1 ? 'Zuchtschritt' : 'Zuchtschritte'}
        über <b>${gens}</b> ${gens === 1 ? 'Generation' : 'Generationen'}</p>
        ${long ? `<p class="no-data">Das ist eine lange Kette. Schneller geht es,
          wenn du einen der unten gelisteten Eltern-Pals fängst und ihn hier einträgst.</p>` : ''}
        <ol class="step-list">${renderSteps(steps, ownedIdx)}</ol>`;
    }
  }

  /* --- Direkte Elternpaare --- */
  const scored = pairs.map(([a, b, g]) => {
    const own = (ownedKeys.has(PALS[a].key) ? 1 : 0) + (ownedKeys.has(PALS[b].key) ? 1 : 0);
    return { a, b, g, own };
  }).sort((x, y) => y.own - x.own || PALS[x.a].name.localeCompare(PALS[y.a].name));

  const rows = scored.slice(0, 80).map(({ a, b, g, own }) => {
    const cell = i => palChip(i, ownedKeys.has(PALS[i].key) ? 'mine' : '');
    return `<li class="pair-row${own === 2 ? ' both' : ''}">
      ${cell(a)}<span class="x">×</span>${cell(b)}
      ${g ? `<span class="tn-tag">nur ${g === 'MALE' ? '♂ links' : '♀ links'}</span>` : ''}
    </li>`;
  }).join('');

  box.innerHTML = `
    <div class="dex-head">
      ${t.icon ? `<img src="${esc(t.icon)}" alt="">` : ''}
      <div class="h-main">
        <div class="h-dex">No.${t.dex}</div>
        <h2>${esc(t.name)}</h2>
        <div class="pal-elems">${t.elements.map(e =>
          `<span class="elem ${esc(e)}">${esc(e)}</span>`).join('')}</div>
      </div>
    </div>

    <div class="dex-section-title">Weg aus deinem Bestand</div>
    ${pathHtml}

    <div class="dex-section-title">Direkte Elternpaare (${pairs.length})</div>
    ${pairs.length
      ? `<ul class="pair-list">${rows}</ul>
         ${pairs.length > 80 ? `<p class="no-data">… ${pairs.length - 80} weitere Paare
            nicht gezeigt. Paare mit deinen Pals stehen oben.</p>` : ''}`
      : `<p class="no-data">Für ${esc(t.name)} gibt es kein Elternpaar —
         dieser Pal lässt sich nicht erzüchten.</p>`}`;
}

/* ---- Bestand ---- */

function renderRoster() {
  $('#rosterCount').textContent = roster.length
    ? `${roster.length} von ${PALS.length} Pals`
    : '';

  // Nach Namen sortiert, nicht nach Reihenfolge des Eintragens - so findet
  // man einen Pal wieder, ohne die ganze Liste durchzugehen.
  const sortiert = roster
    .map(r => ({ r, p: PALS.find(x => x.key === r.key) }))
    .filter(x => x.p)
    .sort((a, b) => a.p.name.localeCompare(b.p.name));

  $('#rosterList').innerHTML = sortiert.length
    ? sortiert.map(({ r, p }) => {
        const g = { M: '♂', F: '♀', '?': '?' }[r.gender] || '?';
        return `<li class="card roster-card">
          <button class="r-open" data-action="open-pal" data-key="${esc(p.key)}">
            ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
            <div class="r-main">
              <div class="r-name">${esc(p.name)}</div>
              <div class="r-sub">${p.elements.join(' · ') || '—'}</div>
            </div>
          </button>
          <button class="gender-btn g-${r.gender}" data-action="roster-gender"
                  data-key="${esc(p.key)}" title="Geschlecht (optional)">${g}</button>
          <button class="mini-btn" data-action="roster-del" data-key="${esc(p.key)}">🗑️</button>
        </li>`;
      }).join('')
    : `<div class="stub">📋<span>Noch nichts eingetragen. Trage ein, welche Arten du
        besitzt — jede genügt einmal. Der Zucht-Tab rechnet dann damit.</span></div>`;
}

/* ---- Zwei Eltern frei kombinieren ---- */

/** Ausgewählte Eltern, als PALS-Index oder null. */
const combine = { a: null, b: null };

/**
 * Schlägt das Ergebnis eines Elternpaars nach.
 * Liefert eine Liste, weil zwei Paare geschlechtsabhängig sind und dann
 * je nach Konstellation zwei verschiedene Kinder möglich sind.
 */
function lookupPair(a, b) {
  buildBreedIndexes();
  return BREEDING
    .filter(r => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a))
    .map(r => ({ child: r[2], gender: r[3] || null, firstParent: r[0] }));
}

function renderCombine() {
  const slot = (which, idx) => {
    const el = $('#slot' + which.toUpperCase());
    const inp = $('#search' + which.toUpperCase());
    if (idx === null) {
      el.innerHTML = '';
      inp.hidden = false;
      return;
    }
    const p = PALS[idx];
    const owned = roster.some(r => r.key === p.key);
    el.innerHTML = `<div class="cs-picked">
      ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
      <div class="cs-main">
        <div class="cs-name">${esc(p.name)}</div>
        <div class="cs-sub">${owned ? '✅ im Bestand' : p.elements.join(' · ') || '—'}</div>
      </div>
      <button class="mini-btn" data-action="combine-clear" data-which="${which}">✕</button>
    </div>`;
    inp.hidden = true;
  };

  slot('a', combine.a);
  slot('b', combine.b);

  const box = $('#combineResult');
  if (combine.a === null || combine.b === null) {
    box.innerHTML = `<div class="stub">🔀<span>Wähle beide Eltern, dann steht hier
      das Ergebnis.</span></div>`;
    return;
  }

  const results = lookupPair(combine.a, combine.b);
  if (!results.length) {
    box.innerHTML = `<div class="dex-section-title">Ergebnis</div>
      <p class="no-data">Für diese Kombination ist kein Ergebnis hinterlegt.
      Das sollte eigentlich nicht vorkommen — alle 44.851 Paare sind erfasst.</p>`;
    return;
  }

  const karte = ({ child, gender, firstParent }) => {
    const c = PALS[child];
    const owned = roster.some(r => r.key === c.key);
    // Bei geschlechtsabhängigen Sonderfällen sagen, welcher Elternteil männlich sein muss
    const bedingung = gender
      ? `<div class="cr-cond">nur wenn <b>${esc(PALS[firstParent].name)}</b>
         ${gender === 'MALE' ? '♂ männlich' : '♀ weiblich'} ist</div>`
      : '';
    return `<button class="combine-out" data-action="open-pal" data-key="${esc(c.key)}">
      ${c.icon ? `<img src="${esc(c.icon)}" alt="" loading="lazy">` : ''}
      <div class="co-main">
        <div class="co-name">${esc(c.name)}</div>
        <div class="pal-elems">${c.elements.map(e =>
          `<span class="elem ${esc(e)}">${esc(e)}</span>`).join('')}</div>
        ${bedingung}
        ${owned ? '<div class="cr-owned">✅ hast du schon</div>' : ''}
      </div>
      <span class="co-arrow">›</span>
    </button>`;
  };

  box.innerHTML = `
    <div class="dex-section-title">Ergebnis${results.length > 1 ? ' (geschlechtsabhängig)' : ''}</div>
    <div class="combine-outs">${results.map(karte).join('')}</div>
    ${results.length > 1
      ? `<p class="no-data">Das ist die einzige Paarung im ganzen Spiel mit zwei
         möglichen Ergebnissen — welches Kind schlüpft, hängt hier am Geschlecht.</p>`
      : ''}`;
}

/* ---- Merkliste ---- */

function renderWatchlist() {
  const badge = $('#watchCount');
  badge.textContent = watchlist.length ? watchlist.length : '';
  badge.className = watchlist.length ? 'count-badge' : '';

  const box = $('#watchList');
  if (!watchlist.length) {
    box.innerHTML = `<div class="stub">📌<span>Noch nichts gemerkt. Tippe bei einem Pal
      auf „Merken“ — hier siehst du dann, wie weit du jeweils davon entfernt bist.</span></div>`;
    return;
  }

  buildBreedIndexes();
  const ownedKeys = new Set(roster.map(r => r.key));
  const ownedIdx = PALS.filter(x => ownedKeys.has(x.key)).map(x => x.i);
  // Einmal loesen und fuer alle Eintraege nutzen statt pro Pal neu zu rechnen
  const loesung = ownedIdx.length ? solvePath(ownedIdx) : null;

  const eintraege = watchlist
    .map(key => PALS.find(p => p.key === key))
    .filter(Boolean)
    .map(p => {
      let status, klasse;
      if (ownedKeys.has(p.key)) {
        status = '✅ hast du bereits';
        klasse = 'done';
      } else if (!loesung) {
        status = 'kein Bestand hinterlegt';
        klasse = 'unknown';
      } else if (!isFinite(loesung.cost[p.i])) {
        status = 'aus deinem Bestand nicht erreichbar';
        klasse = 'blocked';
      } else {
        const n = planSteps(p.i, loesung.via, ownedIdx).length;
        status = `${n} ${n === 1 ? 'Schritt' : 'Schritte'} · ${loesung.cost[p.i]} Gen.`;
        klasse = n <= 3 ? 'near' : 'far';
      }
      return { p, status, klasse };
    })
    .sort((a, b) => a.p.name.localeCompare(b.p.name));

  box.innerHTML = `<ul class="card-list">${eintraege.map(({ p, status, klasse }) => `
    <li class="card watch-card">
      <button class="r-open" data-action="goto-breeding" data-key="${esc(p.key)}">
        ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
        <div class="r-main">
          <div class="r-name">${esc(p.name)}</div>
          <div class="w-status ${klasse}">${esc(status)}</div>
        </div>
      </button>
      <button class="mini-btn" data-action="watch-del" data-key="${esc(p.key)}"
              title="Von der Merkliste nehmen">✕</button>
    </li>`).join('')}</ul>`;
}

/**
 * Vorschlagsliste für die Suchfelder.
 * Beim Bestand werden bereits eingetragene Arten als solche markiert und sind
 * nicht mehr auswaehlbar - jede Art gehoert nur einmal in die Liste.
 */
function renderSuggest(listEl, query, action) {
  const q = query.trim().toLowerCase();
  if (!q) { listEl.innerHTML = ''; return; }
  const fuerBestand = action === 'roster-add';

  const hits = PALS.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  listEl.innerHTML = hits.map(p => {
    const schonDa = fuerBestand && hasPal(p.key);
    return `<li ${schonDa ? 'class="dimmed"' : `data-action="${action}" data-key="${esc(p.key)}"`}>
      ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
      <span>${esc(p.name)}</span>
      <span class="s-elems">${schonDa ? '✅ schon drin' : p.elements.join(' · ')}</span></li>`;
  }).join('');
}

/* ============================================================
   Tier List
   ============================================================ */

const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];
const OVERRIDE_KEY = 'palworldapp-tier-overrides-v1';

/** Eigene Einstufungen: { [listId]: { [palKey]: 'S'|'A'|... } } */
let tierOverrides = {};
try { tierOverrides = JSON.parse(localStorage.getItem(OVERRIDE_KEY)) || {}; } catch { tierOverrides = {}; }
const saveOverrides = () => {
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(tierOverrides)); } catch { /* egal */ }
};

let tierList = 'overall';
let tierQuery = '';

/** Effektive Stufe eines Pals: eigene Einstufung schlägt die von palworld.gg. */
function effectiveTiers(listId) {
  const base = TIERLISTS[listId].tiers;
  const ov = tierOverrides[listId] || {};
  const out = {};
  for (const t of TIER_ORDER) out[t] = [];

  const placed = new Set();
  for (const [tier, idxs] of Object.entries(base)) {
    for (const i of idxs) {
      const key = PALS[i].key;
      const t = ov[key] || tier;
      if (out[t]) { out[t].push(i); placed.add(key); }
    }
  }
  // Pals, die in dieser Liste gar nicht vorkamen, aber eigenhändig einsortiert wurden
  for (const [key, t] of Object.entries(ov)) {
    if (placed.has(key) || !out[t]) continue;
    const p = PALS.find(x => x.key === key);
    if (p) out[t].push(p.i);
  }
  return out;
}

function renderTierList() {
  $('#tierTabs').innerHTML = Object.entries(TIERLISTS).map(([id, l]) =>
    `<button class="subtab${id === tierList ? ' active' : ''}"
      data-action="tier-list" data-list="${esc(id)}">${esc(l.label)}</button>`).join('');

  const ovCount = Object.keys(tierOverrides[tierList] || {}).length;
  $('#tierOverrideNote').innerHTML = ovCount
    ? `<div class="ov-note">${ovCount} eigene ${ovCount === 1 ? 'Einstufung' : 'Einstufungen'}
       in dieser Liste <button class="tool-btn" data-action="tier-reset">zurücksetzen</button></div>`
    : '';

  const tiers = effectiveTiers(tierList);
  const q = tierQuery.trim().toLowerCase();
  const ov = tierOverrides[tierList] || {};

  $('#tierRows').innerHTML = TIER_ORDER.map(t => {
    const pals = tiers[t]
      .map(i => PALS[i])
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.dex - b.dex);
    if (q && !pals.length) return '';

    return `<div class="tier-row">
      <div class="tier-badge t-${t}">${t}</div>
      <div class="tier-pals">
        ${pals.length ? pals.map(p => `<button class="tier-pal${ov[p.key] ? ' custom' : ''}"
            data-action="tier-pal" data-key="${esc(p.key)}" title="${esc(p.name)}">
            ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
            <span>${esc(p.name)}</span>
          </button>`).join('')
          : '<span class="no-data">—</span>'}
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   Guide
   ============================================================ */

function renderGuide() {
  const block = b => {
    switch (b.t) {
      case 'p':
        return `<p class="g-p">${b.text}</p>`;
      case 'ul':
        return `<ul class="g-ul">${b.items.map(x => `<li>${x}</li>`).join('')}</ul>`;
      case 'steps':
        return `<ol class="g-steps">${b.items.map(x => `<li>${x}</li>`).join('')}</ol>`;
      case 'note':
        return `<div class="g-note${b.kind === 'warn' ? ' warn' : ''}">${b.text}</div>`;
      case 'formula':
        return `<pre class="g-formula">${esc(b.text)}</pre>`;
      case 'table':
        return `<div class="g-table-wrap"><table class="g-table">
          <tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
          ${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}
        </table></div>`;
      case 'passives': {
        // Direkt aus den Spieldaten, damit die Liste nie veraltet
        const list = PASSIVES.filter(p => p.rank === b.rank);
        return `<div class="g-passives">
          <div class="g-plabel">${esc(b.label)}</div>
          <div class="chip-row">${list.map(p =>
            `<span class="chip pass" title="${esc(p.description || '')}">${esc(p.name)}</span>`
          ).join('')}</div></div>`;
      }
      default:
        return '';
    }
  };

  $('#guideBody').innerHTML = GUIDE.map(s => `
    <section class="g-section">
      <h3 class="g-title"><span class="g-ico">${s.icon}</span>${esc(s.title)}</h3>
      ${s.blocks.map(block).join('')}
    </section>`).join('');
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
  renderBreeding();
  renderRoster();
  renderTierList();
  renderGuide();
  renderCombine();
  renderWatchlist();

  // Header-Hoehe an die echte Hoehe angleichen (Notch/Safe-Area)
  const syncHeader = () => document.documentElement.style
    .setProperty('--header-h', $('#appHeader').offsetHeight + 'px');
  syncHeader();
  window.addEventListener('resize', syncHeader);

  $('#palSearch').addEventListener('input', e => {
    state.q = e.target.value;
    resetPageAndRender();
  });

  $('#targetSearch').addEventListener('input', e =>
    renderSuggest($('#targetResults'), e.target.value, 'pick-target'));

  $('#rosterInput').addEventListener('input', e =>
    renderSuggest($('#rosterSuggest'), e.target.value, 'roster-add'));

  $('#tierSearch').addEventListener('input', e => {
    tierQuery = e.target.value;
    renderTierList();
  });

  $('#searchA').addEventListener('input', e =>
    renderSuggest($('#suggestA'), e.target.value, 'combine-a'));
  $('#searchB').addEventListener('input', e =>
    renderSuggest($('#suggestB'), e.target.value, 'combine-b'));

  $('#rosterFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('Kein Array');
      const known = new Set(PALS.map(p => p.key));
      roster = data
        .filter(r => r && known.has(r.key))
        .map(r => ({ key: r.key, gender: ['M', 'F', '?'].includes(r.gender) ? r.gender : '?' }));
      saveRoster();
      renderRoster();
      renderBreeding();
      alert(`${roster.length} Pals importiert.`);
    } catch (err) {
      alert('Import fehlgeschlagen: ' + err.message);
    }
    e.target.value = '';
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
    if (nav) return showTab(nav.dataset.nav);

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

      /* ---- Zucht: Modus umschalten ---- */
      case 'breed-mode': {
        const mode = act.dataset.mode;
        document.querySelectorAll('[data-action="breed-mode"]').forEach(b =>
          b.classList.toggle('active', b === act));
        $('#breedModeTarget').hidden = mode !== 'target';
        $('#breedModeCombine').hidden = mode !== 'combine';
        $('#breedModeWatch').hidden = mode !== 'watch';
        if (mode === 'watch') renderWatchlist();  // Aufwand gegen aktuellen Bestand
        break;
      }

      /* ---- Zucht: zwei Eltern kombinieren ---- */
      case 'combine-a':
      case 'combine-b': {
        const which = act.dataset.action.endsWith('a') ? 'a' : 'b';
        combine[which] = PALS.find(p => p.key === act.dataset.key).i;
        $('#search' + which.toUpperCase()).value = '';
        $('#suggest' + which.toUpperCase()).innerHTML = '';
        renderCombine();
        break;
      }
      case 'combine-clear':
        combine[act.dataset.which] = null;
        renderCombine();
        break;

      /* ---- Zucht ---- */
      case 'pick-target': {
        breedTarget = PALS.find(p => p.key === act.dataset.key).i;
        $('#targetSearch').value = PALS[breedTarget].name;
        $('#targetResults').innerHTML = '';
        renderBreeding();
        break;
      }

      /* ---- Bestand ---- */
      case 'roster-add':
        if (!hasPal(act.dataset.key)) roster.push({ key: act.dataset.key, gender: '?' });
        saveRoster();
        $('#rosterInput').value = '';
        $('#rosterSuggest').innerHTML = '';
        afterDataChange();
        break;
      case 'roster-gender': {
        const r = roster.find(x => x.key === act.dataset.key);
        if (r) r.gender = { '?': 'M', M: 'F', F: '?' }[r.gender] || '?';
        saveRoster();
        afterDataChange();
        break;
      }
      case 'roster-del':
        roster = roster.filter(r => r.key !== act.dataset.key);
        saveRoster();
        afterDataChange();
        break;

      /* ---- Besitz und Merkliste aus dem Detailfenster ---- */
      case 'own-toggle': {
        const key = act.dataset.key;
        if (hasPal(key)) roster = roster.filter(r => r.key !== key);
        else roster.push({ key, gender: '?' });
        saveRoster();
        afterDataChange();
        openPal(key, act.closest('#modalContent')?.querySelector('.tier-picker')
          ? tierList : undefined);
        break;
      }
      case 'watch-toggle': {
        const key = act.dataset.key;
        if (isWatched(key)) watchlist = watchlist.filter(k => k !== key);
        else watchlist.push(key);
        saveWatchlist();
        renderWatchlist();
        openPal(key, act.closest('#modalContent')?.querySelector('.tier-picker')
          ? tierList : undefined);
        break;
      }
      case 'watch-del':
        watchlist = watchlist.filter(k => k !== act.dataset.key);
        saveWatchlist();
        renderWatchlist();
        break;
      case 'roster-export': {
        const blob = new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'palworld-bestand.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        break;
      }
      case 'roster-import':
        $('#rosterFile').click();
        break;

      /* ---- Tier List ---- */
      case 'tier-list':
        tierList = act.dataset.list;
        renderTierList();
        break;
      case 'tier-pal':
        // Volles Detailfenster inkl. Zucht, plus Tier-Auswahl fuer diese Liste
        openPal(act.dataset.key, tierList);
        break;
      case 'tier-set': {
        (tierOverrides[tierList] ||= {})[act.dataset.key] = act.dataset.tier;
        saveOverrides();
        renderTierList();
        openPal(act.dataset.key, tierList); // offen lassen, neue Stufe zeigen
        break;
      }
      case 'tier-clear':
        if (tierOverrides[tierList]) delete tierOverrides[tierList][act.dataset.key];
        saveOverrides();
        renderTierList();
        openPal(act.dataset.key, tierList);
        break;
      case 'tier-reset':
        delete tierOverrides[tierList];
        saveOverrides();
        renderTierList();
        break;
      case 'open-pal':
        openPal(act.dataset.key);
        break;
      case 'goto-breeding': {
        const p = PALS.find(x => x.key === act.dataset.key);
        breedTarget = p.i;
        $('#targetSearch').value = p.name;
        $('#targetResults').innerHTML = '';
        renderBreeding();
        $('#modalOverlay').hidden = true;
        showTab('breeding');
        break;
      }
    }
  });

  // Klick auf den abgedunkelten Hintergrund schliesst das Modal
  $('#modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') $('#modalOverlay').hidden = true;
  });

  renderList();

  // Service Worker nur auf der echten Seite registrieren. Lokal wuerde er
  // hartnaeckig alte Dateien ausliefern und jede Aenderung verschlucken.
  const lokal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !lokal) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();  // bei jedem Start nach einer neueren Version sehen
    }).catch(() => { /* offline egal */ });

    // Uebernimmt ein neuer Service Worker, einmal neu laden - sonst laeuft die
    // Seite mit dem alten Code weiter, bis der Nutzer selbst neu startet.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
