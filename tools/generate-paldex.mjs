#!/usr/bin/env node
/*
  generate-paldex.mjs
  Erzeugt ../paldex.js aus drei Quellen und cached alle Rohdaten lokal.

  Warum Node und nicht PowerShell (anders als generate-pokedex.ps1 im Nuzlocke-Projekt):
  PalCalcs breeding.json ist 8,9 MB mit 44.851 Objekten. ConvertFrom-Json in
  PowerShell 5.1 baut daraus einen PSCustomObject-Graphen und braucht dafuer
  Minuten. Node ist damit in unter einer Sekunde durch.

  Quellen:
    1. tylercamp/palcalc (MIT, aktiv gepflegt)  -> Basis fuer ALLE 299 Pals:
       Stats, Work Suitability, Breeding Power, Geschlechterverteilung,
       Passives, Breeding-Mechanik.
    2. tylercamp/palcalc breeding.json (MIT)    -> vollstaendige Zuchttabelle,
       44.851 Paare, Unique-Combos bereits eingerechnet.
    3. palworld.gg (robots.txt erlaubt alles)   -> Elemente, Drops, Dex-Nummer,
       Titel und Icon-URLs. Nur hier gibt es Typdaten fuer die neueren Pals.
    4. mlg404/palworld-paldex-api (MIT)         -> Habitat-Karten (nur 126 Pals,
       Datenstand 2024 - deshalb ausschliesslich als Zusatz, nie als Basis).

  Aufruf:
    node tools/generate-paldex.mjs
    node tools/generate-paldex.mjs --refresh      # Cache ignorieren
    node tools/generate-paldex.mjs --throttle 300 # langsamer crawlen
*/

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

// ---------------------------------------------------------------- Argumente

const argv = process.argv.slice(2)
const argVal = (flag, fallback) => {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT_FILE = argVal('--out', join(ROOT, 'paldex.js'))
const CACHE_DIR = argVal('--cache', join(tmpdir(), 'palworld-cache'))
const THROTTLE_MS = Number(argVal('--throttle', '150'))
const REFRESH = argv.includes('--refresh')

const RAW = 'https://raw.githubusercontent.com'
const SRC = {
  palcalcDb: `${RAW}/tylercamp/palcalc/main/PalCalc.Model/db.json`,
  palcalcBreeding: `${RAW}/tylercamp/palcalc/main/PalCalc.Model/breeding.json`,
  paldexPals: `${RAW}/mlg404/palworld-paldex-api/main/src/pals.json`,
  sitemap: 'https://palworld.gg/__sitemap__/en.xml',
  palPage: slug => `https://palworld.gg/pal/${slug}`,
  icon: internal => `https://palworld.gg/images/full_palicon/T_${internal}_icon_normal.png`,
  habitat: (key, when) =>
    `${RAW}/mlg404/palworld-paldex-api/main/public/images/maps/${key}-${when}.png`,
}

// ------------------------------------------------------------------- Helfer

const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(...a)

const cacheNameFor = url =>
  join(CACHE_DIR, url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '_'))

/** Laedt eine URL als Text und legt sie im Cache ab. Gedrosselt, mit Retry. */
async function fetchText(url, { throttle = true } = {}) {
  const cacheFile = cacheNameFor(url)
  if (!REFRESH && existsSync(cacheFile)) return readFile(cacheFile, 'utf8')

  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'palworldapp-datengenerator (privates Tool)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.text()
      await writeFile(cacheFile, body, 'utf8')
      if (throttle) await sleep(THROTTLE_MS)
      return body
    } catch (err) {
      lastErr = err
      await sleep(500 * attempt)
    }
  }
  throw new Error(`${url} nicht ladbar: ${lastErr.message}`)
}

const fetchJson = async url => JSON.parse(await fetchText(url, { throttle: false }))

/** Schneidet den HTML-Abschnitt zwischen einem Startmarker und dem naechsten <h2>/Ende. */
function section(html, startMarker, span = 4000) {
  const i = html.indexOf(startMarker)
  if (i < 0) return ''
  return html.slice(i, i + span)
}

const decodeEntities = s =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()

// -------------------------------------------------- palworld.gg HTML parsen

