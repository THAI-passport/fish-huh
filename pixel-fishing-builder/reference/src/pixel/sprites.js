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

function shadeHex(hex, amt) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Draw a fish centered at (cx, cy). belly shading + optional tail flap (-1..1).
export function drawFish(ctx, fish, cx, cy, scale, flip = false, flap = 0) {
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
