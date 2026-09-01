# palworldapp

Persönliches Palworld-Begleittool: Zucht-Pathfinder, Pal-Datenbank, Tier List und Guide.
Mobile-first PWA, reines HTML/CSS/JS, **kein Build-Schritt**, läuft über GitHub Pages.

Gespielt wird auf PlayStation — es gibt daher **keine Savefile-Anbindung**. Der eigene
Pal-Bestand wird von Hand gepflegt und liegt im `localStorage` (Import/Export als JSON).

## Geplante Bereiche

| Bereich | Inhalt |
| --- | --- |
| **Zucht / Pathfinder** | Ziel-Pal wählen → Zuchtbaum. Zwei Modi: „von Grund auf" und „mit meinen Pals" (Standard). Pro Knoten Work Suitability und Passive-Wahrscheinlichkeiten. |
| **Meine Pals** | Manuell gepflegtes Roster (Spezies, Geschlecht, Passives) als Basis für den Pathfinder. |
| **Pal-Datenbank** | Suche nach Name, Filter nach Typ, Work-Level, Drops, Größe. |
| **Tier List** | Eigene, editierbare Datei — mit den Pal-Einträgen verknüpft, Tiers überschreibbar. |
| **Guide** | Zuchtgrundlagen, Passive-Prioritäten, Basis-Setups, gängige Zuchtketten. |
| **Karte** | Link auf eine externe Interaktivkarte (keine eigenen Kacheln/Marker). |

## Daten

`paldex.js` wird von `tools/generate-paldex.ps1` erzeugt und ist im Repo eingecheckt.
Quellen (beide MIT-lizenziert):

- [`mlg404/palworld-paldex-api`](https://github.com/mlg404/palworld-paldex-api) — Pals
  (Stats, Typen, Drops, Skills, Work Suitability) und `breeding.json` (Kind → Elternpaare)
- [`tylercamp/palcalc`](https://github.com/tylercamp/palcalc) — Passive Skills,
  `BreedingMechanics`, Vererbungswahrscheinlichkeiten

Zuchtformel: `Kind-Rank = floor((RankA + RankB + 1) / 2)`, dann die Spezies mit dem
nächstliegenden Rank — plus Override-Tabelle für die Unique-Combos.

## Deployment

Push auf `main` → Actions-Workflow `.github/workflows/deploy-pages.yml` veröffentlicht das
Repo-Root auf GitHub Pages. `.nojekyll` verhindert die Jekyll-Verarbeitung.

Zwei bekannte Stolpersteine (aus dem Nuzlocke-Projekt):

- Der Deploy-Job kann mit „Timeout reached" **rot fehlschlagen, obwohl korrekt
  veröffentlicht wurde** ([actions/deploy-pages#406](https://github.com/actions/deploy-pages/issues/406)).
  Erst live prüfen, nicht blind neu deployen — und die Pages-Source **nicht** auf None
  zurücksetzen.
- Bei Updates `CACHE_NAME` in `sw.js` hochzählen, sonst liefert der cache-first Service
  Worker die alte Version aus.
