import { ZONES, RARITY } from '../data/zones.js'
import { drawFish } from '../pixel/sprites.js'

const GOLD = { body: '#f4cf4a', fin: '#fff2a8', tail: '#ffdf5c', dark: '#8a6a10' }

export function exportCatchCard(fish, record, shiny) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = 440
  canvas.height = 260
  
  // Background
  ctx.fillStyle = '#0a1622'
  ctx.fillRect(0, 0, 440, 260)
  
  // Border
  const rcolor = shiny ? '#ffd23c' : RARITY[fish.rarity].color
  ctx.strokeStyle = rcolor
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, 436, 256)
  
  // Text
  ctx.fillStyle = '#eaf2f8'
  ctx.font = '16px ui-monospace, "Courier New", monospace'
  ctx.fillText('CATCH CARD', 20, 36)
  
  ctx.fillStyle = rcolor
  ctx.font = 'bold 24px ui-monospace, "Courier New", monospace'
  ctx.fillText(shiny ? `Shiny ${fish.name}` : fish.name, 20, 70)
  
  ctx.fillStyle = '#a0a0a0'
  ctx.font = '16px ui-monospace, "Courier New", monospace'
  ctx.fillText(`Rarity: ${fish.rarity}`, 20, 110)
  ctx.fillText(`Habitat: ${ZONES.find((z) => z.id === fish.habitat)?.name}`, 20, 140)
  ctx.fillText(`Size: ${fish.minSize}-${fish.maxSize} cm`, 20, 170)
  ctx.fillText(`Record: ${record} cm`, 20, 200)
  ctx.fillText(`Base Value: 🪙 ${fish.baseValue}`, 20, 230)
  
  // Draw Fish sprite
  const f = shiny ? { ...fish, palette: GOLD } : fish
  const scale = 7
  ctx.imageSmoothingEnabled = false
  drawFish(ctx, f, 300, 130, scale, false, 0)
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${shiny ? 'Shiny_' : ''}${fish.name.replace(/\s+/g, '_')}_Card.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
