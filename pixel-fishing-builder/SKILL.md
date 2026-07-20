---
name: pixel-fishing-builder
description: >-
  Complete spec, architecture, tuning constants, gotcha log, and full verified reference
  source for building and continuing "Pixel Fishing" — a 2D pixel-art fishing game in React +
  Vite. The game features a live animated scene (bobbing boat, angler, casting line, swimming
  fish, day/night cycle, weather), a Stardew-style vertical reel-gauge fight, 51 code-drawn
  pixel fish across freshwater / brackish / saltwater / deep-sea zones, a tackle shop with
  upgrades, catch streaks, shiny fish, achievements, a Fishdex bestiary, stats and settings
  panels, and a dependency-free Web Audio sound engine. Use this whenever the user wants to
  build, run, continue, extend, rebalance, or debug this pixel fishing game — adding fish,
  zones, mechanics, UI, sprites, sound, or fixing the reel/cast loop. Consult this BEFORE
  answering from memory: it records design decisions, exact tuning values, and fixed bugs
  that must not be reintroduced.
---

# Pixel Fishing — Builder Skill

A single-page React + Vite pixel-art fishing game. Everything is code-drawn on an HTML canvas
— no image assets, no external art, no paid APIs. The complete, working source is bundled in
`reference/`. To build the game, copy `reference/` into a new folder and run it (below). To
extend it, follow the architecture and DO NOT reintroduce the fixed bugs listed at the end.

## Quick start (build & run)

```bash
# 1. copy the reference project into a working folder
cp -r reference my-fishing-game && cd my-fishing-game

# 2. install and run (needs Node 18+; a real npm registry connection)
npm install
npm run dev        # opens http://localhost:5173
npm run build      # production build into dist/
```

If you are scaffolding from scratch instead of copying, the stack is:
`react` + `react-dom` (^18.3) and dev deps `vite` (^5) + `@vitejs/plugin-react` (^4).
`package.json`, `vite.config.js`, and `index.html` in `reference/` are the canonical versions.

## Project layout

```
index.html                 mount point (#root) + module script
vite.config.js             react plugin
package.json               react 18 + vite 5
src/
  main.jsx                 ReactDOM root, imports App + index.css
  App.jsx                  top-level game shell: state, save, HUD, all panels, popups
  index.css                all styling (pixel look, panels, buttons, animations)
  game.js                  pure helpers: rollFish, rollSize, catchValue, reelWindow, landChance
  data/
    fish.js                FISH[] (51 species) + fishByZone()
    zones.js               ZONES[] (4) + RARITY table
    shop.js                SHOP[] tackle upgrades + nextCost()
    achievements.js        ACHIEVEMENTS[] with test(x) predicates
    blurbs.js              bestiary blurb() — specific + generated
  pixel/
    sprites.js             TEMPLATES (char-grid fish shapes), charColor, drawFish, gridDims
    PixelFish.jsx          static <canvas> fish for popups/Fishdex (routes through drawFish)
  scene/
    Scene.jsx              the live animated game world + cast/reel loop (the heart of the game)
  audio/
    sfx.js                 dependency-free Web Audio sound engine
```

## Core data schemas

**Fish** (`src/data/fish.js`) — add entries and they auto-appear in their zone:
```js
{ id, name, habitat: 'fresh'|'brackish'|'salt'|'deepsea', rarity, template,
  palette: { body, fin, tail, dark, lure? }, minSize, maxSize, baseValue,
  fight /*1-10*/, biteMin, biteMax /*ms*/ }
```

**Zones** (`src/data/zones.js`): `{ id, name, short, bg, unlockCost }`. Deep-sea (`deepsea`)
is forced to permanent night. `RARITY` maps `common|uncommon|rare|epic|legendary` to
`{ weight, color, mult }` — weight drives spawn odds, mult scales coin value.

**Shop** (`src/data/shop.js`): three upgrades `rod` / `line` / `bait`, each 0..`MAX_LEVEL` (3),
`costs[level]` = price to reach the next level.

**Achievements** (`src/data/achievements.js`): `{ id, name, icon, desc, test(x) }` where `x`
is a derived stats object built in App (`total, species, totalSpecies, biggest, zonesFished,
legendary, maxStreak, shinies`).

## Sprite system (`src/pixel/sprites.js`)

Fish are ragged char grids (head-left), rendered pixel-by-pixel. Legend:
`B`=body `F`=fin `t`=tail `m`=mouth/dark `e`=eye `w`=white `L`/`l`=lure, `.`/space=transparent.
Templates: `standard`, `long`, `round`, `flat`, `angler`. `drawFish(ctx, fish, cx, cy, scale,
flip, flap)` centers the fish, applies **belly shading** (darkens `B` pixels in the lower ~38%)
and a **tail flap** (vertical shear of the rear ~38% of columns by `flap` ∈ −1..1). New shapes:
add a template array and reference it from a fish's `template`. The renderer pads ragged rows,
so exact row lengths need not match.

## The scene & fight loop (`src/scene/Scene.jsx`) — the important part

One `<canvas>` (internal 640×560, CSS-scaled), driven by `requestAnimationFrame`. Waterline at
`y=200`. It owns all game state in a plain object `g` inside the effect; React state is only
used to surface `uiPhase` for the on-screen buttons. Props: `zone`, `onResult(fish,size,landed)`,
`upgrades`, `difficulty`. Latest prop values are mirrored into refs so the rAF loop reads them
live without restarting.

