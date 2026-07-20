// Bait crafting — gives junk catches a purpose. Trash yields scrap; scrap
// crafts baits that grant a limited number of boosted casts.
//
// A bait is consumed one charge per landed catch. Only one bait is active at a
// time; crafting a new one replaces the old.

export const SCRAP_PER_TRASH = 2

export const BAITS = [
  {
    id: 'groundbait', name: 'Groundbait', icon: '🥣', scrap: 8, charges: 15,
    luck: 0.5, bite: 0.10, target: 'bottom',
    desc: 'Cheap chum. Draws fish in a little faster.',
  },
  {
    id: 'bloodworm', name: 'Bloodworm', icon: '🪱', scrap: 18, charges: 12,
    luck: 1.2, bite: 0.18, target: 'school',
    desc: 'Wriggling and pungent. Rarer species take notice.',
  },
  {
    id: 'glowbait', name: 'Glowbait', icon: '💡', scrap: 34, charges: 10,
    luck: 2.2, bite: 0.30, target: 'drift',
    desc: 'Bioluminescent lure. Works even in the abyss.',
  },
  {
    id: 'krakenchum', name: 'Kraken Chum', icon: '🦑', scrap: 60, charges: 8,
    luck: 3.5, bite: 0.45, target: 'predator',
    desc: 'Something enormous donated this. Legendary odds spike.',
  },
]

export function baitById(id) {
  return BAITS.find((b) => b.id === id) || null
}

// Active-bait contribution to the live luck/bite bonuses.
export function baitBonus(active) {
  if (!active || !active.id || active.charges <= 0) return { luck: 0, bite: 0, target: null }
  const b = baitById(active.id)
  return b ? { luck: b.luck, bite: b.bite, target: b.target || null } : { luck: 0, bite: 0, target: null }
}
