// Sea relics — the Hall of Fame collection. Won from crates, never from fishing.
// Each relic grants a small permanent passive perk, so coins stay useful long
// after every zone is unlocked: coins -> crates -> relics -> better fishing.
//
// perk.type: 'coin'   % bonus on every catch payout
//            'luck'   extra rarity re-rolls when a fish spawns
//            'bite'   faster lure steering (fish come to the hook sooner)
//            'shiny'  added shiny chance (absolute, e.g. 0.01 = +1%)
//            'crate'  improved crate rarity odds

export const RELIC_RARITY = {
  common:    { weight: 46,   color: '#c9c9c9', dust: 40,   label: 'Common' },
  uncommon:  { weight: 27,   color: '#5fd35f', dust: 90,   label: 'Uncommon' },
  rare:      { weight: 16,   color: '#5a9bff', dust: 200,  label: 'Rare' },
  epic:      { weight: 8,    color: '#b56cff', dust: 450,  label: 'Epic' },
  legendary: { weight: 2.6,  color: '#ffb020', dust: 1100, label: 'Legendary' },
  mythic:    { weight: 0.4,  color: '#ff5fa2', dust: 3000, label: 'Mythic' },
}

export const RELIC_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

export const RELICS = [
  // ---------- common ----------
  { id: 'sea_glass', name: 'Sea Glass', rarity: 'common', template: 'gem',
    palette: { body: '#6fc6a8', dark: '#2f6b58', lure: '#8fe8c8', fin: '#4fa88a' },
    perk: { type: 'coin', value: 0.02 }, blurb: 'Tumbled smooth by a hundred years of tide.' },
  { id: 'barnacle', name: 'Barnacle Cluster', rarity: 'common', template: 'shell',
    palette: { body: '#c8bfa8', dark: '#5c5647', fin: '#9a9079', lure: '#e8e0c8' },
    perk: { type: 'coin', value: 0.02 }, blurb: 'Scraped off a hull that had seen better days.' },
  { id: 'rusted_hook', name: 'Rusted Hook', rarity: 'common', template: 'hook',
    palette: { body: '#8a5a3c', dark: '#5c3a24', fin: '#a8724c', lure: '#c98a5c' },
    perk: { type: 'bite', value: 0.04 }, blurb: 'Someone lost a big one with this.' },
  { id: 'driftwood', name: 'Driftwood Charm', rarity: 'common', template: 'scroll',
    palette: { body: '#9a7f5c', dark: '#4c3d28', fin: '#b89a72', lure: '#d8c0a0' },
    perk: { type: 'coin', value: 0.02 }, blurb: 'Carved by a bored deckhand on a long crossing.' },
  { id: 'fish_scale', name: 'Silver Scale', rarity: 'common', template: 'coin',
    palette: { body: '#c8d0d8', dark: '#6b7480', fin: '#9aa6b0', lure: '#eef4fa' },
    perk: { type: 'luck', value: 0.1 }, blurb: 'Too big to belong to anything you have caught.' },
  { id: 'net_scrap', name: 'Torn Net', rarity: 'common', template: 'net',
    palette: { body: '#7a8a6b', dark: '#3f4a36', fin: '#9aab88', lure: '#c0d0a8' },
    perk: { type: 'bite', value: 0.04 }, blurb: 'Whatever tore this was not a fish.' },

  // ---------- uncommon ----------
  { id: 'pearl', name: 'Black Pearl', rarity: 'uncommon', template: 'orb',
    palette: { body: '#4a4458', dark: '#221f2c', fin: '#6b6480', lure: '#9a90b8' },
    perk: { type: 'coin', value: 0.05 }, blurb: 'One oyster in ten thousand makes one this dark.' },
  { id: 'starfish', name: 'Crimson Star', rarity: 'uncommon', template: 'starfish',
    palette: { body: '#c0483c', dark: '#6b241c', fin: '#e06a5c', lure: '#ffb0a0' },
    perk: { type: 'luck', value: 0.2 }, blurb: 'Regrows any arm it loses. Slowly.' },
  { id: 'coral_branch', name: 'Coral Branch', rarity: 'uncommon', template: 'coral',
    palette: { body: '#e07a9c', dark: '#8a3f56', fin: '#f2a0bc', lure: '#ffd0e0' },
    perk: { type: 'coin', value: 0.05 }, blurb: 'A century of growth, snapped off in a second.' },
  { id: 'brass_key', name: 'Brass Key', rarity: 'uncommon', template: 'key',
    palette: { body: '#c9a227', dark: '#6b540e', fin: '#e0c050', lure: '#fff0a0' },
    perk: { type: 'crate', value: 0.05 }, blurb: 'Fits a lock somewhere on the seabed.' },
  { id: 'spyglass', name: "Mate's Spyglass", rarity: 'uncommon', template: 'spyglass',
    palette: { body: '#3a4a5c', dark: '#1c2530', fin: '#5c7288', lure: '#a8d8f0' },
    perk: { type: 'bite', value: 0.08 }, blurb: 'Cracked lens, still finds the birds working bait.' },

  // ---------- rare ----------
  { id: 'ships_bell', name: "Ship's Bell", rarity: 'rare', template: 'bell',
    palette: { body: '#b8963c', dark: '#5c4a18', fin: '#d8b85c', lure: '#f0e0a0' },
    perk: { type: 'coin', value: 0.09 }, blurb: 'Still rings clear. Nobody rings it.' },
  { id: 'compass', name: 'Compass Rose', rarity: 'rare', template: 'compass',
    palette: { body: '#c8b070', dark: '#4c3f22', fin: '#8a7444', lure: '#ff6b5c' },
    perk: { type: 'luck', value: 0.4 }, blurb: 'The needle does not point north. It points down.' },
  { id: 'ammonite', name: 'Ammonite Fossil', rarity: 'rare', template: 'ammonite',
    palette: { body: '#a89070', dark: '#4c4030', fin: '#786450', lure: '#d8c8a8' },
    perk: { type: 'coin', value: 0.09 }, blurb: 'Swam these waters before there was a shore.' },
  { id: 'anchor_charm', name: 'Iron Anchor', rarity: 'rare', template: 'anchor',
    palette: { body: '#6b7480', dark: '#333a42', fin: '#8a96a2', lure: '#b8c4d0' },
    perk: { type: 'bite', value: 0.12 }, blurb: 'Small enough for a pocket. Heavy as guilt.' },
  { id: 'ink_vial', name: 'Kraken Ink', rarity: 'rare', template: 'bottle_r',
    palette: { body: '#2a2438', dark: '#12101c', fin: '#4a4060', lure: '#8a6bd0' },
    perk: { type: 'shiny', value: 0.008 }, blurb: 'Still warm. Do not open belowdecks.' },

  // ---------- epic ----------
  { id: 'siren_comb', name: "Siren's Comb", rarity: 'epic', template: 'comb',
    palette: { body: '#d8c070', dark: '#6b5a20', fin: '#f0e0a0', lure: '#fff8d0' },
    perk: { type: 'shiny', value: 0.015 }, blurb: 'Hair still caught in the teeth. Not human hair.' },
  { id: 'trident_shard', name: 'Trident Shard', rarity: 'epic', template: 'trident',
    palette: { body: '#8ad0e0', dark: '#2f6b7a', fin: '#b8e8f2', lure: '#e0ffff' },
    perk: { type: 'luck', value: 0.8 }, blurb: 'Broken from something much larger, and angrier.' },
  { id: 'leviathan_tooth', name: 'Leviathan Tooth', rarity: 'epic', template: 'tooth',
    palette: { body: '#e8e4d8', dark: '#8a8578', fin: '#c0bcb0', lure: '#fffdf5' },
    perk: { type: 'coin', value: 0.16 }, blurb: 'As long as your forearm. It had many.' },
  { id: 'drowned_crown', name: 'Drowned Crown', rarity: 'epic', template: 'crown',
    palette: { body: '#d8b03c', dark: '#6b5210', fin: '#f0d060', lure: '#fff0a0' },
    perk: { type: 'crate', value: 0.12 }, blurb: 'The king went down with the ship. So did this.' },

  // ---------- legendary ----------
  { id: 'poseidon_signet', name: "Poseidon's Signet", rarity: 'legendary', template: 'medallion',
    palette: { body: '#f0d060', dark: '#7a5a10', fin: '#ffe890', lure: '#5fd3ff' },
    perk: { type: 'coin', value: 0.3 }, blurb: 'The sea answers to whoever wears it. Rarely kindly.' },
  { id: 'abyss_orb', name: 'Abyssal Core', rarity: 'legendary', template: 'orb',
    palette: { body: '#3f2f6b', dark: '#180f2c', fin: '#6b4fb8', lure: '#c8a0ff' },
    perk: { type: 'luck', value: 1.5 }, blurb: 'It is cold, and it is humming, and it is not stopping.' },
  { id: 'kraken_eye', name: 'Kraken Eye', rarity: 'legendary', template: 'kraken',
    palette: { body: '#8a3040', dark: '#3f1018', fin: '#c05060', lure: '#ffd23c' },
    perk: { type: 'shiny', value: 0.03 }, blurb: 'It tracks you across the room.' },

  // ---------- mythic ----------
  { id: 'atlantis_key', name: 'Key of Atlantis', rarity: 'mythic', template: 'key',
    palette: { body: '#7fffd4', dark: '#1f6b58', fin: '#b8ffe8', lure: '#ffffff' },
    perk: { type: 'crate', value: 0.3 }, blurb: 'Every lock. One city. Nobody has found the door.' },
  { id: 'world_serpent', name: 'Scale of the World Serpent', rarity: 'mythic', template: 'medallion',
    palette: { body: '#ff5fa2', dark: '#6b1038', fin: '#ffa0c8', lure: '#fff0f8' },
    perk: { type: 'coin', value: 0.6 }, blurb: 'It circles the world. This fell off. Somewhere.' },
]

