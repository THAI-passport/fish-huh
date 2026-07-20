import zlib from 'node:zlib'
import fs from 'node:fs'
import { drawBoat, P } from './src/scene/vessel.js'

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
    w, h, buf, fillStyle: '#000', globalAlpha: 1,
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

const SIZE = 512
const c = makeCanvas(SIZE, SIZE, [31, 95, 134]) // "#1f5f86" blue water background

c.fillStyle = '#f4cf4a'
c.fillRect(SIZE/2 - 90, SIZE/2 - 120, 180, 180) // sun

const scale = 7
const tempC = makeCanvas(300, 300, [31, 95, 134])
drawBoat(tempC, { cx: 150, cy: 150, t: 0, night: false, tilt: 0, moving: false })

for (let y = 0; y < 300; y++) {
  for (let x = 0; x < 300; x++) {
    const i = (y * 300 + x) * 3
    if (tempC.buf[i] !== 31 || tempC.buf[i+1] !== 95 || tempC.buf[i+2] !== 134) {
      c.fillStyle = `#${tempC.buf[i].toString(16).padStart(2,'0')}${tempC.buf[i+1].toString(16).padStart(2,'0')}${tempC.buf[i+2].toString(16).padStart(2,'0')}`
      const dx = (x - 150) * scale + SIZE/2
      const dy = (y - 150) * scale + SIZE/2 + 60
      c.fillRect(dx, dy, scale, scale)
    }
  }
}

png(c, 'public/icon-512x512.png')

// resize to 192
const c192 = makeCanvas(192, 192, [0,0,0])
for (let y=0; y<192; y++) {
  for (let x=0; x<192; x++) {
    const sx = Math.floor((x / 192) * 512)
    const sy = Math.floor((y / 192) * 512)
    const i = (sy * 512 + sx) * 3
    const di = (y * 192 + x) * 3
    c192.buf[di] = c.buf[i]
    c192.buf[di+1] = c.buf[i+1]
    c192.buf[di+2] = c.buf[i+2]
  }
}
png(c192, 'public/icon-192x192.png')

console.log('wrote icons')
