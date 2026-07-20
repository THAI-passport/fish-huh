// Tackle upgrades. Each level index 0..MAX_LEVEL. costs[level] = price to reach level+1.
export const MAX_LEVEL = 6

export const SHOP = [
  {
    key: 'rod', name: 'Fishing Rod', icon: '🎣',
    desc: 'Stronger reel — the catch zone lifts faster and fills a little quicker.',
    costs: [120, 320, 700, 1600, 3500, 8000],
  },
  {
    key: 'line', name: 'Line', icon: '🧵',
    desc: 'Tougher line — bigger catch zone and a head start on the meter.',
    costs: [100, 260, 580, 1300, 2800, 6500],
  },
  {
    key: 'bait', name: 'Bait', icon: '🪱',
    desc: 'Tastier bait — fish come to the hook faster and rarer species show up more.',
    costs: [90, 240, 520, 1200, 2600, 6000],
  },
]

export function nextCost(item, level) {
  return level < MAX_LEVEL ? item.costs[level] : null
}
