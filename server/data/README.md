# Seed data

Seed data categories live here as JSON, loaded by `scripts/seed.py` via
`load_category("<name>")`. To add a future category (bosses, weapons, pictos),
drop `<name>.json` in this directory and call `load_category("<name>")` from
the seed script.

## characters.json field reference

Fields appear in schema order and map 1:1 to `app/models.py:Entity`:

| Field | Type | Maps to |
|---|---|---|
| `name` | string | `entities.name` (unique) |
| `gender` | string | `entities.gender` — `male` \| `female` \| `other` |
| `age` | int or null | `entities.age` (nullable) |
| `class_role` | string | `entities.class_role` |
| `weapon` | string | `entities.weapon` (NOT NULL) |
| `element` | array of strings | `entities.element` (Postgres `ARRAY(String)`) |
| `act_introduced` | int | `entities.act_introduced` — 1 \| 2 \| 3 |
| `species` | string (closed set) | `entities.species` |
| `affiliation` | string (closed set) | `entities.affiliation` |
| `puzzleable` | bool, optional | **JSON-only — not a DB column** (see below) |

**Closed value sets** (keep every value at ≥2 members so a lone value can't
give an answer away):

- `species`: Human, Painted Human, Gestral, Axon, Nevron, Mythical Creature
- `affiliation`: Expedition 33, Lumière, Expedition Zero, Dessendre Family,
  Painted Dessendre Family, Gestrals, Independent

