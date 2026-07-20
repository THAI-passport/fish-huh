// Pixel-art vessel + crew sprites.
//
// Everything here draws with axis-aligned fillRect ONLY — no vector paths, no
// arcs, no gradients. That is deliberate: the old boat/angler used beginPath +
// lineTo polygons, which produced smooth anti-aliased diagonals that clashed
// with the hard-edged pixel fish. Pure fillRect keeps the whole scene in one
// visual language and lets the art be unit-tested headlessly.
//
// "Rocking" is a per-column vertical shear rather than ctx.rotate, so pixels
// stay axis-aligned (a rotated pixel sprite shimmers and blurs).

export const P = 2 // pixel size: one art unit = 2 canvas px

// ---------------------------------------------------------------------------
// palettes
// ---------------------------------------------------------------------------
const HULL = {
  plankA: '#8a4a24',
  plankB: '#7a3f1e',
  plankC: '#6b3518',
  shadow: '#4a230f',
  rail: '#c08a4a',
  railHi: '#e0b070',
  stripe: '#c9563c',
  stripeHi: '#e07a5c',
  deck: '#a5713c',
  deckLine: '#8a5c30',
  keel: '#3a1a0c',
}
const CABIN = {
  wall: '#dfe6ea',
  wallShade: '#b4c2ca',
  roof: '#3a6b8c',
  roofHi: '#4f88ad',
  frame: '#24384f',
  glass: '#6fc6f0',
  glassNight: '#ffd98a',
  chimney: '#5a5550',
}
const CREW = {
  hat: '#2f4858',
  hatHi: '#3f5f74',
  brim: '#243a47',
  skin: '#e0b48c',
  skinShade: '#c0956f',
  beard: '#8a8a8a',
  eye: '#1a1a1a',
  coat: '#c0392b',
  coatShade: '#962d21',
  coatHi: '#d9584a',
  pants: '#26456b',
  pantsShade: '#1b3350',
  boot: '#2b1a10',
}
const ROD = { pole: '#4a2c18', poleHi: '#6b4326', grip: '#2b1a10', reel: '#c9c9c9' }
const LANTERN = {
  cap: '#3a3530', bail: '#5a5550',
  lit: '#ffd98a', litHi: '#ffb347',
  dark: '#6b7076', darkHi: '#8a9298',
}
const SMOKE = '#c8ccd2'

// ---------------------------------------------------------------------------
// tilted pixel plotter
// ---------------------------------------------------------------------------
// Returns a draw fn in ART UNITS with a see-saw shear applied around pivotX.
function plotter(ctx, ox, oy, tilt, pivotX) {
  return function b(gx, gy, gw, gh, color) {
    if (!color) return
    const dy = Math.round((gx + gw / 2 - pivotX) * tilt)
    ctx.fillStyle = color
    ctx.fillRect(ox + gx * P, oy + (gy + dy) * P, gw * P, gh * P)
  }
}

