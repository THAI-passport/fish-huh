// Water zones. Deepsea gated behind a coin cost to unlock progression.
export const ZONES = [
  { id: 'fresh',    name: 'Freshwater Lake',  short: 'Fresh',    bg: '#2e6f8e', unlockCost: 0 },
  { id: 'brackish', name: 'Brackish Estuary',  short: 'Brackish', bg: '#3f6b63', unlockCost: 150 },
  { id: 'salt',     name: 'Saltwater Coast',   short: 'Salt',     bg: '#1f5f86', unlockCost: 500 },
  { id: 'deepsea',  name: 'Deep Sea Abyss',    short: 'Deep Sea', bg: '#0a1f3c', unlockCost: 1500 },
]

// Rarity drives spawn weight and value multiplier.
export const RARITY = {
  common:    { weight: 50, color: '#c9c9c9', mult: 1 },
  uncommon:  { weight: 28, color: '#5fd35f', mult: 1.8 },
  rare:      { weight: 14, color: '#5a9bff', mult: 3.5 },
  epic:      { weight: 6,  color: '#b56cff', mult: 7 },
  legendary: { weight: 2,  color: '#ffb020', mult: 15 },
}
