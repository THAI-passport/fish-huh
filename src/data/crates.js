// Loot crates — the coin sink. Zones cost a fixed one-time total; crates are
// the endless money drain that keeps coins meaningful once everything unlocks.
//
// Rolling is two-stage: pick a RARITY from the crate's weight table (nudged by
// the player's accumulated 'crate' perk), then pick a random relic of that
// rarity. Duplicates are converted to coin "dust" so a roll is never worthless.
import { RELICS, RELIC_BY_RARITY, RELIC_RARITY, RELIC_TIERS } from './relics.js'

export const CRATES = [
  {
    id: 'driftwood', name: 'Driftwood Crate', icon: '📦', cost: 320,
    desc: 'Washed-up junk, mostly. Something shiny now and then.',
    weights: { common: 62, uncommon: 26, rare: 9, epic: 2.6, legendary: 0.4, mythic: 0.02 },
  },
  {
    id: 'sunken', name: 'Sunken Chest', icon: '🧰', cost: 950,
    desc: 'Hauled off the seabed. Better odds, heavier lid.',
    weights: { common: 30, uncommon: 34, rare: 22, epic: 10.5, legendary: 3, mythic: 0.15 },
  },
  {
    id: 'abyssal', name: 'Abyssal Vault', icon: '🗝️', cost: 2800,
    desc: 'Never opened. Guaranteed uncommon or better.',
    weights: { common: 0, uncommon: 24, rare: 38, epic: 26, legendary: 10.5, mythic: 1.2 },
  },
]

// crateLuck shifts weight from the bottom tier toward the top tiers.
function adjustedWeights(crate, crateLuck = 0) {
  const w = { ...crate.weights }
  if (crateLuck > 0) {
    const drain = Math.min(w.common, w.common * crateLuck)
    w.common -= drain
    w.rare += drain * 0.45
    w.epic += drain * 0.32
    w.legendary += drain * 0.18
    w.mythic += drain * 0.05
    // vaults have no common pool to drain, so scale the top end directly
    if (crate.weights.common === 0) {
      w.epic *= 1 + crateLuck * 0.5
      w.legendary *= 1 + crateLuck * 0.8
      w.mythic *= 1 + crateLuck
    }
  }
  return w
}

export function crateOdds(crate, crateLuck = 0) {
  const w = adjustedWeights(crate, crateLuck)
  const total = RELIC_TIERS.reduce((s, r) => s + (w[r] || 0), 0)
  return RELIC_TIERS.map((r) => ({ rarity: r, pct: total ? ((w[r] || 0) / total) * 100 : 0 }))
}

// Returns { relic, rarity, duplicate, dust }.
export function openCrate(crate, ownedIds = [], crateLuck = 0) {
  const w = adjustedWeights(crate, crateLuck)
  const total = RELIC_TIERS.reduce((s, r) => s + (w[r] || 0), 0)
  let roll = Math.random() * total
  let rarity = RELIC_TIERS[0]
  for (const r of RELIC_TIERS) {
    roll -= w[r] || 0
    if (roll <= 0) { rarity = r; break }
  }
  // fall back down the tiers if a rarity somehow has no relics defined
  let pool = RELIC_BY_RARITY[rarity]
  if (!pool || !pool.length) {
    const idx = RELIC_TIERS.indexOf(rarity)
    for (let i = idx; i >= 0 && (!pool || !pool.length); i--) {
      rarity = RELIC_TIERS[i]
      pool = RELIC_BY_RARITY[rarity]
    }
  }
  if (!pool || !pool.length) pool = RELICS

  // prefer an unowned relic of that rarity so collecting stays satisfying
  const fresh = pool.filter((r) => !ownedIds.includes(r.id))
  const picked = fresh.length
    ? fresh[Math.floor(Math.random() * fresh.length)]
    : pool[Math.floor(Math.random() * pool.length)]
  const duplicate = ownedIds.includes(picked.id)
  return {
    relic: picked,
    rarity: picked.rarity,
    duplicate,
    dust: duplicate ? RELIC_RARITY[picked.rarity].dust : 0,
  }
}
