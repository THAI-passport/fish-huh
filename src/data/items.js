// Non-fish catches: junk and treasure. Rendered through the same sprite pipeline.
// kind: 'trash' | 'treasure'. Treasure value is rolled between valueMin/valueMax.
export const TRASH = [
  { id: 'old_boot', name: 'Old Boot', kind: 'trash', template: 'boot', fight: 1,
    palette: { body: '#6b4a2c', dark: '#3a2814' }, value: 2 },
  { id: 'tin_can', name: 'Rusty Tin Can', kind: 'trash', template: 'can', fight: 1,
    palette: { body: '#8a8f94', dark: '#5a3c28' }, value: 2 },
  { id: 'broken_bottle', name: 'Broken Bottle', kind: 'trash', template: 'bottle', fight: 1,
    palette: { body: '#4a7a52', dark: '#2a4a30', lure: '#6b9a72' }, value: 3 },
]

export const TREASURE = [
  { id: 'message_bottle', name: 'Message in a Bottle', kind: 'treasure', template: 'bottle', fight: 3,
    palette: { body: '#5a8aa0', dark: '#2f4c5a', lure: '#e8d8a0' }, valueMin: 40, valueMax: 110, weight: 40 },
  { id: 'pearl_oyster', name: 'Pearl Oyster', kind: 'treasure', template: 'pearl', fight: 4,
    palette: { body: '#8a7a86', dark: '#4c4048' }, valueMin: 70, valueMax: 180, weight: 30 },
  { id: 'gold_ring', name: 'Gold Ring', kind: 'treasure', template: 'ring', fight: 4,
    palette: { body: '#f4cf4a', dark: '#8a6a10', lure: '#f4cf4a' }, valueMin: 90, valueMax: 240, weight: 20 },
  { id: 'treasure_chest', name: 'Treasure Chest', kind: 'treasure', template: 'chest', fight: 6,
    palette: { body: '#8a5a2c', dark: '#4a2f14', lure: '#ffd23c' }, valueMin: 180, valueMax: 450, weight: 10 },
]

export function rollTrash() {
  return TRASH[Math.floor(Math.random() * TRASH.length)]
}

export function rollTreasure() {
  const total = TREASURE.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const x of TREASURE) { r -= x.weight; if (r <= 0) return x }
  return TREASURE[TREASURE.length - 1]
}

export function rollTreasureValue(item) {
  return Math.round(item.valueMin + Math.random() * (item.valueMax - item.valueMin))
}
