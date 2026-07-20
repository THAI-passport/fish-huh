// Code-drawn pixel fish. Each template is a ragged char grid (head left, tail right).
// Renderer pads rows, so exact row lengths don't need to match.
// Legend: B=body  F=fin  t=tail  m=mouth/dark  e=eye  w=white(teeth/highlight)
//         L=lure light  l=lure stalk   '.' or ' ' = transparent

export const TEMPLATES = {
  standard: [
    '       BBBBBB          ',
    '    BBBBBBBBBBBB     t  ',
    '  BBBBBBBBBBBBBBBB  ttt ',
    ' BeBBBBBBBBBBBBBBBBtttt ',
    'mBBBBBBBBBBBBBBBBBBBtttt',
    ' BBBBBBBBBBBBBBBBBBtttt ',
    '  BBBBBBBBBBBBBBBB  ttt ',
    '    BBBBBFFBBBB      t  ',
    '       BBFFBB          ',
  ],
  long: [
    '                        ',
    '  BBBBBBBBBBBBBBBBBB     ',
    ' BeBBBBBBBBBBBBBBBBBBBtt ',
    'mBBBBBBBBBBBBBBBBBBBBBBtt',
    '  BBBBBBBBBBBBBBBBBB   t ',
    '        FF     FF        ',
  ],
  round: [
    '      BBBBBB      ',
    '    BBBBBBBBBB   t ',
    '   BBBBBBBBBBBB ttt',
    '  BeBBBBBBBBBBBBtt ',
    ' mBBBBBBBBBBBBBBBtt',
    '  BBBBBBBBBBBBBBtt ',
    '   BBBBBBBBBBBB ttt',
    '    BBBBFFBBBB   t ',
    '      BBFFBB      ',
  ],
  flat: [
    '   BBBBBBBBBBBB    ',
    ' BBBBBBBBBBBBBBBBBB ',
    'BBBBBBBBBBBBBBBBBBBB',
    'BeBBBBBBBBBBBBBBBBBB',
    ' BBBBBBBBBBBBBBBBBB ',
    '   BBBBBBBBBBBB    ',
  ],
  angler: [
    '         L         ',
    '         l         ',
    '     BBBBBB        ',
    '   BBBBBBBBBB    t  ',
    '  BeBBBBBBBBBB  ttt ',
    ' mBBBBBBBBBBBBB tt  ',
    ' mmBBBBBBBBBBBB tt  ',
    '  wwwBBBBBBBBB  ttt ',
    '    BBBBBBBB     t  ',
  ],
  shark: [
    '         FF             ',
    '        FFFF            ',
    '   BBBBBBBBBBBBB     t  ',
    ' BeBBBBBBBBBBBBBBB  tt  ',
    'mBBBBBBBBBBBBBBBBBBttt  ',
    'wwBBBBBBBBBBBBBBBBBtt   ',
    '  BBBBBFFBBBBBB    t    ',
    '        FF              ',
  ],
  eel: [
    '  BBBB                   ',
    ' BeBBBBB                 ',
    'mBBBBBBBBB               ',
    '  BBBBBBBBBBBBBBBB   tt  ',
    '      BBBBBBBBBBBBBBttt  ',
    '            BBBBBBBBtt   ',
  ],
  ray: [
    '       BBBB           ',
    '   BBBBBBBBBB         ',
    ' BeBBBBBBBBBBBB       ',
    'BBBBBBBBBBBBBBBBttttt ',
    ' BBBBBBBBBBBBBB       ',
    '   BBBBBBBBBB         ',
    '       BBBB           ',
  ],
  jelly: [
    '   BBBBBB   ',
    '  BBBBBBBB  ',
    ' BBeBBBBeBB ',
    ' BBBBBBBBBB ',
    '  F t F t F ',
    '  t F t F t ',
    '  F t F t F ',
    '    t   t   ',
  ],
  crab: [
    ' F        F ',
    'FF BBBBBB FF',
    ' FBBBBBBBBF ',
    '  BeBBBBeB  ',
    '  BBBBBBBB  ',
    '  F F  F F  ',
  ],
  seahorse: [
    '  BBB   ',
    ' BeBB   ',
    ' mBBB   ',
    '  BBBB  ',
    '   BBB  ',
    '  BBBB  ',
    ' BBBB   ',
    ' BBB    ',
    '  BBt   ',
    '   tt   ',
  ],
  // ---- items (trash & treasure) ----
  boot: [
    '  BBB   ',
    '  BBB   ',
    '  BBB   ',
    '  BBBBB ',
    ' BBBBBBm',
    ' mmmmmm ',
  ],
  can: [
    ' mmmm ',
    ' BBBB ',
    ' BmBB ',
    ' BBBB ',
    ' mmmm ',
  ],
  bottle: [
    '    mm   ',
    '    BB   ',
    '   BBBB  ',
    '  BBBBBB ',
    '  BBLLBB ',
    '  BBBBBB ',
    '   BBBB  ',
  ],
  chest: [
    ' mmmmmmmm ',
    'mBBBBBBBBm',
    'mBBBLLBBBm',
    'mmmmmmmmmm',
    'mBBBLLBBBm',
    'mBBBBBBBBm',
    ' mmmmmmmm ',
  ],
  pearl: [
    '  BBBB  ',
    ' BBwwBB ',
    ' BBBwBB ',
    '  BBBB  ',
  ],
  ring: [
    '  LLLL  ',
    ' LL  LL ',
    ' L    L ',
    ' LL  LL ',
    '  LLLL  ',
  ],
  // ---- relics (Hall of Fame) ----
  gem: [
    ' mLLLLm ',
    'mLwLLLLm',
    'mLLLLLLm',
    ' mLLLLm ',
    '  mLLm  ',
    '   mm   ',
  ],
  shell: [
    '   mm   ',
    '  BBBB  ',
    ' BFBBFB ',
    'BBFBBFBB',
    'BmFmmFmB',
    ' mmmmmm ',
  ],
  hook: [
    '   mm   ',
    '   mm   ',
    '   mm   ',
    '   mm   ',
    'm  mm   ',
    'm  mm   ',
    'mm mm   ',
    ' mmmm   ',
    '  mm    ',
  ],
  scroll: [
    'mmmmmmmm',
    'mBBBBBBm',
    'mBwwwwBm',
    'mBwwwwBm',
    'mBBBBBBm',
    'mmmmmmmm',
  ],
  coin: [
    ' mmmm ',
    'mBLLBm',
    'mLwwLm',
    'mLwwLm',
    'mBLLBm',
    ' mmmm ',
  ],
  net: [
    'm m m m ',
    ' m m m m',
    'm m m m ',
    ' m m m m',
    'm m m m ',
  ],
  orb: [
    ' mLLm ',
    'mLwwLm',
    'mLwLLm',
    'mLLLLm',
    ' mLLm ',
  ],
  starfish: [
    '    B    ',
    '   BwB   ',
    'BBBBwBBBB',
    ' BBBwBBB ',
    '  BBBBB  ',
    '  BB BB  ',
    ' BB   BB ',
    ' m     m ',
  ],
  coral: [
    '  B  B  ',
    ' BB BB  ',
    ' BBBBB B',
    '  BBBBB ',
    '  BmBBB ',
    '   mBm  ',
    '  mmmm  ',
  ],
  key: [
    'mmm     ',
    'm m     ',
    'mmmmmmm ',
    'm     mm',
    'mmm   m ',
    '      mm',
  ],
  spyglass: [
    'mmBBBBBBmm',
    'mBLLLLLLBm',
    'mmBBBBBBmm',
  ],
  bell: [
    '   mm   ',
    '  BBBB  ',
    ' BBwBBB ',
    'BBBwBBBB',
    'BBBBBBBB',
    'mmmmmmmm',
    '   mm   ',
  ],
  compass: [
    ' mmmmmm ',
    'mBBBBBBm',
    'mBBwLBBm',
    'mBLwLBBm',
    'mBBLwBBm',
    'mBBBBBBm',
    ' mmmmmm ',
  ],
  ammonite: [
    '  BBBB  ',
    ' BmmmmB ',
    'BmBBBBmB',
    'BmBwwBmB',
    'BmBBBBmB',
    ' BmmmmB ',
    '  BBBB  ',
  ],
  anchor: [
    '   mm   ',
    '  mLLm  ',
    '   mm   ',
    ' mmmmmm ',
    '   mm   ',
    '   mm   ',
    'm  mm  m',
    'mm mm mm',
    ' mmmmmm ',
    '  mmmm  ',
  ],
  bottle_r: [
    '   mm   ',
    '   BB   ',
    '  mBBm  ',
    ' mBLLBm ',
    ' mBLLBm ',
    ' mBLLBm ',
    ' mBBBBm ',
    '  mmmm  ',
  ],
  comb: [
    ' mmmmmm ',
    'mBBBBBBm',
    'mBLLLLBm',
    'mBBBBBBm',
    ' m m m m',
    ' m m m m',
    ' m m m m',
  ],
  trident: [
    'm  m  m ',
    'm  m  m ',
    'm  m  m ',
    'mmmmmmm ',
    '   m    ',
    '   m    ',
    '   m    ',
    '  mLm   ',
  ],
  tooth: [
    ' wwww ',
    'wwwwww',
    'wwwwww',
    ' wwww ',
    ' www  ',
    '  ww  ',
    '  w   ',
  ],
  crown: [
    'L  L  L ',
    'LL LL LL',
    'LLLLLLLL',
    'LLwLLwLL',
    'LLLLLLLL',
    'mmmmmmmm',
  ],
  medallion: [
    ' mmmm ',
    'mLLLLm',
    'mLwwLm',
    'mLwwLm',
    'mLLLLm',
    ' mmmm ',
  ],
  kraken: [
    '  BBB   ',
    ' BBBBB  ',
    'BBeBBeBB',
    ' BBBBB  ',
    'B B B B ',
    ' B B B B',
    'B B B B ',
  ],
}

