// Dev-only. Renders the pixel-art boat/angler/rod to a PNG so the art can be
// reviewed without launching the game. Run: node preview-vessel.mjs
import zlib from 'node:zlib'
import fs from 'node:fs'
import { drawBoat, drawAngler, drawRod, drawSub, boatMetrics, subMetrics, P } from './src/scene/vessel.js'

// --- tiny fillRect-only canvas ------------------------------------------------
function makeCanvas(w, h, bg) {
  const buf = new Uint8Array(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    buf[i * 3] = bg[0]; buf[i * 3 + 1] = bg[1]; buf[i * 3 + 2] = bg[2]
  }
  const hex = (c) => {
    if (c[0] !== '#') return [255, 0, 255]
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
  }
  return {
    w, h, buf,
    fillStyle: '#000',
    globalAlpha: 1,
    fillRect(x, y, rw, rh) {
      const [r, g, bl] = hex(this.fillStyle)
      const a = this.globalAlpha
      for (let yy = Math.round(y); yy < Math.round(y + rh); yy++) {
        if (yy < 0 || yy >= h) continue
        for (let xx = Math.round(x); xx < Math.round(x + rw); xx++) {
          if (xx < 0 || xx >= w) continue
          const i = (yy * w + xx) * 3
          buf[i] = buf[i] * (1 - a) + r * a
          buf[i + 1] = buf[i + 1] * (1 - a) + g * a
          buf[i + 2] = buf[i + 2] * (1 - a) + bl * a
        }
      }
    },
  }
}

// --- minimal PNG encoder ------------------------------------------------------
function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(canvas, path) {
  const { w, h, buf } = canvas
  const raw = Buffer.alloc(h * (w * 3 + 1))
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    Buffer.from(buf.subarray(y * w * 3, (y + 1) * w * 3)).copy(raw, y * (w * 3 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]))
}

// --- scene ---------------------------------------------------------------
const SCALE = 3 // upscale the whole preview so pixels are legible
const W = 760, H = 700
const c = makeCanvas(W, H, [22, 46, 74])

function panel(x, y, label, night, pose, bend, tilt) {
  const cx = x + 175, cy = y + 96
  const m = boatMetrics(cx, cy)
  // Waterline must cut THROUGH the hull, but leave freeboard: sit it at row 10
  // so the planking and red stripe stay visible and only the keel submerges.
  // (Row 6 = at the stripe drowns the hull; below row 12 = the boat levitates.)
  const waterY = m.oy + 10 * P

  const st = drawBoat(c, { cx, cy, t: 40, night, tilt, moving: true })

  // water drawn OVER the lower hull so it reads as submerged
  c.globalAlpha = 0.92
  c.fillStyle = night ? '#0d2136' : '#1f5f86'
  c.fillRect(x, waterY, 360, y + 192 - waterY)
  c.globalAlpha = 1
  c.fillStyle = night ? '#1a3f5c' : '#3d90bd'
  c.fillRect(x, waterY, 360, 2)
  // foam where the hull meets the surface
  c.fillStyle = night ? '#9fc4dd' : '#eafcff'
  const bowX = m.ox + 6 * P, sternX = m.ox + 56 * P
  for (let i = 0; i < 26; i++) {
    const fx = bowX - 10 + i * ((sternX - bowX + 20) / 26)
    const fy = waterY - 1 + ((i % 3 === 0) ? 1 : 0)
    c.fillRect(Math.round(fx), fy, 3, 2)
  }
  const a = drawAngler(c, {
    ox: m.ox, oy: m.oy, gx: 14, gy: -13, tilt, pivot: st.pivot, pose, t: 40,
  })
  drawRod(c, {
    ox: m.ox, oy: m.oy,
    gripX: a.hand.x, gripY: a.hand.y,
    tipX: a.tip.x, tipY: a.tip.y,
    bend, tilt, pivot: st.pivot,
  })
  void label
}

function subPanel(x, y, lightOn) {
  const cx = x + 175, cy = y + 96
  // abyss backdrop
  c.fillStyle = '#0a1f3c'; c.fillRect(x, y - 6, 360, 200)
  c.fillStyle = '#061424'; c.fillRect(x, y + 150, 360, 44)
  for (let i = 0; i < 40; i++) {
    c.fillStyle = 'rgba(210,225,240,0.28)'
    c.fillRect(x + ((i * 47) % 356), y + ((i * 83) % 190), 2, 2)
  }
  drawSub(c, { cx, cy, t: 40, tilt: 0.03, aimX: cx - 120, aimY: cy + 80, lightOn })
}
subPanel(20, 455, true)
subPanel(390, 455, false)

// four states, 2x2
panel(20, 10, 'day-idle', false, 'idle', 0, 0)
panel(390, 10, 'day-cast', false, 'cast', 0.15, -0.04)
panel(20, 235, 'night-idle', true, 'idle', 0, 0.03)
panel(390, 235, 'fighting', false, 'reel', 0.85, 0.05)

// upscale
const up = makeCanvas(W * SCALE, H * SCALE, [22, 46, 74])
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3
    up.fillStyle = `#${c.buf[i].toString(16).padStart(2, '0')}${c.buf[i + 1].toString(16).padStart(2, '0')}${c.buf[i + 2].toString(16).padStart(2, '0')}`
    up.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
  }
}
png(up, 'vessel-preview.png')
console.log(`wrote vessel-preview.png  (${W * SCALE}x${H * SCALE}, art unit P=${P})`)