**Phase machine** (`g.phase`): `idle → dropping → waiting → bite → fight → retract → idle`.
- **idle**: line hangs from the rod. Tap water (or CAST button) → `doCast(px,py)`; deeper tap = lower `targetY`.
- **dropping**: hook sinks to `targetY`, then `waiting`.
- **waiting**: nearest swimmer is lured toward the hook (steer speed grows with `bait` upgrade + weather); on contact → `bite`.
- **bite**: bobber plunges, ripple rings, popping "!" bubble (`drawBite`), ~0.6s.
- **fight**: the reel gauge (below). Meter fills to 100 → land; drains to 0 → escape.
- **retract**: hook returns to boat.

**Reel gauge (my own take, not a Stardew copy):** a vertical track on the right. A green
"catch zone" falls under gravity (`GRAV`); holding REEL lifts it (`g.lift`). A fish marker
darts to random `markerTarget`s. When the zone overlaps the marker the catch meter fills
(`g.fill`), else it drains (`g.drain`). Base tuning constants live at the top of the effect:
`GRAV 0.26, LIFT 0.60, FILL 0.95, DRAIN 0.30, MARKER_SPEED 0.75, START_PROGRESS 40`, track
geometry `TRACK_TOP/BOT`. At fight start these are modified by upgrades (rod→lift/fill,
line→zone height + head start) and by **difficulty** via the module `DIFF` table
(`easy|normal|hard` scaling start/bar/fill/drain/marker). Zone height also shrinks with the
fish's `fight` stat.

**Weather + day/night**: `daylight()` returns 0..1 on a ~94s sine (deep-sea pinned to 0.12).
Sky/sun/moon/stars crossfade by that value. `weather` cycles `clear|cloudy|rain|storm` every
~25-48s; rain/storm draw precipitation and speed up bites, storms add lightning + rare-luck.

## App shell (`src/App.jsx`)

Holds the whole save in one object persisted to `localStorage` under `pixel-fishing-save-v4`
(bump the key + merge in `loadSave` when adding fields):
```
{ coins, unlocked[], dex{ id:{count,record,shiny} }, upgrades{rod,line,bait},
  stats{maxStreak,shinies,coinsEarned}, achievements[], tutorialSeen, difficulty, volume }
```
Responsibilities: HUD (coins, streak 🔥, shop/dex/achievements/stats/settings/mute buttons,
floating +coins), zone tabs with completion progress bars, the `<Scene>`, the corner catch
**popup** (NEW/RECORD/SHINY badges, rarity glow), and overlay panels: Tackle Shop, Fishdex
(rarity-bordered, click a caught fish → bestiary **detail card** with `blurb`), Achievements,
Stats dashboard, Settings (volume slider, difficulty segmented control, reset save), and a
one-time tutorial. `handleResult` applies streak multiplier (+10%/catch, cap +90%), shiny roll
(`SHINY_CHANCE 0.025`, ×5 coins, gold palette), updates dex + stats, and spawns the coin float.

## Sound (`src/audio/sfx.js`)

Pure Web Audio, no dependencies. `resume()` on first gesture, `setMuted`, `setVolume` (master
`master`, kept separate from per-sound `vol` params — do NOT let them shadow each other),
`play(name)` for `cast|bite|reel|catch|escape|buy`. Splash = filtered noise burst; others =
oscillator envelopes.

## Extending — good next steps

More fish toward 120+ (data-only), animated multi-frame sprites, trash/treasure catches,
a tackle/inventory sell screen, bounties/daily quests, new zones (river, ice, reef, wreck),
ambient audio per zone, trophy wall, photo/catch-card export, controller support. When adding
fish just append to `FISH`; when adding save fields, bump `SAVE_KEY` and extend `loadSave`'s merge.

## Gotcha log — do NOT reintroduce these

1. **Fight dead-state**: the original fight only ended on a tension bar hitting 100; draining
   progress to 0 did nothing, so an un-reeled fish sat forever. The reel gauge fixes this —
   `progress<=0` MUST escape.
2. **TDZ ordering**: the `g` state object is declared before the tuning consts (`LIFT`, `FILL`).
   Initialize `g.lift/g.fill` with literals, then set real values at fight start.
3. **Audio volume shadowing**: `beep(freq,dur,type,vol,...)` has a `vol` param; the module
   master was renamed to `master` so `setVolume` isn't masked. Keep them distinct.
4. **Panel insertion nesting**: overlay panels must live INSIDE the `.scene-holder` div (which
   is `position:relative`) or absolute overlays anchor wrong. Watch the closing `</div>`.
5. **Canvas pointer mapping**: convert client coords to internal 640×560 space with
   `getBoundingClientRect` scaling — never assume 1:1.
6. **Offline builds**: `npm install` needs a real registry; a sandbox with a blocked registry
   cannot build. Verify logic with `node --check` on plain `.js`, bracket/JSX-tag balance
   checks, and headless runtime probes of the data + `drawFish` with a mock ctx.
7. **Save migration**: always spread `DEFAULT` then the parsed save, and deep-merge nested
   objects (`upgrades`, `stats`) so old saves don't crash on missing keys.

The bundled `reference/` source is the source of truth — read it before rewriting anything.
