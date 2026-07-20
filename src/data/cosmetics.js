// Boat cosmetics — a pure coin sink with no gameplay effect.
// Each entry supplies a palette patch consumed by src/scene/vessel.js.

export const HULLS = [
  { id: 'oak', name: 'Oak Trawler', cost: 0, swatch: '#8a4a24',
    palette: { plankA: '#8a4a24', plankB: '#7a3f1e', plankC: '#6b3518', shadow: '#4a230f',
      rail: '#c08a4a', railHi: '#e0b070', stripe: '#c9563c', stripeHi: '#e07a5c', deck: '#a5713c' } },
  { id: 'slate', name: 'Slate Cutter', cost: 900, swatch: '#4a5560',
    palette: { plankA: '#4a5560', plankB: '#3f4954', plankC: '#343d47', shadow: '#1f262d',
      rail: '#7a8896', railHi: '#a0b0be', stripe: '#3f8fb0', stripeHi: '#5fb0d0', deck: '#5c6874' } },
  { id: 'jade', name: 'Jade Runner', cost: 1600, swatch: '#2f7a5c',
    palette: { plankA: '#2f7a5c', plankB: '#28684e', plankC: '#20563f', shadow: '#123326',
      rail: '#5fbc92', railHi: '#8fe0b8', stripe: '#e0b843', stripeHi: '#f4d868', deck: '#3d8f6c' } },
  { id: 'crimson', name: 'Crimson Corsair', cost: 2600, swatch: '#8a2f2f',
    palette: { plankA: '#8a2f2f', plankB: '#762727', plankC: '#621f1f', shadow: '#3a1010',
      rail: '#c96a4a', railHi: '#e8917a', stripe: '#e0c040', stripeHi: '#f6dc72', deck: '#a04040' } },
  { id: 'obsidian', name: 'Obsidian Reaver', cost: 4200, swatch: '#26222c',
    palette: { plankA: '#26222c', plankB: '#1e1b24', plankC: '#17141c', shadow: '#0b0910',
      rail: '#6b5f80', railHi: '#9a88b8', stripe: '#b56cff', stripeHi: '#d0a0ff', deck: '#332e3c' } },
  { id: 'abyssal', name: 'Abyssal Wanderer', cost: 7000, swatch: '#123a4a',
    palette: { plankA: '#123a4a', plankB: '#0e3040', plankC: '#0a2634', shadow: '#04141c',
      rail: '#2f8aa0', railHi: '#5fd3ff', stripe: '#7fffd4', stripeHi: '#b8ffe8', deck: '#1a4c60' } },
]

export const FLAGS = [
  { id: 'classic', name: 'Classic Pennant', cost: 0, colors: ['#e0342a', '#f4f4f4'] },
  { id: 'jolly', name: 'Jolly Roger', cost: 700, colors: ['#1a1a1a', '#f4f4f4'] },
  { id: 'gold', name: 'Gilded Standard', cost: 1500, colors: ['#f4cf4a', '#8a6a10'] },
  { id: 'tide', name: 'Tide Banner', cost: 2200, colors: ['#3fae9c', '#5fd3ff'] },
  { id: 'void', name: 'Void Sigil', cost: 3800, colors: ['#b56cff', '#2a1240'] },
]

export const LANTERNS = [
  { id: 'amber', name: 'Amber Lamp', cost: 0, lit: '#ffd98a', litHi: '#ffb347' },
  { id: 'teal', name: 'Foxfire Lamp', cost: 800, lit: '#7fffd4', litHi: '#3fae9c' },
  { id: 'rose', name: 'Coral Lamp', cost: 1400, lit: '#ff9ec4', litHi: '#e0568f' },
  { id: 'violet', name: 'Abyss Lamp', cost: 2400, lit: '#c8a0ff', litHi: '#8a4fd0' },
]

export const COSMETIC_GROUPS = [
  { key: 'hull', label: 'Hull', icon: '🚢', items: HULLS },
  { key: 'flag', label: 'Flag', icon: '🚩', items: FLAGS },
  { key: 'lantern', label: 'Lantern', icon: '🏮', items: LANTERNS },
]

export const DEFAULT_EQUIPPED = { hull: 'oak', flag: 'classic', lantern: 'amber' }

// Resolve equipped ids into the skin object vessel.drawBoat expects.
export function buildSkin(equipped = DEFAULT_EQUIPPED) {
  const hull = HULLS.find((h) => h.id === equipped.hull) || HULLS[0]
  const flag = FLAGS.find((f) => f.id === equipped.flag) || FLAGS[0]
  const lantern = LANTERNS.find((l) => l.id === equipped.lantern) || LANTERNS[0]
  return { hull: hull.palette, flag: flag.colors, lantern: { lit: lantern.lit, litHi: lantern.litHi } }
}

export function cosmeticById(groupKey, id) {
  const g = COSMETIC_GROUPS.find((x) => x.key === groupKey)
  return g ? g.items.find((i) => i.id === id) : null
}
