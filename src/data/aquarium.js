// Aquarium — park caught species in tanks for passive coin income.
// Income accrues in real time and is capped so it stays a nice bonus for
// coming back, not a reason to leave the game closed.
import { FISH } from './fish.js'
import { RARITY } from './zones.js'

export const SLOTS = 6
export const CAP_HOURS = 6            // accrual stops after this long away
export const RATE_K = 14              // tuning: bigger = slower income

// Coins per minute contributed by one species.
//
// Uses SQRT of the fish's gross worth, not the raw value. Linear scaling is a
// trap here: baseValue*rarityMult spans 6 (Bluegill) to 12000 (Giant Squid), so
// a linear rate made one legendary tank out-earn active fishing by orders of
// magnitude. Sqrt compresses that 2000x spread to ~45x — legendaries still feel
// worth tanking, without the aquarium replacing the game.
export function fishRate(fishId) {
  const f = FISH.find((x) => x.id === fishId)
  if (!f) return 0
  return Math.sqrt(f.baseValue * RARITY[f.rarity].mult) / RATE_K
}

export function totalRate(slots = []) {
  return slots.reduce((s, id) => s + (id ? fishRate(id) : 0), 0)
}

// Returns { coins, minutes, capped } for the time since lastCollect.
export function pendingIncome(aquarium, now = Date.now()) {
  const rate = totalRate(aquarium.slots || [])
  if (rate <= 0) return { coins: 0, minutes: 0, capped: false }
  const last = aquarium.lastCollect || now
  const rawMin = Math.max(0, (now - last) / 60000)
  const capMin = CAP_HOURS * 60
  const minutes = Math.min(rawMin, capMin)
  return { coins: Math.floor(minutes * rate), minutes, capped: rawMin >= capMin }
}

export function fmtRate(rate) {
  if (rate <= 0) return '0/min'
  return rate < 1 ? `${rate.toFixed(2)}/min` : `${rate.toFixed(1)}/min`
}
