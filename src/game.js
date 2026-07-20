import { fishByZone } from './data/fish.js'
import { RARITY } from './data/zones.js'

// Weighted random fish from a zone, biased by rarity weight.
export function rollFish(zoneId) {
  const pool = fishByZone(zoneId)
  if (!pool.length) return null
  const weighted = pool.map((f) => ({ f, w: RARITY[f.rarity].weight }))
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const x of weighted) {
    r -= x.w
    if (r <= 0) return x.f
  }
  return weighted[weighted.length - 1].f
}

// Random catch size within the species range.
export function rollSize(fish) {
  const s = fish.minSize + Math.random() * (fish.maxSize - fish.minSize)
  return Math.round(s)
}

// Coin value scales with rarity and how big the catch is within its range.
export function catchValue(fish, size) {
  const span = fish.maxSize - fish.minSize || 1
  const sizeFactor = 0.7 + 0.6 * ((size - fish.minSize) / span) // 0.7..1.3
  return Math.max(1, Math.round(fish.baseValue * RARITY[fish.rarity].mult * sizeFactor))
}

// Reel timing window (ms) shrinks with fight difficulty.
export function reelWindow(fish) {
  return Math.max(700, 1600 - fish.fight * 90)
}

// Landing chance once the player reels in time.
export function landChance(fish) {
  return Math.min(0.96, Math.max(0.35, 0.98 - fish.fight * 0.06))
}