export const RELIC_BY_RARITY = RELIC_TIERS.reduce((m, r) => {
  m[r] = RELICS.filter((x) => x.rarity === r)
  return m
}, {})

// Completing every relic in a rarity tier grants a bonus on top of the
// individual perks — gives the collection a target beyond "one of each".
export const SET_BONUSES = [
  { tier: 'common',    name: 'Beachcomber',  icon: '🐚', perk: { type: 'coin',  value: 0.08 } },
  { tier: 'uncommon',  name: 'Tidewalker',   icon: '🌊', perk: { type: 'bite',  value: 0.10 } },
  { tier: 'rare',      name: 'Deepdiver',    icon: '🤿', perk: { type: 'luck',  value: 0.60 } },
  { tier: 'epic',      name: 'Stormcaller',  icon: '⚡', perk: { type: 'shiny', value: 0.02 } },
  { tier: 'legendary', name: 'Sovereign',    icon: '👑', perk: { type: 'crate', value: 0.20 } },
  { tier: 'mythic',    name: 'Worldbreaker', icon: '🐉', perk: { type: 'coin',  value: 0.50 } },
]

// Which sets are fully collected.
export function completedSets(ownedIds) {
  const owned = new Set(ownedIds)
  return SET_BONUSES.filter((s) => {
    const group = RELIC_BY_RARITY[s.tier] || []
    return group.length > 0 && group.every((r) => owned.has(r.id))
  })
}

// Sum every owned relic's perk, plus any completed set bonuses, into one object.
export function relicPerks(ownedIds) {
  const out = { coin: 0, luck: 0, bite: 0, shiny: 0, crate: 0 }
  for (const id of ownedIds) {
    const r = RELICS.find((x) => x.id === id)
    if (r && out[r.perk.type] != null) out[r.perk.type] += r.perk.value
  }
  for (const s of completedSets(ownedIds)) {
    if (out[s.perk.type] != null) out[s.perk.type] += s.perk.value
  }
  return out
}

export function perkLabel(perk) {
  switch (perk.type) {
    case 'coin': return `+${Math.round(perk.value * 100)}% coins`
    case 'luck': return `+${perk.value.toFixed(1)} rare luck`
    case 'bite': return `+${Math.round(perk.value * 100)}% bite speed`
    case 'shiny': return `+${(perk.value * 100).toFixed(1)}% shiny`
    case 'crate': return `+${Math.round(perk.value * 100)}% crate luck`
    default: return ''
  }
}
