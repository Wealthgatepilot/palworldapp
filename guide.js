/* ============================================================
   Guide-Inhalte.

   Selbst geschrieben, nicht von Fremdseiten kopiert. Alle Zahlen stammen
   aus den Spieldaten in paldex.js (BREEDING_MECHANICS, PASSIVES) und sind
   dort nachprüfbar — nichts hier ist aus dem Gedächtnis behauptet.

   Blocktypen: p (Absatz), ul (Liste), steps (nummeriert), note (Hinweis),
   formula (Codeblock), table, passives (rendert Rang aus PASSIVES).
   ============================================================ */

const GUIDE = [
  {
    id: 'grundlagen',
    icon: '🥚',
    title: 'Wie Zucht funktioniert',
    blocks: [
      { t: 'p', text: 'Du brauchst eine Zuchtfarm, ein Männchen und ein Weibchen ' +
        'darin und Kuchen im Futterkasten. Danach legen die beiden ein Ei, aus dem ' +
        'der Nachwuchs schlüpft.' },
      { t: 'p', text: 'Entscheidend ist: <b>welche Art herauskommt, hängt einzig von ' +
        'der Artenkombination ab.</b> Level, Werte, Passives und Geschlecht der Eltern ' +
        'ändern daran nichts. Ein Level-1-Lamball erzeugt dasselbe Kind wie ein ' +
        'Level-50-Lamball.' },
      { t: 'p', text: 'Dahinter steckt eine Rangliste. Jede Art hat eine „Breeding ' +
        'Power“; das Kind ist die Art, deren Wert dem Mittel der Eltern am nächsten liegt:' },
      { t: 'formula', text: 'Kind-Rang = abrunden( (Rang A + Rang B + 1) / 2 )' },
      { t: 'p', text: 'Deshalb kommt man von zwei Arten aus nur schrittweise in andere ' +
        'Bereiche der Rangliste — man kann nicht direkt von den Starter-Pals zum ' +
        'Endgame springen.' },
      { t: 'p', text: 'Von dieser Regel gibt es Ausnahmen: einige Paare haben eine fest ' +
        'hinterlegte Sonderkombination. Zwei davon hängen sogar am Geschlecht — bei ' +
        'Katress × Wixen entscheidet, welcher Elternteil männlich ist, ob Katress Ignis ' +
        'oder Wixen Noct schlüpft.' },
      { t: 'note', text: 'Die Zucht-Ansicht dieser App kennt alle 44.851 Kombinationen ' +
        'samt Sonderfällen. Du musst nichts davon selbst nachschlagen.' },
    ],
  },

  {
    id: 'passives',
    icon: '✨',
    title: 'Wie Passives vererbt werden',
    blocks: [
      { t: 'p', text: 'Beide Eltern werfen ihre Passives in einen gemeinsamen Topf ' +
        '(Doppelte zählen einmal). Daraus zieht das Spiel in zwei Schritten:' },
      { t: 'steps', items: [
        'Es entscheidet, <b>wie viele</b> Passives aus dem Eltern-Topf übernommen werden.',
        'Danach würfelt es aus, ob noch <b>zufällige</b> Passives dazukommen.',
      ]},
      { t: 'p', text: 'Die Wahrscheinlichkeiten stehen so in den Spieldaten:' },
      { t: 'table',
        head: ['Anzahl', 'aus den Eltern', 'zufällig dazu'],
        rows: [['0', '—', '40 %'], ['1', '40 %', '30 %'],
               ['2', '30 %', '20 %'], ['3', '20 %', '10 %'], ['4', '10 %', '—']] },
      { t: 'p', text: 'Mehr als vier Passives kann ein Pal nicht haben. Daraus folgt die ' +
        'wichtigste Regel überhaupt:' },
      { t: 'note', text: '⭐ Halte den Eltern-Topf klein. Haben beide Eltern zusammen ' +
        'genau die vier Passives, die du willst, kann nichts Falsches gezogen werden. ' +
        'Ein Elternteil mit drei überflüssigen Passives verwässert jeden Wurf.' },
      { t: 'p', text: 'Deshalb züchtet man Ziel-Passives <b>schrittweise</b>: erst zwei ' +
        'Pals mit je zwei gewünschten Passives, dann diese beiden kombinieren. Der Versuch, ' +
        'alle vier auf einmal zu treffen, ist um Größenordnungen unwahrscheinlicher.' },
      { t: 'p', text: 'Werte (IVs) werden nach demselben Muster vererbt: ' +
        '50 % ein Wert, 33 % zwei, 17 % drei.' },
      { t: 'note', kind: 'warn', text: 'Ehrlicherweise: diese Mechanik ist von der ' +
        'Community aus dem Spielcode zurückentwickelt worden, nicht offiziell dokumentiert. ' +
        'Die Größenordnung stimmt, auf die Nachkommastelle würde ich mich nicht verlassen.' },
    ],
  },

  {
    id: 'welche-passives',
    icon: '🏅',
    title: 'Welche Passives sich lohnen',
    blocks: [
      { t: 'p', text: 'Das Spiel selbst stuft jedes Passive in einen Rang ein. Höher ist ' +
        'besser, negative Ränge sind Nachteile. Direkt aus den Daten:' },
      { t: 'passives', rank: 5, label: 'Rang 5 — die stärksten' },
      { t: 'passives', rank: 4, label: 'Rang 4 — sehr stark' },
      { t: 'passives', rank: -3, label: 'Rang −3 — unbedingt loswerden' },
      { t: 'p', text: 'Für Kämpfer sind Angriffs- und Tempo-Boni das Naheliegende, für ' +
        'Basis-Pals die Arbeitstempo-Passives. Achte auf versteckte Nachteile: manche ' +
        'starken Angriffs-Passives kosten Arbeitstempo — bei einem reinen Kämpfer egal, ' +
        'bei einem Basis-Pal ruinös.' },
      { t: 'p', text: 'Alle 115 Passives mit Effekttext findest du über die Suche in ' +
        'der Pal-Datenbank, sofern ein Pal sie garantiert mitbringt.' },
    ],
  },

  {
    id: 'basis',
    icon: '🏕️',
    title: 'Basis und Arbeitseignung',
    blocks: [
      { t: 'p', text: 'Es gibt zwölf Arbeitsarten. Ein Pal arbeitet nur an dem, wofür er ' +
        'eine Eignung hat — fehlt in deiner Basis eine Art komplett, bleibt die Arbeit ' +
        'einfach liegen.' },
      { t: 'ul', items: [
        '🔥 Feuer machen — Schmelzen und Kochen; ohne das steht die Erzverarbeitung',
        '💧 Bewässern — Farmen und Kühlung',
        '🌱 Pflanzen — Saatgut ausbringen',
        '⚡ Strom erzeugen — Voraussetzung für fast alle größeren Maschinen',
        '🔨 Handwerk — der Flaschenhals bei fast jeder Produktion',
        '🧺 Sammeln — Ernte einbringen',
        '🪓 Holzfällen · ⛏️ Bergbau — die beiden Rohstoffquellen',
        '💊 Medizin — Heilmittel herstellen',
        '❄️ Kühlen — Kühlbox und einige Rezepte',
        '📦 Transport — bringt Fertiges ins Lager; wird chronisch unterschätzt',
        '🥚 Farm — produziert passiv Ressourcen im Gehege',
      ]},
      { t: 'note', text: 'Ein hohes Level in einer Arbeitsart schlägt mehrere Pals mit ' +
        'Level 1. Filtere in der Pal-Datenbank nach Arbeitsart mit Mindestlevel 3 oder 4 — ' +
        'das ist der schnellste Weg zu einer Basis, die nicht dauernd stockt.' },
      { t: 'p', text: 'Ein häufiger Fehler: zu viele Pals in eine Basis stecken. Sie ' +
        'blockieren sich gegenseitig an den Arbeitsplätzen. Wenige, spezialisierte Pals ' +
        'mit hohen Leveln laufen deutlich runder.' },
    ],
  },

  {
    id: 'vorgehen',
    icon: '🧭',
    title: 'Praktisches Vorgehen',
    blocks: [
      { t: 'steps', items: [
        'Trage unter <b>Meine Pals</b> ein, welche Arten du besitzt. Jede Art zählt nur ' +
          'einmal — es geht allein darum, ob du sie hast.',
        'Optional das Geschlecht setzen. Jede Zucht braucht ♂ und ♀; sind zwei Eltern ' +
          'nachweislich gleichgeschlechtlich, warnt die App im Zuchtplan.',
        'Wähle im <b>Zucht</b>-Tab dein Ziel. Du bekommst den kürzesten Plan aus deinem ' +
          'Bestand plus alle Elternpaare, die direkt zum Ziel führen.',
        'Ist der Plan lang, lohnt sich fast immer der Blick auf die direkten Elternpaare: ' +
          'einen davon zu fangen kürzt die ganze Kette ab.',
        'Erst wenn die Art stimmt, kümmere dich um Passives — sonst züchtest du gute ' +
          'Eigenschaften auf die falsche Art.',
      ]},
      { t: 'note', text: '📌 Was du später angehen willst, kannst du bei jedem Pal auf ' +
        'die <b>Merkliste</b> setzen. Dort steht laufend, wie viele Schritte du aktuell ' +
        'davon entfernt bist — und je mehr du einträgst, desto kürzer werden die Wege.' },
      { t: 'note', text: '🔀 Umgekehrt geht es auch: unter „Eltern kombinieren“ wählst du ' +
        'zwei beliebige Pals und siehst sofort, was dabei herauskommt.' },
      { t: 'note', text: 'Wo ein Pal wild vorkommt, zeigt die Habitat-Karte im ' +
        'Detailfenster der Pal-Datenbank, umschaltbar zwischen Tag und Nacht.' },
    ],
  },

  {
    id: 'grenzen',
    icon: '⚠️',
    title: 'Was dieses Tool nicht kann',
    blocks: [
      { t: 'ul', items: [
        'Der Pathfinder optimiert auf <b>wenige Generationen</b>, nicht auf ' +
          'Wahrscheinlichkeit. Ein kurzer Weg kann trotzdem viele Eier kosten.',
        'Passive-Vererbung wird <b>nicht</b> durchgerechnet — die Zuchtpläne betreffen ' +
          'nur die Art.',
        'Der Bestand wird von Hand gepflegt. PlayStation-Spielstände lassen sich nicht ' +
          'auslesen, daran führt kein Weg vorbei.',
        '172 der 299 Pals haben keine Habitat-Karte — dafür gab es nur eine ' +
          'Quelle von 2024, die die neueren Pals nicht kennt.',
        'Ein Pal fehlt ganz: <b>Astralym</b> steht auf palworld.gg, aber nicht in der ' +
          'Zuchtdatenbank von PalCalc — ohne die gibt es für ihn weder Zuchtpfade ' +
          'noch Werte.',
        'Die Tier List ist fremde Einschätzung und veraltet mit jedem Patch. Du kannst ' +
          'jede Einstufung selbst überschreiben.',
      ]},
    ],
  },
];
