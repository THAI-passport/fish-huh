// Headless verification probe. Not part of the app build.
// Run: node --import ./probe-loader.mjs probe.mjs
import fs from 'node:fs'
import { ZONES, RARITY } from './src/data/zones.js'
import { FISH, fishByZone } from './src/data/fish.js'
import { TEMPLATES, drawFish, gridDims } from './src/pixel/sprites.js'
import { TRASH, TREASURE, rollTrash, rollTreasure, rollTreasureValue } from './src/data/items.js'
import { dailyQuests, todayKey } from './src/data/quests.js'
import { ACHIEVEMENTS } from './src/data/achievements.js'
import { blurb } from './src/data/blurbs.js'
import { rollFish, rollSize, catchValue } from './src/game.js'

let fails = 0
const ok = (cond, msg) => { if (!cond) { fails++; console.error('FAIL:', msg) } }

// zones
ok(ZONES.length === 8, 'expected 8 zones, got ' + ZONES.length)
const zoneIds = ZONES.map((z) => z.id)
ok(new Set(zoneIds).size === 8, 'zone ids unique')
for (const z of ZONES) ok(['surface', 'abyss'].includes(z.view), `zone ${z.id} view`)

// fish schema
const ids = new Set()
for (const f of FISH) {
  ok(!ids.has(f.id), `dup fish id ${f.id}`); ids.add(f.id)
  ok(zoneIds.includes(f.habitat), `${f.id} bad habitat ${f.habitat}`)
  ok(RARITY[f.rarity], `${f.id} bad rarity`)
  ok(TEMPLATES[f.template], `${f.id} bad template ${f.template}`)
  ok(f.minSize > 0 && f.maxSize > f.minSize, `${f.id} sizes`)
  ok(f.baseValue > 0 && f.fight >= 1 && f.fight <= 10, `${f.id} value/fight`)
  ok(f.biteMin > 0 && f.biteMax > f.biteMin, `${f.id} bite times`)
  ok(/^#[0-9a-f]{6}$/i.test(f.palette.body), `${f.id} body color`)
  ok(typeof blurb(f) === 'string' && blurb(f).length > 10, `${f.id} blurb`)
}
console.log('species total:', FISH.length)
for (const z of ZONES) {
  const n = fishByZone(z.id).length
  console.log(`  ${z.id}: ${n}`)
  ok(n >= 5, `zone ${z.id} has too few fish (${n})`)
  const rarities = new Set(fishByZone(z.id).map((f) => f.rarity))
  ok(rarities.has('common') || z.id === 'deepsea' || rarities.size >= 3, `zone ${z.id} rarity spread`)
}
ok(FISH.length >= 85, 'want 85+ species, got ' + FISH.length)

// sprite rendering with a mock ctx (fish + items)
const mock = { fillStyle: '', ops: 0, fillRect() { this.ops++ } }
for (const f of [...FISH, ...TRASH, ...TREASURE]) {
  mock.ops = 0
  drawFish(mock, f, 100, 100, 3, false, 0.5)
  ok(mock.ops > 8, `drawFish drew almost nothing for ${f.id} (${mock.ops} px)`)
  const { rows, cols } = gridDims(TEMPLATES[f.template])
  ok(rows > 0 && cols > 0, `template dims ${f.template}`)
}

// items
for (let i = 0; i < 200; i++) {
  const tr = rollTrash(); ok(tr.kind === 'trash', 'rollTrash kind')
  const tz = rollTreasure(); ok(tz.kind === 'treasure', 'rollTreasure kind')
  const v = rollTreasureValue(tz)
  ok(v >= tz.valueMin && v <= tz.valueMax, 'treasure value in range')
}

// quests deterministic + valid
for (const day of ['2026-07-19', '2026-07-20', '2026-01-01', '2027-12-31']) {
  const a = dailyQuests(day), b = dailyQuests(day)
  ok(JSON.stringify(a) === JSON.stringify(b), `quests not deterministic for ${day}`)
  ok(a.length === 3, 'want 3 quests')
  const types = new Set(a.map((q) => q.type))
  ok(types.size === 3, `duplicate quest types on ${day}`)
  for (const q of a) {
    ok(q.goal >= 1 && q.reward > 0 && typeof q.desc === 'string', `quest bad ${day} ${q.type}`)
    if (q.type === 'zone') ok(zoneIds.slice(0, 4).includes(q.zone), 'zone quest uses early zone')
  }
}
ok(/^\d{4}-\d{2}-\d{2}$/.test(todayKey()), 'todayKey format')

// achievements evaluate on a mock stats object
const { RELICS } = await import('./src/data/relics.js')
const x = { total: 500, species: FISH.length, totalSpecies: FISH.length, totalZones: 8, biggest: 999, zonesFished: 8, legendary: true, deepSpecies: 10, maxStreak: 12, shinies: 2, coinsEarned: 9999, trash: 20, treasure: 3, quests: 9, relics: RELICS.length, totalRelics: RELICS.length, mythic: true, crates: 40 }
for (const a of ACHIEVEMENTS) ok(a.test(x) === true, `achievement ${a.id} never satisfiable?`)
const x0 = { total: 0, species: 0, totalSpecies: FISH.length, totalZones: 8, biggest: 0, zonesFished: 0, legendary: false, deepSpecies: 0, maxStreak: 0, shinies: 0, coinsEarned: 0, trash: 0, treasure: 0, quests: 0, relics: 0, totalRelics: RELICS.length, mythic: false, crates: 0 }
for (const a of ACHIEVEMENTS) ok(a.test(x0) === false, `achievement ${a.id} unlocked at zero`)

// game math
for (const f of FISH) {
  const s = rollSize(f)
  ok(s >= f.minSize && s <= f.maxSize, `rollSize ${f.id}`)
  ok(catchValue(f, s) >= 1, `catchValue ${f.id}`)
}
for (const z of ZONES) ok(rollFish(z.id), `rollFish ${z.id}`)

// ---------- FishGen pack integration ----------
const { GENFISH, GEN_META } = await import('./src/data/genfish.js')
const packRaw = JSON.parse(fs.readFileSync('./src/data/genfish-pack.json', 'utf8'))

ok(GENFISH.length === 24, 'expected 24 generated fish, got ' + GENFISH.length)
ok(GEN_META.generator === 1, 'generator version pinned to 1')
ok(FISH.length === 103 + GENFISH.length, 'FISH must be BASE + GENFISH')

// every generated template got registered into the shared TEMPLATES table
for (const [k, rows] of Object.entries(packRaw.templates)) {
  ok(TEMPLATES[k] === rows || JSON.stringify(TEMPLATES[k]) === JSON.stringify(rows),
    `template ${k} not registered into TEMPLATES`)
}

// no id collisions between hand-authored and generated species (dex is id-keyed)
const baseIds = new Set(FISH.slice(0, 103).map((f) => f.id))
for (const f of GENFISH) {
  ok(!baseIds.has(f.id), `generated id ${f.id} collides with a base fish`)
  ok(TEMPLATES[f.template], `generated ${f.id} references missing template ${f.template}`)
  ok(zoneIds.includes(f.habitat), `generated ${f.id} bad habitat ${f.habitat}`)
  ok(RARITY[f.rarity], `generated ${f.id} bad rarity ${f.rarity}`)
  ok(typeof f.seed === 'string' && f.seed.length > 0, `generated ${f.id} missing seed`)
}

// grids must not be blank / degenerate after transport (the whitespace trap)
for (const [k, rows] of Object.entries(packRaw.templates)) {
  const { cols } = gridDims(rows)
  const ink = rows.join('').replace(/[\s.]/g, '').length
  ok(cols >= 8, `template ${k} suspiciously narrow (${cols} cols) — whitespace lost?`)
  ok(ink >= 40, `template ${k} has too few ink pixels (${ink})`)
  // leading spaces are what position the body; a fully left-flush grid means collapse
  const hasIndent = rows.some((r) => /^ +\S/.test(r))
  ok(hasIndent, `template ${k} has no indented rows — whitespace was collapsed`)
}

// per-zone Fishdex counts (drives the zone completion bars)
const zoneBreakdown = {}
for (const z of ZONES) {
  const all = fishByZone(z.id)
  zoneBreakdown[z.id] = { total: all.length, gen: all.filter((f) => f.seed).length }
}
console.log('\nzone totals after pack import (total / of which generated):')
for (const z of ZONES) {
  const b = zoneBreakdown[z.id]
  console.log(`  ${z.id.padEnd(9)} ${String(b.total).padStart(3)} / ${b.gen}`)
}
ok(Object.values(zoneBreakdown).reduce((s, b) => s + b.gen, 0) === 24, 'all 24 generated fish are reachable via fishByZone')

// rasterize one generated fish exactly as the catch popup would (drawFish)
function raster(fish, scale = 1, flip = false, flap = 0) {
  const px = new Map()
  const ctx2 = {
    fillStyle: '',
    fillRect(x, y, w, h) { px.set(`${Math.round(y)},${Math.round(x)}`, this.fillStyle) },
  }
  drawFish(ctx2, fish, 0, 0, scale, flip, flap)
  const ys = [...px.keys()].map((k) => +k.split(',')[0])
  const xs = [...px.keys()].map((k) => +k.split(',')[1])
  return { px, minY: Math.min(...ys), maxY: Math.max(...ys), minX: Math.min(...xs), maxX: Math.max(...xs) }
}

const sample = GENFISH[0]
const r = raster(sample)
let art = ''
for (let y = r.minY; y <= r.maxY; y++) {
  let line = ''
  for (let x = r.minX; x <= r.maxX; x++) line += px2char(r.px.get(`${y},${x}`))
  art += line.replace(/\s+$/, '') + '\n'
}
function px2char(c) { return c ? '#' : ' ' }
console.log(`\ncatch-popup render check — "${sample.name}" (${sample.template}, ${sample.habitat}):`)
console.log(art)
ok(r.maxX - r.minX >= 8 && r.maxY - r.minY >= 4, 'sample generated fish rasterized too small')
ok(r.px.size >= 60, `sample generated fish drew only ${r.px.size} pixels`)

// flip and flap must still work on generated grids (used by the swimming scene)
const rFlip = raster(sample, 1, true, 0)
const rFlap = raster(sample, 1, false, 1)
ok(rFlip.px.size === r.px.size, 'flip changed pixel count')
ok(rFlap.px.size === r.px.size, 'flap changed pixel count')
// drawFish shears only the rear ~38% of columns, and the tail sits mid-body,
// so compare the TAIL REGION's lowest pixel rather than the whole sprite
// (the belly, which is never sheared, otherwise dominates maxY).
const tailMaxY = (rr_) => {
  const cut = rr_.minX + (rr_.maxX - rr_.minX) * 0.7
  let m = -Infinity
  for (const k of rr_.px.keys()) {
    const [y, x] = k.split(',').map(Number)
    if (x >= cut && y > m) m = y
  }
  return m
}
ok(tailMaxY(rFlap) > tailMaxY(r), 'flap did not shear the tail region downward')

// ---------- exact-pixel FishGen grids (optional; empty file = flat fallback) ----------
const { GRIDS, drawGenGrid, spriteDims } = await import('./src/pixel/sprites.js')
const gridIds = Object.keys(GRIDS)
console.log(`\nexact-pixel grids registered: ${gridIds.length}/24`)

if (gridIds.length === 0) {
  console.log('  (genfish-grids.json is empty — generated fish render as flat char templates)')
} else {
  ok(gridIds.length === 24, `expected 24 grids, got ${gridIds.length}`)
  for (const id of gridIds) {
    const g = GRIDS[id]
    const fish = GENFISH.find((f) => f.id === id)
    ok(fish, `grid registered for unknown fish id ${id}`)
    ok(Array.isArray(g) && g.length >= 6, `grid ${id} too few rows`)
    const cells = g.flat()
    const colors = new Set(cells.filter(Boolean))
    ok(colors.size > 6, `grid ${id} has only ${colors.size} colors — no richer than a template`)
    for (const c of colors) ok(/^#[0-9a-f]{6}$/i.test(c), `grid ${id} bad color ${c}`)
    const { rows, cols } = spriteDims(fish)
    ok(rows === g.length && cols > 0, `spriteDims wrong for ${id}`)
  }

  // grids must route through drawFish AND still flip/flap like the old model
  const gf = GENFISH.find((f) => GRIDS[f.id])
  const rg = raster(gf), rgFlip = raster(gf, 1, true, 0), rgFlap = raster(gf, 1, false, 1)
  ok(rg.px.size > 100, `grid fish ${gf.id} drew only ${rg.px.size} px via drawFish`)
  ok(rgFlip.px.size === rg.px.size, 'grid flip changed pixel count')
  const tailY = (rr_) => {
    const cut = rr_.minX + (rr_.maxX - rr_.minX) * 0.7
    let m = -Infinity
    for (const k of rr_.px.keys()) { const [y, x] = k.split(',').map(Number); if (x >= cut && y > m) m = y }
    return m
  }
  ok(tailY(rgFlap) > tailY(rg), 'grid fish tail does not flap')
  const gridColors = new Set([...rg.px.values()])
  ok(gridColors.size > 6, `grid fish rendered with only ${gridColors.size} colors — grid path not used`)
  console.log(`  sample "${gf.name}": ${rg.px.size} px, ${gridColors.size} distinct colors, flap OK`)
}

console.log(fails === 0 ? '\nALL PROBES PASSED' : `\n${fails} FAILURES`)
process.exit(fails === 0 ? 0 : 1)
