import { useEffect, useRef } from 'react'
import { TEMPLATES, gridDims, drawFish } from './sprites.js'

// Static pixel fish on a crisp canvas (used in popups and the Fishdex).
export default function PixelFish({ fish, scale = 6, flip = false }) {
  const ref = useRef(null)
  const template = TEMPLATES[fish.template] || TEMPLATES.standard
  const { rows, cols } = gridDims(template)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    drawFish(ctx, fish, (cols * scale) / 2, (rows * scale) / 2, scale, flip, 0)
  }, [fish, scale, flip, rows, cols])

  return (
    <canvas
      ref={ref}
      width={cols * scale}
      height={rows * scale}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  )
}