Affiliation reflects who an entity aligns with *in practice*, not who created
it (e.g. Glissando/Tisseur/Sprong are Dessendre creations but run wild →
Independent; the four Axons actively serve Renoir's design → Dessendre Family).

## The `puzzleable` flag

Eight Expedition 33 members (Lucien, Jérôme, Léo, Michel, Raphaël, Seba, Tom,
Tristan) share identical attribute vectors — as daily answers they'd reduce a
puzzle to a name lottery the feedback can't resolve. They carry
`"puzzleable": false`: they're still upserted to the entities table and appear
in autocomplete (completionism preserved), but `seed.py` excludes them from
the answer shuffle pool. Absence of the key means `true`. The flag never
reaches the database; the seed script strips it before the UPSERT.

## Sparse-data conventions

- `age: null` — no source states a numeric age (Painted Humans, Gestrals,
  mythical creatures).
- `weapon: "None"` — non-combatant or no carried weapon. The DB column is
  NOT NULL, so this is the literal string, not a null.
- `element: []` — no elemental affinity.
- `gender: "other"` — undocumented in any source (Goblu).

## act_introduced convention

Hybrid rule: party members get the act they become **playable** (Verso 2,
Monoco 2, despite Verso appearing in Act I's finale); NPCs and bosses get the
act of **first appearance**. The Prologue counts as Act 1. Alicia's Act I
vision appearances don't count; her in-person debut (Old Lumière, Act II) does.

## Sourcing & verification (2026-06-11)

- **Fandom wiki** (`clair-obscur.fandom.com`) — character infoboxes, location
  pages, and act walkthroughs, fetched as raw wikitext via the MediaWiki API
  (`/api.php?action=query&prop=revisions&rvprop=content&rvslots=main`). The
  page HTML is Cloudflare-blocked to scripts; the API is not.
- **Fextralife** (`expedition33.wiki.fextralife.com/Characters`) — official
  Weapon Type per playable character (e.g. Gustave "Sword & Pistol", Lune
  "Elemental Magic", Monoco "Staff").
- **Element affinities** — tallied damage-type mentions across every skill
  page in each character's Fandom skill category (e.g. Sciel: 13× Dark;
  Verso: 7× Light; Monoco spans all six).
- **Age math** — the story takes place in Monolith Year 33 and the Monolith
  counts down, so age = birth MY − 33 (Gustave born MY 65 → 32).

## Per-character source notes

- **Gustave** — born MY 65 → 32; engineer of Lumière (Fandom).
- **Maelle** — born MY 49 → 16 (Fandom).
- **Lune** — born MY 65 → 32; "32-year-old" in the wiki Appearance section;
  stains = fire/ice/lightning/earth/light per the Fandom Skills page.
- **Sciel** — born MY 65 → 32; wiki occupations Teacher and Farmer (formerly);
  "Fortune Teller" reflects her Foretell/Tarot combat kit.
- **Verso** — Painted Human, no stated age (the real Verso Dessendre was born
  1879, died 1905); playable from Act II.
- **Monoco** — Gestral, born "prior to MY 100" → age unknown; joins in Act II
  at Monoco's Station.
- **Esquie** — gender Male per Fandom infobox; joins late Act I at Esquie's
  Nest.
- **Sophie** — born MY 66 → 33; gommaged in the Prologue.
- **Emma** — chief councilor of Lumière and Gustave's sister (Fandom).
- **Renoir** — the Painted Renoir ("White-haired man"); occupation Commander
  per Fandom; wields "a sophisticated walking stick that serves as a weapon".
- **The Paintress** — visible from the Prologue; in her boss fight she
  "summons a large brush to fight with" and deals Void damage (Fandom Tactics).
- **Clea** — Painted Clea, "The Regent"; Act III superboss in the Flying
  Manor.
- **Alicia** — Painted Alicia, the "Masked Woman"; occupation Paintress per
  Fandom infobox.
- **Simon** — Expedition Zero, "The Sword of Lumière"; Act III superboss in
  Renoir's Drafts.
- **Sirène** — Axon, "She Who Plays with Wonder"; fought in Act II.
- **Visages** — Axon, "He Who Guards Truth With Lies"; fought in Act II;
  gender from the epithet.
- **Goblu** — final boss of Flying Waters (Act I region); the wiki states no
  gender or species.
- **Golgra** — Gestral chief of Gestral Village (Act I region); gender Female
  per Fandom.
- **Noco** — Gestral merchant at Noco's Hut in Flying Waters (Act I).
- **François** — "Esquie's rather grumpy neighbor" at Esquie's Nest (Act I).

User-confirmed corrections from Phase 2 review: Lune weapon "Elemental Magic";
Simon element Void; Clea weapon "None" + element Void (Paintress powers);
Alicia act 2; Goblu and Golgra weapon "None" (mixed elemental + physical
attacks, no carried weapon). Phase 7 corrections: Renoir class Painter +
element Void; Alicia weapon Rapier + element Void; Goblu class "Boss".

## Phase 7 expansion notes (entities 21–54, sourced 2026-06-12 via Fandom API)

- **Aline Dessendre** — real-world Paintress (aliases Curatress/The Paintress);
  act 3 = her identity reveal; the in-canvas avatar is the separate
  "The Paintress" entry. Fights with a summoned brush, Void attacks.
- **Renoir Dessendre** — = The Curator; joins camp after Goblu (act 1);
  cane + Void mirrored from his fights.
- **Verso Dessendre** — the real Verso ("Young Boy" at the swing, act 1);
  b. 22 Feb 1879, d. 1905 → age 26. Painted the Canvas.
- **Mask Keeper / Reacher** — the remaining two Axons ("He Who Guards Truth
  With Lies", act 2; "She Who Grasps the Sky", act 3, represents Alicia).
- **Julie** — Expedition Zero, killed by Verso (MY 100); flashbacks only, act 2.
- **Sastro** (camp gestral, Lost Gestrals quest), **Eesda** (Gestral Village
  merchant, gender unstated → other).
- **Bastien** (commander-designate of Expedition 32), **Trash-can Man**
  (born MY 66 → 33, gommaged in prologue), **Lucie** (born MY 65 → 32;
  trained for E33 but stayed → affiliation Lumière), **Alan** (born MY 65 →
  32; E33 commander, killed at the landing), **Catherine**, **Margot** and the
  eight `puzzleable: false` members above — E33 roster from the wiki.
- **Bosses** — Évêque (first boss, Spring Meadows), Ultimate Sakapatate
  (Gestral war machine, Ancient Sanctuary), Lampmaster (sword + Light/Dark
  attacks, Stone Wave Cliffs), Dualliste (dual blades, Forgotten Battlefield),
  Glissando + Tisseur (Sirène's puppets), Scavenger (Falling Leaves),
  Grosse Tête (Coastal Cave), Sprong (Clea's early creation, water),
  Gargant + Danseuse Teacher (Frozen Hearts), Serpenphare (act 3, White
  Sands). Element [] unless attacks are documented (wiki lists weaknesses,
  not affinities — never infer affinity from weakness).

## Editing & re-seeding

Entity attribute edits here propagate on the next `npm run seed` (UPSERT by
`name`). Puzzle assignments are frozen once seeded (`ON CONFLICT DO NOTHING`)
— hot-fix a published puzzle via psql, never by re-seeding. Renaming an entity
creates a new row rather than updating the old one, so treat `name` as the
identity key.
