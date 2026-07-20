// Water zones. view: 'surface' = boat + sky; 'abyss' = submersible, true deep-sea view.
export const ZONES = [
  { id: 'fresh',    name: 'Freshwater Lake',  short: 'Lake',    icon: '🏞️', bg: '#2e6f8e', unlockCost: 0,    view: 'surface' },
  { id: 'river',    name: 'Mountain River',   short: 'River',   icon: '🏔️', bg: '#3f7f8e', unlockCost: 100,  view: 'surface' },
  { id: 'brackish', name: 'Brackish Estuary', short: 'Estuary', icon: '🌿', bg: '#3f6b63', unlockCost: 250,  view: 'surface' },
  { id: 'salt',     name: 'Saltwater Coast',  short: 'Coast',   icon: '🌊', bg: '#1f5f86', unlockCost: 600,  view: 'surface' },
  { id: 'reef',     name: 'Coral Reef',       short: 'Reef',    icon: '🪸', bg: '#1f6f8a', unlockCost: 1000, view: 'surface' },
  { id: 'ice',      name: 'Frozen Fjord',     short: 'Ice',     icon: '🧊', bg: '#2a5a7a', unlockCost: 1400, view: 'surface', cold: true },
  { id: 'deepsea',  name: 'Deep Sea Abyss',   short: 'Abyss',   icon: '🌑', bg: '#0a1f3c', unlockCost: 2000, view: 'abyss' },
  { id: 'wreck',    name: 'Sunken Wreck',     short: 'Wreck',   icon: '⚓', bg: '#101a2e', unlockCost: 3200, view: 'abyss', wreck: true },
]

// Rarity drives spawn weight and value multiplier.
export const RARITY = {
  common:    { weight: 50, color: '#c9c9c9', mult: 1 },
  uncommon:  { weight: 28, color: '#5fd35f', mult: 1.8 },
  rare:      { weight: 14, color: '#5a9bff', mult: 3.5 },
  epic:      { weight: 6,  color: '#b56cff', mult: 7 },
  legendary: { weight: 2,  color: '#ffb020', mult: 15 },
}

const PALETTE = {
  default: ['#c9c9c9', '#5fd35f', '#5a9bff', '#b56cff', '#ffb020'],
  cb:      ['#c9c9c9', '#009e73', '#56b4e9', '#e69f00', '#d55e00'] // Wong palette
}

export function setColorblind(active) {
  const p = active ? PALETTE.cb : PALETTE.default
  RARITY.common.color = p[0]
  RARITY.uncommon.color = p[1]
  RARITY.rare.color = p[2]
  RARITY.epic.color = p[3]
  RARITY.legendary.color = p[4]
}