export function charColor(ch, pal) {
  switch (ch) {
    case 'B': return pal.body
    case 'F': return pal.fin || pal.body
    case 't': return pal.tail || pal.fin || pal.body
    case 'm': return pal.dark || '#3a3a3a'
    case 'l': return pal.dark || '#555'
    case 'L': return pal.lure || '#bfffe0'
    case 'e': return '#0a0a0a'
    case 'w': return '#f5f5f5'
    default: return null // transparent
  }
}

export function gridDims(template) {
  const rows = template.length
  const cols = template.reduce((m, r) => Math.max(m, r.length), 0)
  return { rows, cols }
}

// ---------------------------------------------------------------------------
// Exact-pixel grids (FishGen). A char template can only express ~6 palette
// slots; a grid is per-pixel "#rrggbb"/null and carries FishGen's patterns,
// countershading and outline. Registered by id from genfish.js; when a fish
// has one, drawFish renders it INSTEAD of the char template.
// ---------------------------------------------------------------------------
export const GRIDS = {}

export function registerGrids(map) { Object.assign(GRIDS, map) }

// Canvas sizing helper: grid dims win when present, else the char template.
export function spriteDims(fish) {
  const g = GRIDS[fish.id]
  if (g) return { rows: g.length, cols: g.reduce((m, r) => Math.max(m, r.length), 0) }
  return gridDims(TEMPLATES[fish.template] || TEMPLATES.standard)
}

