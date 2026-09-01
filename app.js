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
   Zucht: Indizes, Bestand und Pathfinder
   ============================================================ */

const ROSTER_KEY = 'palworldapp-roster-v1';

/** Bestand: [{ key, gender }] mit gender 'M' | 'F' | '?' */
let roster = [];
try { roster = JSON.parse(localStorage.getItem(ROSTER_KEY)) || []; } catch { roster = []; }
const saveRoster = () => {
  try { localStorage.setItem(ROSTER_KEY, JSON.stringify(roster)); } catch { /* voll/privat */ }
};

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

/** Wie viele Exemplare dieser Art hat der Nutzer, und welche Geschlechter? */
function ownedInfo(palIdx) {
  const key = PALS[palIdx].key;
  const mine = roster.filter(r => r.key === key);
  return {
    count: mine.length,
    male: mine.some(r => r.gender === 'M'),
    female: mine.some(r => r.gender === 'F'),
    unknown: mine.some(r => r.gender === '?'),
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

function renderSteps(steps, ownedIdx) {
  const ownedSet = new Set(ownedIdx);
  const bred = new Set();

  const cell = i => {
    const p = PALS[i];
    const tag = ownedSet.has(i) ? 'mine' : (bred.has(i) ? 'bred' : '');
    return `<span class="pp ${tag}">${p.icon
      ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}${esc(p.name)}</span>`;
  };

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
    const cell = i => `<span class="pp ${ownedKeys.has(PALS[i].key) ? 'mine' : ''}">
      ${PALS[i].icon ? `<img src="${esc(PALS[i].icon)}" alt="" loading="lazy">` : ''}
      ${esc(PALS[i].name)}</span>`;
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
    ? `${roster.length} ${roster.length === 1 ? 'Pal' : 'Pals'} im Bestand`
    : '';

  $('#rosterList').innerHTML = roster.length
    ? roster.map((r, idx) => {
        const p = PALS.find(x => x.key === r.key);
        if (!p) return '';
        const g = { M: '♂', F: '♀', '?': '?' }[r.gender] || '?';
        return `<li class="card roster-card">
          ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
          <div class="r-main">
            <div class="r-name">${esc(p.name)}</div>
            <div class="r-sub">${p.elements.join(' · ') || '—'}</div>
          </div>
          <button class="gender-btn g-${r.gender}" data-action="roster-gender"
                  data-idx="${idx}" title="Geschlecht umschalten">${g}</button>
          <button class="mini-btn" data-action="roster-del" data-idx="${idx}">🗑️</button>
        </li>`;
      }).join('')
    : `<div class="stub">📋<span>Noch nichts eingetragen. Trage die Pals ein,
        mit denen du züchten willst — Geschlecht per Tipp auf ♂/♀.</span></div>`;
}

/** Vorschlagsliste für die beiden Suchfelder (Ziel-Pal und Bestand). */
function renderSuggest(listEl, query, action) {
  const q = query.trim().toLowerCase();
  if (!q) { listEl.innerHTML = ''; return; }
  const hits = PALS.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  listEl.innerHTML = hits.map(p => `<li data-action="${action}" data-key="${esc(p.key)}">
    ${p.icon ? `<img src="${esc(p.icon)}" alt="" loading="lazy">` : ''}
    <span>${esc(p.name)}</span>
    <span class="s-elems">${p.elements.join(' · ')}</span></li>`).join('');
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

/** Kleines Auswahlfenster: Stufe ändern oder zum Pal springen. */
function openTierPicker(key) {
  const p = PALS.find(x => x.key === key);
  const ov = tierOverrides[tierList] || {};
  const current = ov[key] || TIER_ORDER.find(t =>
    (TIERLISTS[tierList].tiers[t] || []).includes(p.i));

  $('#modalContent').innerHTML = `
    <div class="dex-head">
      ${p.icon ? `<img src="${esc(p.icon)}" alt="">` : ''}
      <div class="h-main">
        <h2>${esc(p.name)}</h2>
        <div class="h-title">${esc(TIERLISTS[tierList].label)} · aktuell
          ${current ? 'Stufe ' + current : 'nicht eingestuft'}</div>
      </div>
    </div>
    <div class="dex-section-title">Stufe ändern</div>
    <div class="tier-picker">
      ${TIER_ORDER.map(t => `<button class="tier-badge t-${t}${t === current ? ' on' : ''}"
        data-action="tier-set" data-key="${esc(key)}" data-tier="${t}">${t}</button>`).join('')}
    </div>
    ${ov[key] ? `<button class="tool-btn wide" data-action="tier-clear"
      data-key="${esc(key)}">Eigene Einstufung entfernen</button>` : ''}
    <div class="dex-section-title">Pal</div>
    <button class="tool-btn wide" data-action="open-pal" data-key="${esc(key)}">
      Alle Daten zu ${esc(p.name)} ansehen</button>`;
  $('#modalOverlay').hidden = false;
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
        roster.push({ key: act.dataset.key, gender: '?' });
        saveRoster();
        $('#rosterInput').value = '';
        $('#rosterSuggest').innerHTML = '';
        renderRoster();
        renderBreeding();
        break;
      case 'roster-gender': {
        const r = roster[Number(act.dataset.idx)];
        r.gender = { '?': 'M', M: 'F', F: '?' }[r.gender] || '?';
        saveRoster();
        renderRoster();
        renderBreeding();
        break;
      }
      case 'roster-del':
        roster.splice(Number(act.dataset.idx), 1);
        saveRoster();
        renderRoster();
        renderBreeding();
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
        openTierPicker(act.dataset.key);
        break;
      case 'tier-set': {
        (tierOverrides[tierList] ||= {})[act.dataset.key] = act.dataset.tier;
        saveOverrides();
        renderTierList();
        $('#modalOverlay').hidden = true;
        break;
      }
      case 'tier-clear':
        if (tierOverrides[tierList]) delete tierOverrides[tierList][act.dataset.key];
        saveOverrides();
        renderTierList();
        $('#modalOverlay').hidden = true;
        break;
      case 'tier-reset':
        delete tierOverrides[tierList];
        saveOverrides();
        renderTierList();
        break;
      case 'open-pal':
        openPal(act.dataset.key);
        break;
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
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline egal */ });
  }
}

document.addEventListener('DOMContentLoaded', init);
