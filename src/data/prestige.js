// Prestige ("Set Sail on a New Voyage") — the endgame reset.
//
// Resets: coins, unlocked zones, tackle upgrades, active bait.
// KEEPS: Fishdex, relics, achievements, aquarium, cosmetics, stats.
// Grants a permanent stacking coin multiplier, so a reset is always net-positive.

import { ZONES } from './zones.js'

export const VOYAGE_BONUS = 0.25          // +25% coins per completed voyage
export const REQUIRED_SPECIES = 40        // plus every zone unlocked

export function voyageMultiplier(voyages = 0) {
  return 1 + voyages * VOYAGE_BONUS
}

export function prestigeStatus(save) {
  const zonesOpen = (save.unlocked || []).length
  const species = Object.keys(save.dex || {}).length
  const zonesOk = zonesOpen >= ZONES.length
  const speciesOk = species >= REQUIRED_SPECIES
  return {
    ready: zonesOk && speciesOk,
    zonesOpen, zonesTotal: ZONES.length, zonesOk,
    species, speciesNeeded: REQUIRED_SPECIES, speciesOk,
    current: save.prestige?.voyages || 0,
    currentMult: voyageMultiplier(save.prestige?.voyages || 0),
    nextMult: voyageMultiplier((save.prestige?.voyages || 0) + 1),
  }
}

// Produce the post-prestige save. Pure — caller decides when to commit.
export function applyPrestige(save) {
  return {
    ...save,
    coins: 0,
    unlocked: ['fresh'],
    upgrades: { rod: 0, line: 0, bait: 0 },
    bait: { scrap: save.bait?.scrap || 0, active: null },
    prestige: { voyages: (save.prestige?.voyages || 0) + 1 },
  }
}