// Draw an exact-pixel grid. Deliberately uses the SAME shear math as drawFish
// below (column-based, 0.35) so generated fish flap identically to the
// hand-drawn ones — not the normalized variant, which reads faster/looser.
// No belly shading here: FishGen already bakes countershading into the grid.
export function drawGenGrid(ctx, grid, cx, cy, scale, flip = false, flap = 0) {
  const rows = grid.length
  const cols = grid.reduce((m, r) => Math.max(m, r.length), 0)
  const ox = Math.round(cx - (cols * scale) / 2)
  const oy = Math.round(cy - (rows * scale) / 2)
  const shearStart = cols * 0.62
  for (let gy = 0; gy < rows; gy++) {
    const row = grid[gy]
    for (let gx = 0; gx < row.length; gx++) {
      const color = row[gx]
      if (!color) continue
      const dx = flip ? cols - 1 - gx : gx
      let y = oy + gy * scale
      if (gx > shearStart) y += Math.round(flap * (gx - shearStart) * 0.35 * scale)
      ctx.fillStyle = color
      ctx.fillRect(ox + dx * scale, y, scale, scale)
    }
  }
}

function shadeHex(hex, amt) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Draw a fish centered at (cx, cy). belly shading + optional tail flap (-1..1).
export function drawFish(ctx, fish, cx, cy, scale, flip = false, flap = 0) {
  // Exact-pixel grid takes precedence; every call site (swimmers, hooked fish,
  // popup, Fishdex) picks this up automatically with flip/flap intact.
  const exact = GRIDS[fish.id]
  if (exact) return drawGenGrid(ctx, exact, cx, cy, scale, flip, flap)

  const t = TEMPLATES[fish.template] || TEMPLATES.standard
  const { rows, cols } = gridDims(t)
  const ox = Math.round(cx - (cols * scale) / 2)
  const oy = Math.round(cy - (rows * scale) / 2)
  const bellyStart = t.length * 0.62
  const shearStart = cols * 0.62
  for (let gy = 0; gy < t.length; gy++) {
    const row = t[gy]
    for (let gx = 0; gx < row.length; gx++) {
      const ch = row[gx]
      let color = charColor(ch, fish.palette)
      if (!color) continue
      if (ch === 'B' && gy >= bellyStart) color = shadeHex(color, -26) // belly shadow
      const dx = flip ? cols - 1 - gx : gx
      let y = oy + gy * scale
      if (gx > shearStart) y += Math.round(flap * (gx - shearStart) * 0.35 * scale) // tail flap
      ctx.fillStyle = color
      ctx.fillRect(ox + dx * scale, y, scale, scale)
    }
  }
}
