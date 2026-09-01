# palworldapp

Persönliches Palworld-Begleittool: Zucht-Pathfinder, Pal-Datenbank, Tier List und Guide.
Mobile-first PWA, reines HTML/CSS/JS, **kein Build-Schritt**, läuft über GitHub Pages.

Gespielt wird auf PlayStation — es gibt daher **keine Savefile-Anbindung**. Der eigene
Pal-Bestand wird von Hand gepflegt und liegt im `localStorage` (Import/Export als JSON).

## Bereiche

| Bereich | Stand | Inhalt |
| --- | --- | --- |
| **Pal-Datenbank** | ✅ | Suche über Name/Titel/Drops, Filter nach Element, Arbeitstyp mit Mindestlevel, nachtaktiv und Varianten. Detailansicht mit Werten, Arbeitseignung, Drops, Partner-Skill und Habitat-Karte (Tag/Nacht). |
| **Zucht / Pathfinder** | ✅ | Ziel-Pal wählen → kürzester Zuchtplan aus dem eigenen Bestand, plus alle direkten Elternpaare. |
| **Meine Pals** | ✅ | Manuell gepflegter Bestand mit Geschlecht, im `localStorage`, Import/Export als JSON. |
| **Tier List** | ✅ | Fünf Ranglisten von palworld.gg (Gesamt, Arbeit, Kampf, Flug-/Bodenreittiere), S–D, mit Namen an jedem Pal. Jede Einstufung selbst überschreibbar, Overrides im `localStorage`. |
| **Guide** | ✅ | Zuchtgrundlagen, Passive-Vererbung mit den echten Wahrscheinlichkeiten aus den Spieldaten, Arbeitseignung, Vorgehen — und was das Tool *nicht* kann. |
| **Karte** | ✅ | Link auf palworld.gg (keine eigenen Kacheln/Marker). „Wo finde ich Pal X" löst stattdessen die Habitat-Karte im Detail-Modal. |

### Wie der Pathfinder rechnet

Ein Pal entsteht aus **zwei** Eltern, die beide erst gezüchtet sein wollen — das
ist kein normaler Graph, sondern eine Hyperkante. Gemessen wird in Generationen:

```
Kosten(Kind) = max(Kosten(ElternA), Kosten(ElternB)) + 1
```

Das `max` ist entscheidend. Mit einer Summe würde jeder gemeinsam genutzte
Zwischenschritt doppelt gezählt, und die Wege explodierten (Anubis kam so auf
2970 statt 21 Schritte), obwohl man einen einmal gezüchteten Pal ja weiter
benutzt. Weil die Kosten nie sinken, löst ein Dijkstra das Problem.

Ausgegeben wird kein Baum, sondern eine **deduplizierte, topologisch sortierte
Schrittliste** — derselbe Zwischen-Pal taucht in einem Baum vielfach auf,
gezüchtet wird er aber nur einmal.

## Daten

`paldex.js` wird von `tools/generate-paldex.ps1` erzeugt und ist im Repo eingecheckt.
Quellen (beide MIT-lizenziert):

- [`mlg404/palworld-paldex-api`](https://github.com/mlg404/palworld-paldex-api) — Pals
  (Stats, Typen, Drops, Skills, Work Suitability) und `breeding.json` (Kind → Elternpaare)
- [`tylercamp/palcalc`](https://github.com/tylercamp/palcalc) — Passive Skills,
  `BreedingMechanics`, Vererbungswahrscheinlichkeiten

Zuchtformel: `Kind-Rank = floor((RankA + RankB + 1) / 2)`, dann die Spezies mit dem
nächstliegenden Rank — plus Override-Tabelle für die Unique-Combos. PalCalc liefert
die Tabelle fertig ausgerechnet, sie muss nicht nachgebaut werden.

**Verknüpft wird über den internen Namen** (`InternalName`), nicht über Anzeigenamen
oder Slugs. Die weichen zwischen den Quellen ab: palworld.gg nennt PalCalcs
„Snock Terra" an einer Stelle „Snock Lux" und an anderer wieder „snock-terra".
Über den Namen zu verknüpfen hat den Pal aus Typdaten *und* Tier List geworfen.

Bekannte Lücke: **Astralym** (`WorldTreeDragon`) steht auf palworld.gg, fehlt aber in
PalCalc v27 — ohne Zuchtdaten taucht er in der App nicht auf.

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