/**
 * Zieht Elemente, Drops, Dex-Nummer und Titel aus einer Pal-Detailseite.
 * Die Seite ist serverseitig gerendert, die Werte stehen als Klartext in
 * eigenen Divs - kein JavaScript noetig.
 */
function parsePalPage(html) {
  const out = { elements: [], drops: [], dex: null, title: null }

  // <div class="dex">No.143</div>
  const dex = html.match(/<div class="dex">No\.(\d+)<\/div>/)
  if (dex) out.dex = Number(dex[1])

  // <p class="prefix">Night Shade Hunter</p>
  const title = html.match(/<p class="prefix">([^<]*)<\/p>/)
  if (title) out.title = decodeEntities(title[1])

  // <div class="elements">...<img alt="Dark element">...<div class="name">Dark</div>
  const elemBlock = section(html, 'class="elements"', 1200)
  out.elements = [...elemBlock.matchAll(/alt="([^"]+?) element"/g)].map(m => decodeEntities(m[1]))

  // <div class="drops"><h2>Possible Drops</h2><table>...<img alt="Aquatic Pal Fluids">
  const dropBlock = section(html, '<div class="drops">', 12000)
  const seen = new Set()
  for (const m of dropBlock.matchAll(/<img src="\/images\/items\/[^"]+" width="28" height="28" alt="([^"]+)"/g)) {
    const name = decodeEntities(m[1])
    if (!seen.has(name)) {
      seen.add(name)
      out.drops.push(name)
    }
  }

  return out
}

// --------------------------------------------------------------------- Main

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  log(`Cache: ${CACHE_DIR}${REFRESH ? '  (wird ignoriert: --refresh)' : ''}`)

  // --- 1. PalCalc: Basisdaten -------------------------------------------
  log('\n[1/5] PalCalc db.json ...')
  const db = await fetchJson(SRC.palcalcDb)
  log(`      Version ${db.Version}, ${db.Pals.length} Pals`)

  // --- 2. PalCalc: Zuchttabelle -----------------------------------------
  log('[2/5] PalCalc breeding.json (8,9 MB) ...')
  const breedingRaw = await fetchJson(SRC.palcalcBreeding)
  log(`      ${breedingRaw.Breeding.length} Zuchtpaare`)

  // --- 3. Sitemap: verbindliche Slugs -----------------------------------
  log('[3/5] palworld.gg Sitemap ...')
  const sitemap = await fetchText(SRC.sitemap, { throttle: false })
  const slugs = new Set(
    [...sitemap.matchAll(/<loc>https:\/\/palworld\.gg\/pal\/([^<\/]+)\/?<\/loc>/g)].map(m => m[1])
  )
  log(`      ${slugs.size} Pal-Seiten`)

  // --- 4. Habitat-Karten aus der 2024er-Quelle --------------------------
  log('[4/5] paldex-api (Habitat-Karten) ...')
  const paldex = await fetchJson(SRC.paldexPals)
  const habitatByName = new Map()
  for (const p of paldex) {
    if (p.maps && (p.maps.day || p.maps.night)) {
      habitatByName.set(p.name, {
        day: p.maps.day ? SRC.habitat(p.key, 'day') : null,
        night: p.maps.night ? SRC.habitat(p.key, 'night') : null,
      })
    }
  }
  log(`      ${habitatByName.size} Pals mit Habitat-Karte`)

  // --- 5. Anreicherung von palworld.gg ----------------------------------
  const toSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  log(`[5/5] ${db.Pals.length} Detailseiten von palworld.gg (${THROTTLE_MS} ms Pause) ...`)

  const enrichment = new Map()
  const noPage = []
  let done = 0
  for (const pal of db.Pals) {
    const slug = toSlug(pal.Name)
    if (!slugs.has(slug)) {
      noPage.push(pal.Name)
    } else {
      try {
        enrichment.set(pal.InternalName, parsePalPage(await fetchText(SRC.palPage(slug))))
      } catch (err) {
        noPage.push(`${pal.Name} (${err.message})`)
      }
    }
    if (++done % 50 === 0) log(`      ${done}/${db.Pals.length}`)
  }
  log(`      fertig. Ohne Detailseite: ${noPage.length}${noPage.length ? ' -> ' + noPage.join(', ') : ''}`)

  // --- Zusammenfuehren ---------------------------------------------------
  // --- Icons pruefen -----------------------------------------------------
  // Die Icon-URLs folgen dem InternalName. Das traegt fuer fast alle Pals,
  // aber Sonderformen wie Gumoss' Bluetenvariante (PlantSlime_Flower) haben
  // kein eigenes Icon. Fuer die faellt es auf die Grundform zurueck.
  // Ergebnis wird gecacht, der Check laeuft also nur beim ersten Lauf.
  const iconCacheFile = join(CACHE_DIR, '_icon-check.json')
  let iconMap = {}
  if (!REFRESH && existsSync(iconCacheFile)) {
    iconMap = JSON.parse(await readFile(iconCacheFile, 'utf8'))
  }
  const unchecked = db.Pals.filter(p => !(p.InternalName in iconMap))
  if (unchecked.length) {
    log(`\n[6/6] Icons pruefen (${unchecked.length} offen) ...`)
    for (const p of unchecked) {
      const candidates = [p.InternalName]
      // Variantenname wie IceHorse_Dark -> Grundform IceHorse als Rueckfall
      if (p.InternalName.includes('_')) candidates.push(p.InternalName.split('_')[0])
      iconMap[p.InternalName] = null
      for (const c of candidates) {
        try {
          const res = await fetch(SRC.icon(c), { method: 'HEAD' })
          if (res.ok) {
            iconMap[p.InternalName] = c
            break
          }
        } catch {
          /* naechsten Kandidaten versuchen */
        }
        await sleep(THROTTLE_MS)
      }
    }
    await writeFile(iconCacheFile, JSON.stringify(iconMap), 'utf8')
    const fallbacks = db.Pals.filter(p => iconMap[p.InternalName] && iconMap[p.InternalName] !== p.InternalName)
    const missing = db.Pals.filter(p => !iconMap[p.InternalName])
    log(`      Rueckfall auf Grundform: ${fallbacks.length}${fallbacks.length ? ' -> ' + fallbacks.map(p => p.Name).join(', ') : ''}`)
    log(`      ohne Icon: ${missing.length}${missing.length ? ' -> ' + missing.map(p => p.Name).join(', ') : ''}`)
  }

  const passiveNameById = new Map(db.PassiveSkills.map(p => [p.InternalName, p.Name]))
  const index = new Map(db.Pals.map((p, i) => [p.InternalName, i]))

  const PALS = db.Pals.map((p, i) => {
    const extra = enrichment.get(p.InternalName) || { elements: [], drops: [], dex: null, title: null }
    const work = {}
    for (const [k, v] of Object.entries(p.WorkSuitability || {})) if (v > 0) work[k] = v
    const gender = db.BreedingGenderProbability[p.InternalName] || { MALE: 0.5, FEMALE: 0.5 }

    return {
      i,
      key: p.InternalName,
      name: p.Name,
      slug: toSlug(p.Name),
      dex: extra.dex ?? p.Id.PalDexNo,
      variant: !!p.Id.IsVariant,
      title: extra.title,
      elements: extra.elements,
      drops: extra.drops,
      work,
      stats: {
        hp: p.Hp,
        attack: p.Attack,
        defense: p.Defense,
        craftSpeed: p.CraftSpeed,
        stamina: p.Stamina,
        walkSpeed: p.WalkSpeed,
        runSpeed: p.RunSpeed,
        rideSprintSpeed: p.RideSprintSpeed,
        transportSpeed: p.TransportSpeed,
        food: p.FoodAmount,
        maxFullStomach: p.MaxFullStomach,
      },
      rarity: p.Rarity,
      size: p.Size,
      price: p.Price,
      nocturnal: !!p.Nocturnal,
      wildLevel: [p.MinWildLevel, p.MaxWildLevel],
      breedPower: p.BreedingPower,
      gender: { male: gender.MALE, female: gender.FEMALE },
      guaranteedPassives: (p.GuaranteedPassivesInternalIds || []).map(
        id => passiveNameById.get(id) || id
      ),
      partnerSkill: p.PartnerSkill,
      icon: iconMap[p.InternalName] ? SRC.icon(iconMap[p.InternalName]) : null,
      habitat: habitatByName.get(p.Name) || null,
    }
  })

  // Zuchttabelle als Index-Tripel: [elternA, elternB, kind].
  // Aus 8,9 MB Klartext werden so rund 0,5 MB.
  // Die zwei geschlechtsabhaengigen Sonderfaelle (Katress x Wixen) bekommen
  // ein viertes Feld: 'MALE'/'FEMALE' = Geschlecht von elternA.
  const BREEDING = []
  const skipped = []
  for (const b of breedingRaw.Breeding) {
    const a = index.get(b.Parent1InternalName)
    const c = index.get(b.Parent2InternalName)
    const child = index.get(b.ChildInternalName)
    if (a === undefined || c === undefined || child === undefined) {
      skipped.push(`${b.Parent1InternalName}+${b.Parent2InternalName}`)
      continue
    }
    const row = [a, c, child]
    if (b.Parent1Gender !== 'WILDCARD') row.push(b.Parent1Gender)
    BREEDING.push(row)
  }
  if (skipped.length) log(`      ${skipped.length} Zuchtpaare mit unbekanntem Pal uebersprungen`)

  const PASSIVES = db.PassiveSkills.filter(p => p.IsStandardPassiveSkill).map(p => ({
    key: p.InternalName,
    name: p.Name,
    rank: p.Rank,
    description: p.Description,
    randomInheritance: p.RandomInheritanceAllowed,
    randomWeight: p.RandomInheritanceWeight,
  }))

  const ELEMENTS = db.Elements.map(e => e.Name)
  const WORK_TYPES = Object.keys(db.Pals[0].WorkSuitability || {})

  // --- Ausgabe ----------------------------------------------------------
  // MinBreedingSteps aus PalCalc wird bewusst NICHT mitgeschrieben: eine
  // Breitensuche ueber 44.851 Kanten laeuft im Browser in Sekundenbruchteilen,
  // die 299x299-Matrix wuerde die Datei nur um ~250 KB aufblaehen.
  const meta = {
    generatedFrom: 'tools/generate-paldex.mjs',
    palcalcVersion: db.Version,
    palCount: PALS.length,
    breedingPairs: BREEDING.length,
    passiveCount: PASSIVES.length,
    palsWithElements: PALS.filter(p => p.elements.length).length,
    palsWithHabitat: PALS.filter(p => p.habitat).length,
    palsWithIcon: PALS.filter(p => p.icon).length,
  }

  const js = `// AUTO-GENERIERT von tools/generate-paldex.mjs - nicht von Hand bearbeiten.
//
// Quellen: tylercamp/palcalc (MIT), mlg404/palworld-paldex-api (MIT), palworld.gg
// ${JSON.stringify(meta)}

const PALDEX_META = ${JSON.stringify(meta, null, 2)};

// Alle ${PALS.length} Pals. Feld "i" ist der Index, auf den BREEDING verweist.
const PALS = ${JSON.stringify(PALS, null, 1)};

// [elternA, elternB, kind] als PALS-Indizes. Optionales 4. Feld = Geschlecht
// von elternA, falls das Ergebnis geschlechtsabhaengig ist.
const BREEDING = ${JSON.stringify(BREEDING)};

// Die ${PASSIVES.length} regulaeren Passiv-Faehigkeiten.
const PASSIVES = ${JSON.stringify(PASSIVES, null, 1)};

// Vererbungsgewichte aus dem Spiel (fuer Wahrscheinlichkeitsrechnung im Pathfinder).
const BREEDING_MECHANICS = ${JSON.stringify(db.BreedingMechanics, null, 1)};

const ELEMENTS = ${JSON.stringify(ELEMENTS)};
const WORK_TYPES = ${JSON.stringify(WORK_TYPES)};
`

  await writeFile(OUT_FILE, js, 'utf8')
  const kb = Math.round(Buffer.byteLength(js) / 1024)

  log('\n--- Ergebnis ---')
  log(`  ${OUT_FILE}  (${kb} KB)`)
  for (const [k, v] of Object.entries(meta)) log(`  ${k}: ${v}`)
  const gaps = PALS.filter(p => !p.elements.length)
  if (gaps.length) log(`  ohne Elementdaten: ${gaps.length} -> ${gaps.map(p => p.name).join(', ')}`)
}

main().catch(err => {
  console.error('\nFEHLGESCHLAGEN:', err.message)
  process.exit(1)
})