// Soft radial-ish glow built from stacked rows forming a diamond. Nested
// translucent SQUARES read as a grey box at this scale; a diamond with a
// quadratic alpha falloff reads as light.
function glowDiamond(ctx, b, cx, cy, r, color, peak) {
  for (let dy = -r; dy <= r; dy++) {
    const w = r - Math.abs(dy)
    if (w < 0) continue
    const d = Math.abs(dy) / r
    ctx.globalAlpha = peak * (1 - d) * (1 - d)
    b(cx - w, cy + dy, w * 2 + 1, 1, color)
  }
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
// hull profile: art-unit inset per row, bow at LEFT, transom at RIGHT
// ---------------------------------------------------------------------------
const HULL_W = 62
const HULL_ROWS = [
  // [leftInset, rightInset]
  [0, 0], [0, 0], [1, 0], [2, 0], [4, 1], [6, 2], [9, 3], [13, 5], [18, 8],
]

export function boatMetrics(cx, cy) {
  return { ox: Math.round(cx - (HULL_W * P) / 2), oy: Math.round(cy) }
}

// ---------------------------------------------------------------------------
// the boat
// ---------------------------------------------------------------------------
export function drawBoat(ctx, opts) {
  const { cx, cy, t = 0, night = false, tilt = 0, moving = false, skin = null } = opts
  const { ox, oy } = boatMetrics(cx, cy)
  const pivot = HULL_W / 2
  const b = plotter(ctx, ox, oy, tilt, pivot)
  // Cosmetic overrides. Defaults keep the stock oak trawler look.
  const H = skin && skin.hull ? { ...HULL, ...skin.hull } : HULL
  const LAMP = skin && skin.lantern ? { ...LANTERN, ...skin.lantern } : LANTERN
  const FLAGC = (skin && skin.flag) || ['#e0342a', '#f4f4f4']

  // ---- hull ----
  for (let r = 0; r < HULL_ROWS.length; r++) {
    const [li, ri] = HULL_ROWS[r]
    const x = li
    const w = HULL_W - li - ri
    if (w <= 0) continue
    let c = r % 2 === 0 ? H.plankA : H.plankB
    if (r >= 6) c = H.plankC
    if (r === HULL_ROWS.length - 1) c = H.shadow
    b(x, 4 + r, w, 1, c)
  }
  // waterline stripe
  b(1, 6, HULL_W - 2, 1, H.stripe)
  b(1, 6, HULL_W - 2, 1, H.stripe)
  b(2, 5, HULL_W - 3, 1, H.stripeHi)
  // keel shadow under the transom
  b(20, 12, HULL_W - 28, 1, H.keel)

  // ---- deck + rail ----
  b(0, 3, HULL_W, 1, H.deck)
  b(0, 2, HULL_W, 1, H.rail)
  b(0, 1, HULL_W, 1, H.railHi)
  for (let x = 2; x < HULL_W - 2; x += 6) b(x, 3, 1, 1, H.deckLine)

  // ---- bow post + hanging lantern ----
  // Built as a proper lantern (metal caps, glass, bail) rather than a lit
  // square — at this size a plain block just reads as a yellow smudge.
  b(4, -7, 1, 7, H.plankC)          // post
  b(4, -8, 1, 1, H.rail)            // post cap
  b(1, -7, 4, 1, H.rail)            // arm out over the bow
  b(1, -6, 1, 1, LAMP.bail)         // bail hook
  b(0, -5, 3, 1, LAMP.cap)          // top cap
  b(0, -1, 3, 1, LAMP.cap)          // bottom cap
  b(0, -4, 3, 3, night ? LAMP.lit : LAMP.dark)
  b(0, -4, 1, 3, night ? LAMP.litHi : LAMP.darkHi)  // glass highlight
  b(1, -4, 1, 1, night ? '#fff6d8' : LAMP.darkHi)      // flame core
  if (night) glowDiamond(ctx, b, 1, -3, 11, LAMP.lit, 0.20)

  // ---- cabin ----
  const cxs = 36
  b(cxs, -8, 20, 8, CABIN.wall)
  b(cxs, -8, 20, 1, CABIN.wallShade)
  b(cxs + 18, -8, 2, 8, CABIN.wallShade)
  b(cxs - 1, -10, 22, 2, CABIN.roof)
  b(cxs - 1, -10, 22, 1, CABIN.roofHi)
  // windows
  const glass = night ? CABIN.glassNight : CABIN.glass
  for (let i = 0; i < 2; i++) {
    const wx = cxs + 3 + i * 8
    b(wx - 1, -7, 7, 6, CABIN.frame)
    b(wx, -6, 5, 4, glass)
    b(wx, -6, 5, 1, night ? '#fff0c0' : '#a8e4ff')
  }
  // chimney + smoke
  b(cxs + 15, -14, 3, 4, CABIN.chimney)
  b(cxs + 15, -15, 3, 1, '#3a3530')
  if (moving || night) {
    // Puffs grow and fade as they rise and drift — a few fixed-size dots read
    // as debris rather than smoke.
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.5 + i * 13) % 65
      const life = p / 65
      const sz = 1 + Math.floor(life * 2)
      const drift = Math.round(Math.sin((t + i * 47) / 24) * (1 + life * 3))
      // quadratic fade so the plume dissolves instead of ending in hard blocks
      ctx.globalAlpha = 0.38 * (1 - life) * (1 - life)
      b(cxs + 15 + drift, Math.round(-16 - p / 3.4), sz, sz, SMOKE)
    }
    ctx.globalAlpha = 1
  }

  // ---- mast, rigging, flag ----
  const mx = 26
  b(mx, -26, 2, 26, H.plankC)
  b(mx, -26, 1, 26, H.rail)
  // stays
  for (let i = 0; i < 7; i++) b(mx - 2 - i * 2, -22 + i * 3, 1, 1, '#6b5a45')
  for (let i = 0; i < 6; i++) b(mx + 3 + i * 2, -22 + i * 3, 1, 1, '#6b5a45')
  // pennant flag, 3-frame flutter
  const f = Math.floor(t / 9) % 3
  const wave = [0, 1, 0, -1][f % 4]
  for (let i = 0; i < 8; i++) {
    const yy = -26 + Math.round(Math.sin((i + t / 7) * 0.9) * 1.2)
    b(mx + 2 + i, yy, 1, 3 - (i > 5 ? 1 : 0), i % 2 ? FLAGC[0] : FLAGC[1])
  }
  void wave

  return { ox, oy, tilt, pivot, deckY: 1, railY: 2 }
}

// ---------------------------------------------------------------------------
// the angler — pose: 'idle' | 'cast' | 'reel'
// ---------------------------------------------------------------------------
// Body is a char grid; the rod arm is drawn procedurally so it can swing.
const BODY = [
  '..HHHH..',
  '.HhhhhH.',
  'BBBBBBBB',
  '..ssss..',
  '..sess..',
  '..dddd..',
  '.CCCCCC.',
  'CCCCCCCC',
  'CCCcCCCC',
  '.CCCCCC.',
  '..PPPP..',
  '..PP.PP.',
  '..PP.PP.',
  '.KK..KK.',
]
const BODY_COLOR = {
  H: CREW.hat, h: CREW.hatHi, B: CREW.brim,
  s: CREW.skin, e: CREW.eye, d: CREW.beard,
  C: CREW.coat, c: CREW.coatHi, P: CREW.pants, K: CREW.boot,
}

