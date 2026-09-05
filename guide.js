/* ============================================================
   Guide content.

   Written for this app, not copied from other sites.

   Two kinds of content live here, and they are marked differently:
   - Numbers taken from the game data in paldex.js (BREEDING_MECHANICS,
     PASSIVES, WORK_META). These are verifiable — open paldex.js and look.
   - A few things the dataset does not contain, above all the element chart.
     Those carry a visible note saying so.

   Block types: p, ul, steps, note, formula, table,
                passives (renders a rank straight from PASSIVES),
                works (renders the work types with their real game icons).
   ============================================================ */

const GUIDE = [
  {
    id: 'breeding',
    icon: '🥚',
    title: 'How breeding works',
    blocks: [
      { t: 'p', text: 'You need a Breeding Farm, one male and one female inside it, ' +
        'and Cake in the feed box. The pair then produces an egg.' },
      { t: 'p', text: 'The key point: <b>which species hatches depends only on the ' +
        'combination of the two species.</b> Level, stats, passives and gender of the ' +
        'parents change nothing. A level 1 Lamball produces exactly the same child as a ' +
        'level 50 one.' },
      { t: 'p', text: 'Behind it sits a ranking. Every species has a "breeding power", ' +
        'and the child is the species whose value sits closest to the average of the parents:' },
      { t: 'formula', text: 'child rank = floor( (rank A + rank B + 1) / 2 )' },
      { t: 'p', text: 'That is why you can only move through the ranking step by step. ' +
        'There is no jump from the starter pals straight to the endgame.' },
      { t: 'p', text: 'A handful of pairs override this with a fixed special combination. ' +
        'One of them even depends on gender: with Katress × Wixen, whichever parent is ' +
        'male decides whether Katress Ignis or Wixen Noct hatches. It is the only pairing ' +
        'in the game with two possible outcomes.' },
      { t: 'note', text: 'The Breeding tab knows all 44,851 combinations including the ' +
        'special cases. You never have to look any of it up.' },
    ],
  },

  {
    id: 'passives',
    icon: '✨',
    title: 'How passives are inherited',
    blocks: [
      { t: 'p', text: 'Both parents throw their passives into one shared pool ' +
        '(duplicates count once). The game then draws from it in two stages:' },
      { t: 'steps', items: [
        'It decides <b>how many</b> passives are taken from the parent pool.',
        'Then it rolls whether any <b>random</b> passives are added on top.',
      ]},
      { t: 'p', text: 'These are the probabilities as they sit in the game data:' },
      { t: 'table',
        head: ['Count', 'from parents', 'added at random'],
        rows: [['0', '—', '40 %'], ['1', '40 %', '30 %'],
               ['2', '30 %', '20 %'], ['3', '20 %', '10 %'], ['4', '10 %', '—']] },
      { t: 'p', text: 'A pal can never hold more than four passives. From that follows ' +
        'the single most important rule:' },
      { t: 'note', text: '⭐ Keep the parent pool small. If the two parents together hold ' +
        'exactly the four passives you want, nothing wrong can be drawn. A parent carrying ' +
        'three junk passives dilutes every single roll.' },
      { t: 'p', text: 'So you breed target passives <b>in stages</b>: first two pals with ' +
        'two desired passives each, then combine those two. Trying to hit all four at once ' +
        'is orders of magnitude less likely.' },
      { t: 'p', text: 'IVs follow the same pattern: 50 % one value, 33 % two, 17 % three.' },
      { t: 'note', kind: 'warn', text: 'Being honest about this: these mechanics were ' +
        'reverse-engineered from the game code by the community, not officially documented. ' +
        'The order of magnitude holds; I would not bet on the decimal place.' },
    ],
  },

  {
    id: 'best-passives',
    icon: '🏅',
    title: 'Which passives are worth chasing',
    blocks: [
      { t: 'p', text: 'The game itself sorts every passive into a rank. Higher is better, ' +
        'negative ranks are drawbacks. Straight from the data:' },
      { t: 'passives', rank: 5, label: 'Rank 5 — the strongest' },
      { t: 'passives', rank: 4, label: 'Rank 4 — very strong' },
      { t: 'passives', rank: -3, label: 'Rank −3 — get rid of these' },
      { t: 'p', text: 'For fighters, attack and speed bonuses are the obvious picks; for ' +
        'base pals, the work speed ones. Watch for hidden drawbacks: some of the strongest ' +
        'attack passives cost work speed. Irrelevant on a pure fighter, ruinous on a worker.' },
    ],
  },

  {
    id: 'elements',
    icon: '⚔️',
    title: 'Elements and combat',
    blocks: [
      { t: 'note', kind: 'warn', text: 'Unlike everything else in this guide, the element ' +
        'chart is <b>not</b> in the dataset this app is built from — it comes from community ' +
        'references. I cross-checked it for internal consistency (every "strong against" has ' +
        'a matching "weak to"), but treat it as well-established community knowledge rather ' +
        'than verified game data.' },
      { t: 'p', text: 'There are nine elements. Each one beats exactly one other, with two ' +
        'exceptions: <b>Fire</b> beats two, and <b>Neutral</b> beats none.' },
      { t: 'table',
        head: ['Element', 'strong against', 'weak to'],
        rows: [
          ['Neutral',  '—',            'Dark'],
          ['Fire',     'Grass, Ice',   'Water'],
          ['Water',    'Fire',         'Electric'],
          ['Electric', 'Water',        'Ground'],
          ['Ground',   'Electric',     'Grass'],
          ['Grass',    'Ground',       'Fire'],
          ['Ice',      'Dragon',       'Fire'],
          ['Dragon',   'Dark',         'Ice'],
          ['Dark',     'Neutral',      'Dragon'],
        ]},
      { t: 'p', text: 'Sources disagree on the exact multiplier, so I will not quote a ' +
        'number — the direction is what matters. Hitting a weakness ends fights noticeably ' +
        'faster; hitting a resistance drags them out.' },
      { t: 'note', text: 'A practical team covers the common threats: an Ice pal for Dragons, ' +
        'a Water pal for Fire, a Dragon pal for Dark, and one hard-hitting generalist. Use the ' +
        'element filter in the Pals tab to see what you have for each slot.' },
      { t: 'p', text: 'Elements matter for work too, not just fighting: a Fire pal is what ' +
        'lets you smelt ore, a Water pal keeps the farm running. A pal that is mediocre in a ' +
        'fight can still be the one your base cannot do without.' },
    ],
  },

  {
    id: 'base',
    icon: '🏕️',
    title: 'Base and work suitability',
    blocks: [
      { t: 'p', text: 'There are twelve kinds of work. A pal only ever does what it has a ' +
        'suitability for — if a kind is missing from your base entirely, that work simply ' +
        'never gets done. These are the real in-game icons:' },
      { t: 'works' },
      { t: 'p', text: 'Suitability runs from level 1 to <b>8</b>, and the top is rare: only ' +
        'ten pals in the game reach level 8 at anything, and about forty reach level 6. One ' +
        'high level beats several pals at level 1 — a single good worker frees up base slots ' +
        'that three mediocre ones would occupy.' },
      { t: 'note', text: 'Use the work filter in the Pals tab with a minimum level of 4 or ' +
        'higher to find them. That is the fastest route to a base that does not constantly ' +
        'stall.' },
      { t: 'p', text: 'The most common mistake is cramming too many pals into one base. They ' +
        'block each other at the workstations. A few specialists with high levels run far ' +
        'more smoothly than a crowd.' },
      { t: 'p', text: 'Two work types are chronically underrated. <b>Transporting</b> moves ' +
        'finished goods into storage — without it, production backs up at the workbench. And ' +
        '<b>Generating Electricity</b> gates almost every larger machine.' },
      { t: 'p', text: 'Once you can run more than one base, specialise them: one for ore and ' +
        'smelting near a cluster of nodes, one for food and crafting near water. A base built ' +
        'to do everything does all of it slowly.' },
    ],
  },

  {
    id: 'catching',
    icon: '🎯',
    title: 'Catching pals',
    blocks: [
      { t: 'p', text: 'Catching is not just how you get pals — it is one of the strongest ' +
        'sources of experience in the early game. Repeatedly catching the <b>same species</b> ' +
        'gives stacking bonuses, so it pays to keep throwing spheres at common pals rather ' +
        'than walking past them.' },
      { t: 'note', kind: 'warn', text: 'How many catches the bonus needs changed between game ' +
        'versions and sources contradict each other, so I am not quoting a number. The game ' +
        'shows your progress per species in the Paldeck — trust that over any guide.' },
      { t: 'ul', items: [
        'Weaken a pal before throwing. Lower health means a much better catch rate.',
        'Throw from behind for a bonus — a backstab throw is worth lining up.',
        'Some pals only appear at night. The Pals tab has a <b>Nocturnal only</b> filter, and ' +
          'each habitat map has a day/night switch.',
        'Every pal entry lists its <b>wild level</b> range. If a pal spawns at level 30 and ' +
          'you are level 12, come back later rather than wasting spheres.',
        'Rarity is a rough guide to how stubborn a catch will be — it is in every pal entry.',
      ]},
      { t: 'note', text: 'Alpha pals and tower bosses do not spawn like normal wild pals, ' +
        'which is why many of them have no habitat map in this app.' },
    ],
  },

  {
    id: 'partner-skills',
    icon: '🤝',
    title: 'Partner skills are half the game',
    blocks: [
      { t: 'p', text: 'Nearly every pal has a partner skill that only works while it is in ' +
        'your party, and these are easy to overlook. They cover things no amount of combat ' +
        'strength replaces: mounts that fly or swim, weight reduction for ore and stone, ' +
        'pals that fight alongside you, pals that turn into gliders or shields.' },
      { t: 'p', text: 'The partner skill of every pal is listed in its detail window. It is ' +
        'worth reading them before deciding who takes a party slot — a pal that is weak in a ' +
        'fight can still be the most useful thing you carry.' },
      { t: 'note', text: 'Weight-reduction partner skills change how mining trips feel more ' +
        'than almost any equipment upgrade. Check the Tier List tab under <b>Flying mounts</b> ' +
        'and <b>Ground mounts</b> for the travel picks.' },
    ],
  },

  {
    id: 'workflow',
    icon: '🧭',
    title: 'Getting the most out of this app',
    blocks: [
      { t: 'steps', items: [
        'Add the species you own under <b>My Pals</b>. Each species counts once — it only ' +
          'matters whether you have it.',
        'Optionally set the gender. Every breeding needs ♂ and ♀; if two parents are both ' +
          'known to be the same gender, the plan warns you.',
        'Pick your target in the <b>Breeding</b> tab. You get the shortest route from your ' +
          'collection plus every parent pair that leads straight to it.',
        'If the route is long, look at the direct parent pairs — catching one of them ' +
          'usually cuts the whole chain short.',
        'Only once the species is right, start worrying about passives. Otherwise you breed ' +
          'good traits onto the wrong pal.',
      ]},
      { t: 'note', text: '📌 Anything you want to tackle later goes on the <b>Watchlist</b>. ' +
        'It keeps showing how many steps away each target currently is — and the more you add ' +
        'to your collection, the shorter those routes get.' },
      { t: 'note', text: '🔀 It works backwards too: under <b>Combine parents</b> you pick any ' +
        'two pals and immediately see what they produce.' },
      { t: 'note', text: 'Pal names are tappable everywhere in this app — in breeding plans, ' +
        'parent pairs, the tier list. Tapping one opens its full details and breeding routes.' },
    ],
  },

  {
    id: 'limits',
    icon: '⚠️',
    title: 'What this tool cannot do',
    blocks: [
      { t: 'ul', items: [
        'The pathfinder optimises for <b>few generations</b>, not for probability. A short ' +
          'route can still cost a lot of eggs.',
        'Passive inheritance is <b>not</b> calculated — breeding plans are about species only.',
        'Your collection is kept by hand. PlayStation saves cannot be read, and there is no ' +
          'way around that.',
        '172 of the 299 pals have no habitat map — the only source for those images dates ' +
          'from 2024 and does not know the newer pals.',
        'One pal is missing entirely: <b>Astralym</b> is on palworld.gg but not in PalCalc, ' +
          'the breeding database this app is built on. Without it there are no routes or stats.',
        'The tier list is somebody else\'s opinion and ages with every patch. You can override ' +
          'any rating yourself.',
      ]},
    ],
  },
];