export function drawAngler(ctx, opts) {
  const { ox, oy, gx, gy, tilt = 0, pivot = 0, pose = 'idle', t = 0 } = opts
  const b = plotter(ctx, ox, oy, tilt, pivot)

  // subtle idle breathing: body drops 1 unit every other beat
  const breathe = pose === 'idle' && Math.floor(t / 40) % 2 === 0 ? 1 : 0
  const baseY = gy + breathe

  for (let r = 0; r < BODY.length; r++) {
    const row = BODY[r]
    for (let c = 0; c < row.length; c++) {
      const col = BODY_COLOR[row[c]]
      if (col) b(gx + c, baseY + r, 1, 1, col)
    }
  }
  // coat shadow along the lower hem
  b(gx + 1, baseY + 9, 6, 1, CREW.coatShade)

  // ---- rod arm ----
  // Shoulder sits at the coat's top-left. The grip is kept at CHEST height or
  // lower in every pose: raising it to face height (rows 3-5) makes the rod
  // shaft cut across the angler's head, which read as a bug in review.
  const shoulder = { x: gx + 1, y: baseY + 7 }
  const hand =
    pose === 'cast' ? { x: gx - 5, y: baseY + 6 }
    : pose === 'reel' ? { x: gx - 3, y: baseY + 8 + (Math.floor(t / 5) % 2) }
    : { x: gx - 3, y: baseY + 7 }

  // upper + fore arm as two stepped segments
  const mid = { x: Math.round((shoulder.x + hand.x) / 2), y: Math.round((shoulder.y + hand.y) / 2) }
  stepLine(b, shoulder, mid, CREW.coatShade, 2)
  stepLine(b, mid, hand, CREW.skin, 1)
  b(hand.x - 1, hand.y, 2, 2, CREW.skinShade) // fist on the grip

  // reeling crank spins next to the fist
  if (pose === 'reel') {
    const a = (t / 4) % 4
    const dx = [1, 0, -1, 0][Math.floor(a)]
    const dy = [0, 1, 0, -1][Math.floor(a)]
    b(hand.x - 2 + dx, hand.y + 1 + dy, 1, 1, ROD.reel)
  }

  // Suggested rod direction per pose, so callers don't have to guess an angle
  // that keeps the shaft clear of the head. Offsets are in art units.
  const rodAim =
    pose === 'cast' ? { dx: -30, dy: -24 }
    : pose === 'reel' ? { dx: -21, dy: -26 }
    : { dx: -26, dy: -19 }

  return { hand, shoulder, rodAim, tip: { x: hand.x + rodAim.dx, y: hand.y + rodAim.dy } }
}

// Bresenham-ish stepped line, drawn as square pixels of the given thickness.
function stepLine(b, from, to, color, thick = 1) {
  const dx = Math.abs(to.x - from.x), dy = Math.abs(to.y - from.y)
  const sx = from.x < to.x ? 1 : -1, sy = from.y < to.y ? 1 : -1
  let err = dx - dy, x = from.x, y = from.y
  for (let guard = 0; guard < 64; guard++) {
    b(x, y, thick, thick, color)
    if (x === to.x && y === to.y) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx) { err += dx; y += sy }
  }
}

// ---------------------------------------------------------------------------
// the rod — a bending curve of pixels, not a straight vector line
// ---------------------------------------------------------------------------
// bend 0 = relaxed, 1 = fully loaded (fish fighting). Quadratic curve sampled
// into square pixels so it matches the sprite art.
export function drawRod(ctx, opts) {
  const { ox, oy, gripX, gripY, tipX, tipY, bend = 0, tilt = 0, pivot = 0 } = opts
  const b = plotter(ctx, ox, oy, tilt, pivot)
  // control point pulled perpendicular to the grip→tip line by `bend`
  const mx = (gripX + tipX) / 2, my = (gripY + tipY) / 2
  const vx = tipX - gripX, vy = tipY - gripY
  const len = Math.hypot(vx, vy) || 1
  const px = -vy / len, py = vx / len
  const amp = bend * len * 0.22
  const ctrl = { x: mx + px * amp, y: my + py * amp }

  const steps = Math.max(10, Math.round(len))
  let last = null
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const iu = 1 - u
    const x = Math.round(iu * iu * gripX + 2 * iu * u * ctrl.x + u * u * tipX)
    const y = Math.round(iu * iu * gripY + 2 * iu * u * ctrl.y + u * u * tipY)
    if (last && last.x === x && last.y === y) continue
    last = { x, y }
    // rod tapers: thick at the grip, 1px at the tip
    const th = u < 0.25 ? 2 : 1
    b(x, y, th, th, u < 0.12 ? ROD.grip : u < 0.6 ? ROD.pole : ROD.poleHi)
  }
  return { ctrl }
}
