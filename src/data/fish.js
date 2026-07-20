// Fish database. Expandable — add entries and they auto-appear in their zone.
// Fields: id, name, habitat, rarity, template (sprite shape),
//         palette {body,fin,tail,dark,lure}, minSize/maxSize (cm),
//         baseValue (coins), fight (1-10 difficulty), biteMin/biteMax (ms).
//
// Importing genfish.js here also registers its sprite templates into TEMPLATES
// as a side effect — keep this import above any use of FISH.
import { GENFISH } from './genfish.js'

const BASE_FISH = [
  // ---------- FRESHWATER ----------
  { id: 'bluegill', name: 'Bluegill', habitat: 'fresh', rarity: 'common', template: 'round',
    palette: { body: '#5a7f6b', fin: '#3f5c4d', tail: '#3f5c4d', dark: '#e0a63c' }, minSize: 10, maxSize: 25, baseValue: 6, fight: 2, biteMin: 1200, biteMax: 3500 },
  { id: 'yellow_perch', name: 'Yellow Perch', habitat: 'fresh', rarity: 'common', template: 'standard',
    palette: { body: '#e0b843', fin: '#c9741f', tail: '#c9741f', dark: '#7a5210' }, minSize: 12, maxSize: 30, baseValue: 7, fight: 2, biteMin: 1200, biteMax: 3500 },
  { id: 'largemouth_bass', name: 'Largemouth Bass', habitat: 'fresh', rarity: 'uncommon', template: 'standard',
    palette: { body: '#6f8f4f', fin: '#4c6636', tail: '#4c6636', dark: '#2f3e22' }, minSize: 25, maxSize: 60, baseValue: 18, fight: 4, biteMin: 1500, biteMax: 4000 },
  { id: 'rainbow_trout', name: 'Rainbow Trout', habitat: 'fresh', rarity: 'uncommon', template: 'standard',
    palette: { body: '#8fa6b8', fin: '#c95d7a', tail: '#c95d7a', dark: '#5a6b78' }, minSize: 20, maxSize: 55, baseValue: 20, fight: 4, biteMin: 1500, biteMax: 4000 },
  { id: 'common_carp', name: 'Common Carp', habitat: 'fresh', rarity: 'uncommon', template: 'round',
    palette: { body: '#b08a4a', fin: '#7a5c2c', tail: '#7a5c2c', dark: '#4f3a1a' }, minSize: 35, maxSize: 90, baseValue: 22, fight: 5, biteMin: 1800, biteMax: 4500 },
  { id: 'northern_pike', name: 'Northern Pike', habitat: 'fresh', rarity: 'rare', template: 'long',
    palette: { body: '#5f7a4c', fin: '#3d5230', tail: '#3d5230', dark: '#26331d' }, minSize: 45, maxSize: 130, baseValue: 45, fight: 6, biteMin: 2000, biteMax: 5000 },
  { id: 'channel_catfish', name: 'Channel Catfish', habitat: 'fresh', rarity: 'rare', template: 'long',
    palette: { body: '#6b6b70', fin: '#48484c', tail: '#48484c', dark: '#2c2c30' }, minSize: 40, maxSize: 120, baseValue: 48, fight: 6, biteMin: 2200, biteMax: 5200 },
  { id: 'golden_koi', name: 'Golden Koi', habitat: 'fresh', rarity: 'epic', template: 'standard',
    palette: { body: '#f2a13c', fin: '#f5f5f5', tail: '#f5f5f5', dark: '#b5651d' }, minSize: 30, maxSize: 90, baseValue: 120, fight: 5, biteMin: 2500, biteMax: 6000 },
  { id: 'arapaima', name: 'Arapaima', habitat: 'fresh', rarity: 'legendary', template: 'long',
    palette: { body: '#5a5560', fin: '#a83b3b', tail: '#a83b3b', dark: '#33303a' }, minSize: 120, maxSize: 300, baseValue: 400, fight: 9, biteMin: 3000, biteMax: 7000 },

  // ---------- BRACKISH ----------
  { id: 'snook', name: 'Snook', habitat: 'brackish', rarity: 'common', template: 'standard',
    palette: { body: '#b7bcc2', fin: '#7d848b', tail: '#7d848b', dark: '#3a3f45' }, minSize: 30, maxSize: 90, baseValue: 14, fight: 4, biteMin: 1400, biteMax: 3800 },
  { id: 'flounder', name: 'Flounder', habitat: 'brackish', rarity: 'common', template: 'flat',
    palette: { body: '#8a7a5c', fin: '#645636', tail: '#645636', dark: '#3d3320' }, minSize: 20, maxSize: 55, baseValue: 16, fight: 3, biteMin: 1400, biteMax: 3800 },
  { id: 'redfish', name: 'Red Drum', habitat: 'brackish', rarity: 'uncommon', template: 'standard',
    palette: { body: '#c96a3c', fin: '#9c4a24', tail: '#9c4a24', dark: '#5c2a12' }, minSize: 35, maxSize: 100, baseValue: 26, fight: 5, biteMin: 1700, biteMax: 4200 },
  { id: 'striped_bass', name: 'Striped Bass', habitat: 'brackish', rarity: 'rare', template: 'standard',
    palette: { body: '#9aa6b0', fin: '#5f6a74', tail: '#5f6a74', dark: '#2f363d' }, minSize: 40, maxSize: 120, baseValue: 55, fight: 6, biteMin: 2000, biteMax: 5000 },
  { id: 'tarpon', name: 'Tarpon', habitat: 'brackish', rarity: 'epic', template: 'standard',
    palette: { body: '#c8ccd2', fin: '#8a9098', tail: '#8a9098', dark: '#4a4f56' }, minSize: 90, maxSize: 240, baseValue: 160, fight: 8, biteMin: 2600, biteMax: 6200 },

  // ---------- SALTWATER ----------
  { id: 'clownfish', name: 'Clownfish', habitat: 'salt', rarity: 'common', template: 'round',
    palette: { body: '#e8781f', fin: '#f5f5f5', tail: '#f5f5f5', dark: '#2a2a2a' }, minSize: 6, maxSize: 12, baseValue: 12, fight: 1, biteMin: 1200, biteMax: 3200 },
  { id: 'mackerel', name: 'Atlantic Mackerel', habitat: 'salt', rarity: 'common', template: 'standard',
    palette: { body: '#5a8fb0', fin: '#3a5f78', tail: '#3a5f78', dark: '#1f3444' }, minSize: 20, maxSize: 45, baseValue: 13, fight: 3, biteMin: 1200, biteMax: 3200 },
  { id: 'mahimahi', name: 'Mahi-Mahi', habitat: 'salt', rarity: 'uncommon', template: 'standard',
    palette: { body: '#4fb36a', fin: '#f2d23c', tail: '#f2d23c', dark: '#1f6b8a' }, minSize: 50, maxSize: 130, baseValue: 40, fight: 6, biteMin: 1800, biteMax: 4600 },
  { id: 'yellowfin_tuna', name: 'Yellowfin Tuna', habitat: 'salt', rarity: 'rare', template: 'standard',
    palette: { body: '#3a5f7a', fin: '#f2c53c', tail: '#f2c53c', dark: '#233a4c' }, minSize: 80, maxSize: 200, baseValue: 90, fight: 8, biteMin: 2200, biteMax: 5400 },
  { id: 'mako_shark', name: 'Mako Shark', habitat: 'salt', rarity: 'epic', template: 'long',
    palette: { body: '#5a7f9c', fin: '#3d5a70', tail: '#3d5a70', dark: '#233a4c' }, minSize: 150, maxSize: 320, baseValue: 220, fight: 9, biteMin: 2800, biteMax: 6400 },
  { id: 'blue_marlin', name: 'Blue Marlin', habitat: 'salt', rarity: 'legendary', template: 'long',
    palette: { body: '#2f6f9c', fin: '#1c4463', tail: '#1c4463', dark: '#12293c' }, minSize: 200, maxSize: 450, baseValue: 500, fight: 10, biteMin: 3200, biteMax: 7500 },

  // ---------- DEEP SEA ----------
  { id: 'fangtooth', name: 'Fangtooth', habitat: 'deepsea', rarity: 'uncommon', template: 'round',
    palette: { body: '#3a3540', fin: '#26222c', tail: '#26222c', dark: '#15121a' }, minSize: 10, maxSize: 18, baseValue: 60, fight: 4, biteMin: 2000, biteMax: 5000 },
  { id: 'viperfish', name: 'Viperfish', habitat: 'deepsea', rarity: 'rare', template: 'long',
    palette: { body: '#2a3a3a', fin: '#3fae9c', tail: '#3fae9c', dark: '#12201f' }, minSize: 25, maxSize: 40, baseValue: 110, fight: 6, biteMin: 2400, biteMax: 5600 },
  { id: 'gulper_eel', name: 'Gulper Eel', habitat: 'deepsea', rarity: 'rare', template: 'long',
    palette: { body: '#1f1f2a', fin: '#4a3f6b', tail: '#4a3f6b', dark: '#0e0e16' }, minSize: 40, maxSize: 90, baseValue: 130, fight: 6, biteMin: 2400, biteMax: 5600 },
  { id: 'anglerfish', name: 'Anglerfish', habitat: 'deepsea', rarity: 'epic', template: 'angler',
    palette: { body: '#242030', fin: '#151220', tail: '#151220', dark: '#0c0a14', lure: '#bfffe0' }, minSize: 20, maxSize: 60, baseValue: 260, fight: 7, biteMin: 2800, biteMax: 6400 },
  { id: 'coelacanth', name: 'Coelacanth', habitat: 'deepsea', rarity: 'legendary', template: 'standard',
    palette: { body: '#3a4a6b', fin: '#8fa6c8', tail: '#8fa6c8', dark: '#20293d' }, minSize: 120, maxSize: 200, baseValue: 600, fight: 9, biteMin: 3200, biteMax: 7500 },

  // ---------- FRESHWATER (expansion) ----------
  { id: 'crappie', name: 'Black Crappie', habitat: 'fresh', rarity: 'common', template: 'round',
    palette: { body: '#7f8a7a', fin: '#525c4d', tail: '#525c4d', dark: '#2f3628' }, minSize: 15, maxSize: 35, baseValue: 8, fight: 2, biteMin: 1200, biteMax: 3400 },
  { id: 'smallmouth_bass', name: 'Smallmouth Bass', habitat: 'fresh', rarity: 'uncommon', template: 'standard',
    palette: { body: '#8a7a45', fin: '#5f532c', tail: '#5f532c', dark: '#332c17' }, minSize: 22, maxSize: 55, baseValue: 17, fight: 4, biteMin: 1500, biteMax: 4000 },
  { id: 'brook_trout', name: 'Brook Trout', habitat: 'fresh', rarity: 'uncommon', template: 'standard',
    palette: { body: '#5a7f6b', fin: '#d0743c', tail: '#d0743c', dark: '#324a3d' }, minSize: 18, maxSize: 45, baseValue: 19, fight: 3, biteMin: 1500, biteMax: 4000 },
  { id: 'walleye', name: 'Walleye', habitat: 'fresh', rarity: 'rare', template: 'standard',
    palette: { body: '#b0a05a', fin: '#7a6c34', tail: '#7a6c34', dark: '#4a3f1c' }, minSize: 35, maxSize: 90, baseValue: 44, fight: 5, biteMin: 2000, biteMax: 5000 },
  { id: 'muskie', name: 'Muskellunge', habitat: 'fresh', rarity: 'epic', template: 'long',
    palette: { body: '#6f7a4c', fin: '#464f2c', tail: '#464f2c', dark: '#2a301a' }, minSize: 70, maxSize: 180, baseValue: 150, fight: 8, biteMin: 2600, biteMax: 6200 },
  { id: 'lake_sturgeon', name: 'Lake Sturgeon', habitat: 'fresh', rarity: 'legendary', template: 'long',
    palette: { body: '#5a5548', fin: '#38342b', tail: '#38342b', dark: '#211f18' }, minSize: 120, maxSize: 270, baseValue: 420, fight: 9, biteMin: 3000, biteMax: 7000 },
  { id: 'peacock_bass', name: 'Peacock Bass', habitat: 'fresh', rarity: 'rare', template: 'standard',
    palette: { body: '#3f8a5a', fin: '#f2c53c', tail: '#22506b', dark: '#20402c' }, minSize: 30, maxSize: 75, baseValue: 50, fight: 6, biteMin: 2000, biteMax: 5000 },

  // ---------- BRACKISH (expansion) ----------
  { id: 'mullet', name: 'Striped Mullet', habitat: 'brackish', rarity: 'common', template: 'standard',
    palette: { body: '#9aa2a8', fin: '#697079', tail: '#697079', dark: '#363b42' }, minSize: 20, maxSize: 50, baseValue: 12, fight: 3, biteMin: 1300, biteMax: 3700 },
  { id: 'sheepshead', name: 'Sheepshead', habitat: 'brackish', rarity: 'uncommon', template: 'round',
    palette: { body: '#b8b0a0', fin: '#4a463c', tail: '#4a463c', dark: '#2a2822' }, minSize: 25, maxSize: 60, baseValue: 24, fight: 4, biteMin: 1700, biteMax: 4200 },
  { id: 'seatrout', name: 'Spotted Seatrout', habitat: 'brackish', rarity: 'uncommon', template: 'standard',
    palette: { body: '#8f9aa2', fin: '#5c6670', tail: '#5c6670', dark: '#2f363d' }, minSize: 28, maxSize: 70, baseValue: 25, fight: 4, biteMin: 1700, biteMax: 4200 },
  { id: 'barramundi', name: 'Barramundi', habitat: 'brackish', rarity: 'rare', template: 'standard',
    palette: { body: '#9fb0b8', fin: '#66727a', tail: '#66727a', dark: '#333b42' }, minSize: 45, maxSize: 130, baseValue: 58, fight: 6, biteMin: 2000, biteMax: 5000 },
  { id: 'mangrove_jack', name: 'Mangrove Jack', habitat: 'brackish', rarity: 'rare', template: 'standard',
    palette: { body: '#a8442c', fin: '#722a18', tail: '#722a18', dark: '#3f160c' }, minSize: 30, maxSize: 80, baseValue: 52, fight: 6, biteMin: 2000, biteMax: 5000 },

  // ---------- SALTWATER (expansion) ----------
  { id: 'barracuda', name: 'Great Barracuda', habitat: 'salt', rarity: 'uncommon', template: 'long',
    palette: { body: '#9aa6ac', fin: '#5f6970', tail: '#5f6970', dark: '#2f363b' }, minSize: 60, maxSize: 150, baseValue: 42, fight: 6, biteMin: 1900, biteMax: 4700 },
  { id: 'grouper', name: 'Goliath Grouper', habitat: 'salt', rarity: 'rare', template: 'round',
    palette: { body: '#7a6f55', fin: '#4c4536', tail: '#4c4536', dark: '#2a271e' }, minSize: 80, maxSize: 240, baseValue: 95, fight: 8, biteMin: 2400, biteMax: 5600 },
  { id: 'wahoo', name: 'Wahoo', habitat: 'salt', rarity: 'rare', template: 'long',
    palette: { body: '#3a5f7a', fin: '#5a8fb0', tail: '#5a8fb0', dark: '#233a4c' }, minSize: 90, maxSize: 200, baseValue: 88, fight: 7, biteMin: 2200, biteMax: 5400 },
  { id: 'sailfish', name: 'Sailfish', habitat: 'salt', rarity: 'epic', template: 'long',
    palette: { body: '#2f5f8a', fin: '#3a7fc0', tail: '#1c4463', dark: '#152e44' }, minSize: 150, maxSize: 320, baseValue: 240, fight: 9, biteMin: 2800, biteMax: 6600 },
  { id: 'hammerhead', name: 'Hammerhead Shark', habitat: 'salt', rarity: 'epic', template: 'long',
    palette: { body: '#7a8790', fin: '#525d64', tail: '#525d64', dark: '#2c3237' }, minSize: 200, maxSize: 400, baseValue: 260, fight: 9, biteMin: 2900, biteMax: 6800 },
  { id: 'bluefin_tuna', name: 'Bluefin Tuna', habitat: 'salt', rarity: 'legendary', template: 'standard',
    palette: { body: '#2a4a6b', fin: '#f2c53c', tail: '#f2c53c', dark: '#182b3d' }, minSize: 150, maxSize: 400, baseValue: 550, fight: 10, biteMin: 3200, biteMax: 7500 },
  { id: 'pufferfish', name: 'Pufferfish', habitat: 'salt', rarity: 'uncommon', template: 'round',
    palette: { body: '#c2a85a', fin: '#8a7638', tail: '#8a7638', dark: '#4a3f1c' }, minSize: 15, maxSize: 40, baseValue: 30, fight: 2, biteMin: 1500, biteMax: 3800 },

  // ---------- DEEP SEA (expansion) ----------
  { id: 'hatchetfish', name: 'Hatchetfish', habitat: 'deepsea', rarity: 'uncommon', template: 'round',
    palette: { body: '#8a9298', fin: '#565c60', tail: '#565c60', dark: '#2c3033' }, minSize: 6, maxSize: 14, baseValue: 55, fight: 3, biteMin: 2000, biteMax: 5000 },
  { id: 'dragonfish', name: 'Dragonfish', habitat: 'deepsea', rarity: 'rare', template: 'long',
    palette: { body: '#22242e', fin: '#a8402c', tail: '#a8402c', dark: '#101119' }, minSize: 20, maxSize: 40, baseValue: 120, fight: 6, biteMin: 2400, biteMax: 5600 },
  { id: 'frilled_shark', name: 'Frilled Shark', habitat: 'deepsea', rarity: 'epic', template: 'long',
    palette: { body: '#3a3630', fin: '#24221c', tail: '#24221c', dark: '#141310' }, minSize: 90, maxSize: 200, baseValue: 280, fight: 8, biteMin: 2800, biteMax: 6400 },
  { id: 'blobfish', name: 'Blobfish', habitat: 'deepsea', rarity: 'uncommon', template: 'round',
    palette: { body: '#b57f86', fin: '#8a5c62', tail: '#8a5c62', dark: '#4f3438' }, minSize: 20, maxSize: 40, baseValue: 65, fight: 2, biteMin: 2000, biteMax: 5000 },
  { id: 'barreleye', name: 'Barreleye', habitat: 'deepsea', rarity: 'rare', template: 'round',
    palette: { body: '#2f3a44', fin: '#4fae9c', tail: '#3a4650', dark: '#161c22' }, minSize: 10, maxSize: 20, baseValue: 130, fight: 5, biteMin: 2400, biteMax: 5600 },
  { id: 'goblin_shark', name: 'Goblin Shark', habitat: 'deepsea', rarity: 'epic', template: 'long',
    palette: { body: '#c8a6a6', fin: '#9c7f7f', tail: '#9c7f7f', dark: '#5a4646' }, minSize: 100, maxSize: 230, baseValue: 300, fight: 9, biteMin: 2900, biteMax: 6800 },
  { id: 'giant_oarfish', name: 'Giant Oarfish', habitat: 'deepsea', rarity: 'legendary', template: 'long',
    palette: { body: '#b8bcc4', fin: '#c0392b', tail: '#c0392b', dark: '#5a5d63' }, minSize: 300, maxSize: 800, baseValue: 700, fight: 10, biteMin: 3400, biteMax: 8000 },

  // ---------- FRESHWATER (round 3) ----------
  { id: 'fathead_minnow', name: 'Fathead Minnow', habitat: 'fresh', rarity: 'common', template: 'round',
    palette: { body: '#9a917a', fin: '#6b6452', tail: '#6b6452', dark: '#3d3a2e' }, minSize: 4, maxSize: 10, baseValue: 4, fight: 1, biteMin: 1000, biteMax: 3000 },
  { id: 'alligator_gar', name: 'Alligator Gar', habitat: 'fresh', rarity: 'epic', template: 'long',
    palette: { body: '#6b7a52', fin: '#46502c', tail: '#46502c', dark: '#262e1a' }, minSize: 100, maxSize: 300, baseValue: 180, fight: 8, biteMin: 2600, biteMax: 6200 },

  // ---------- RIVER ----------
  { id: 'brown_trout', name: 'Brown Trout', habitat: 'river', rarity: 'common', template: 'standard',
    palette: { body: '#a8873c', fin: '#7a5f24', tail: '#7a5f24', dark: '#463612' }, minSize: 20, maxSize: 60, baseValue: 9, fight: 3, biteMin: 1200, biteMax: 3500 },
  { id: 'grayling', name: 'Grayling', habitat: 'river', rarity: 'common', template: 'standard',
    palette: { body: '#8a92a8', fin: '#b56cff', tail: '#5f667a', dark: '#3a3f4c' }, minSize: 25, maxSize: 50, baseValue: 10, fight: 3, biteMin: 1200, biteMax: 3500 },
  { id: 'chub', name: 'European Chub', habitat: 'river', rarity: 'common', template: 'round',
    palette: { body: '#9aa08a', fin: '#c96a3c', tail: '#6b7060', dark: '#3d4036' }, minSize: 20, maxSize: 55, baseValue: 8, fight: 2, biteMin: 1200, biteMax: 3500 },
  { id: 'barbel', name: 'Barbel', habitat: 'river', rarity: 'uncommon', template: 'long',
    palette: { body: '#b09a5a', fin: '#c96a3c', tail: '#c96a3c', dark: '#5c4a20' }, minSize: 30, maxSize: 90, baseValue: 20, fight: 5, biteMin: 1600, biteMax: 4200 },
  { id: 'atlantic_salmon', name: 'Atlantic Salmon', habitat: 'river', rarity: 'uncommon', template: 'standard',
    palette: { body: '#9fb0c0', fin: '#5f6f7f', tail: '#5f6f7f', dark: '#33404c' }, minSize: 45, maxSize: 120, baseValue: 26, fight: 6, biteMin: 1700, biteMax: 4400 },
  { id: 'zander', name: 'Zander', habitat: 'river', rarity: 'rare', template: 'long',
    palette: { body: '#8a9078', fin: '#565c48', tail: '#565c48', dark: '#2e3226' }, minSize: 40, maxSize: 110, baseValue: 48, fight: 6, biteMin: 2000, biteMax: 5000 },
  { id: 'golden_dorado', name: 'Golden Dorado', habitat: 'river', rarity: 'rare', template: 'standard',
    palette: { body: '#e0b030', fin: '#b57f18', tail: '#b57f18', dark: '#6b4c0c' }, minSize: 40, maxSize: 100, baseValue: 55, fight: 7, biteMin: 2000, biteMax: 5000 },
  { id: 'taimen', name: 'Siberian Taimen', habitat: 'river', rarity: 'epic', template: 'long',
    palette: { body: '#8a6b5a', fin: '#a83b3b', tail: '#a83b3b', dark: '#4a3830' }, minSize: 80, maxSize: 200, baseValue: 170, fight: 8, biteMin: 2600, biteMax: 6200 },
  { id: 'wels_catfish', name: 'Wels Catfish', habitat: 'river', rarity: 'epic', template: 'long',
    palette: { body: '#4c5248', fin: '#31352f', tail: '#31352f', dark: '#1c1f1b' }, minSize: 120, maxSize: 280, baseValue: 190, fight: 9, biteMin: 2800, biteMax: 6600 },
  { id: 'beluga_sturgeon', name: 'Beluga Sturgeon', habitat: 'river', rarity: 'legendary', template: 'long',
    palette: { body: '#7a828a', fin: '#4c5258', tail: '#4c5258', dark: '#2b2f33' }, minSize: 200, maxSize: 600, baseValue: 650, fight: 10, biteMin: 3200, biteMax: 7500 },

  // ---------- BRACKISH (round 3) ----------
  { id: 'archerfish', name: 'Archerfish', habitat: 'brackish', rarity: 'uncommon', template: 'round',
    palette: { body: '#c8c0a0', fin: '#8a8468', tail: '#8a8468', dark: '#2a2a22' }, minSize: 10, maxSize: 30, baseValue: 22, fight: 3, biteMin: 1500, biteMax: 4000 },
  { id: 'blue_crab', name: 'Blue Crab', habitat: 'brackish', rarity: 'uncommon', template: 'crab',
    palette: { body: '#3f6f9c', fin: '#c0392b', tail: '#c0392b', dark: '#20394f' }, minSize: 10, maxSize: 23, baseValue: 24, fight: 3, biteMin: 1600, biteMax: 4200 },
  { id: 'bull_shark', name: 'Bull Shark', habitat: 'brackish', rarity: 'epic', template: 'shark',
    palette: { body: '#7a8790', fin: '#525d64', tail: '#525d64', dark: '#2c3237' }, minSize: 150, maxSize: 340, baseValue: 240, fight: 9, biteMin: 2800, biteMax: 6600 },

  // ---------- SALTWATER (round 3) ----------
  { id: 'sardine', name: 'Pacific Sardine', habitat: 'salt', rarity: 'common', template: 'standard',
    palette: { body: '#9fb8c8', fin: '#6b8290', tail: '#6b8290', dark: '#37444c' }, minSize: 10, maxSize: 25, baseValue: 8, fight: 1, biteMin: 1100, biteMax: 3000 },
  { id: 'red_snapper', name: 'Red Snapper', habitat: 'salt', rarity: 'common', template: 'standard',
    palette: { body: '#c85a48', fin: '#96382a', tail: '#96382a', dark: '#521c12' }, minSize: 30, maxSize: 75, baseValue: 15, fight: 4, biteMin: 1300, biteMax: 3600 },
  { id: 'tiger_shark', name: 'Tiger Shark', habitat: 'salt', rarity: 'rare', template: 'shark',
    palette: { body: '#8a8f7a', fin: '#5c6050', tail: '#5c6050', dark: '#33362c' }, minSize: 200, maxSize: 420, baseValue: 100, fight: 9, biteMin: 2400, biteMax: 5800 },
  { id: 'ocean_sunfish', name: 'Ocean Sunfish', habitat: 'salt', rarity: 'epic', template: 'round',
    palette: { body: '#9aa2ac', fin: '#6b7178', tail: '#6b7178', dark: '#3c4046' }, minSize: 150, maxSize: 330, baseValue: 230, fight: 7, biteMin: 2800, biteMax: 6400 },

  // ---------- CORAL REEF ----------
  { id: 'blue_tang', name: 'Blue Tang', habitat: 'reef', rarity: 'common', template: 'round',
    palette: { body: '#2f6fd0', fin: '#f2d23c', tail: '#f2d23c', dark: '#12295c' }, minSize: 12, maxSize: 30, baseValue: 14, fight: 2, biteMin: 1200, biteMax: 3200 },
  { id: 'butterflyfish', name: 'Butterflyfish', habitat: 'reef', rarity: 'common', template: 'round',
    palette: { body: '#f2d23c', fin: '#2a2a2a', tail: '#e8e0c0', dark: '#2a2a2a' }, minSize: 8, maxSize: 20, baseValue: 13, fight: 1, biteMin: 1200, biteMax: 3200 },
  { id: 'parrotfish', name: 'Parrotfish', habitat: 'reef', rarity: 'common', template: 'standard',
    palette: { body: '#3fae9c', fin: '#c95d7a', tail: '#5a9bff', dark: '#1c5c52' }, minSize: 25, maxSize: 50, baseValue: 16, fight: 3, biteMin: 1300, biteMax: 3500 },
  { id: 'royal_angelfish', name: 'Royal Angelfish', habitat: 'reef', rarity: 'uncommon', template: 'round',
    palette: { body: '#e0a63c', fin: '#3f5fd0', tail: '#3f5fd0', dark: '#7a4c10' }, minSize: 15, maxSize: 25, baseValue: 28, fight: 3, biteMin: 1500, biteMax: 3800 },
  { id: 'triggerfish', name: 'Clown Triggerfish', habitat: 'reef', rarity: 'uncommon', template: 'round',
    palette: { body: '#2a2a2a', fin: '#f2d23c', tail: '#f2d23c', dark: '#f5f5f5' }, minSize: 20, maxSize: 50, baseValue: 30, fight: 4, biteMin: 1500, biteMax: 3800 },
  { id: 'lionfish', name: 'Red Lionfish', habitat: 'reef', rarity: 'rare', template: 'standard',
    palette: { body: '#c85a48', fin: '#e8e0c0', tail: '#96382a', dark: '#521c12' }, minSize: 20, maxSize: 45, baseValue: 60, fight: 5, biteMin: 1900, biteMax: 4800 },
  { id: 'moray_eel', name: 'Green Moray', habitat: 'reef', rarity: 'rare', template: 'eel',
    palette: { body: '#6b8a3c', fin: '#46601f', tail: '#46601f', dark: '#263612' }, minSize: 60, maxSize: 180, baseValue: 65, fight: 7, biteMin: 2000, biteMax: 5000 },
  { id: 'mandarinfish', name: 'Mandarinfish', habitat: 'reef', rarity: 'rare', template: 'round',
    palette: { body: '#3f8fd0', fin: '#e8781f', tail: '#3fae5c', dark: '#1c3f6b' }, minSize: 5, maxSize: 8, baseValue: 75, fight: 2, biteMin: 2000, biteMax: 5000 },
  { id: 'seahorse', name: 'Lined Seahorse', habitat: 'reef', rarity: 'rare', template: 'seahorse',
    palette: { body: '#e0b843', fin: '#b58a1f', tail: '#b58a1f', dark: '#6b4c0c' }, minSize: 8, maxSize: 15, baseValue: 70, fight: 1, biteMin: 2000, biteMax: 5200 },
  { id: 'napoleon_wrasse', name: 'Napoleon Wrasse', habitat: 'reef', rarity: 'epic', template: 'round',
    palette: { body: '#3f8a7a', fin: '#2a5fd0', tail: '#2a5fd0', dark: '#1c473e' }, minSize: 80, maxSize: 230, baseValue: 250, fight: 8, biteMin: 2600, biteMax: 6200 },
  { id: 'manta_ray', name: 'Giant Manta Ray', habitat: 'reef', rarity: 'legendary', template: 'ray',
    palette: { body: '#26303c', fin: '#141b24', tail: '#141b24', dark: '#0b0f15' }, minSize: 200, maxSize: 700, baseValue: 600, fight: 9, biteMin: 3200, biteMax: 7500 },

  // ---------- FROZEN FJORD ----------
  { id: 'polar_cod', name: 'Polar Cod', habitat: 'ice', rarity: 'common', template: 'standard',
    palette: { body: '#8a96a0', fin: '#5c666e', tail: '#5c666e', dark: '#31383d' }, minSize: 15, maxSize: 35, baseValue: 14, fight: 2, biteMin: 1300, biteMax: 3500 },
  { id: 'capelin', name: 'Capelin', habitat: 'ice', rarity: 'common', template: 'long',
    palette: { body: '#9fb0b8', fin: '#66727a', tail: '#66727a', dark: '#333b42' }, minSize: 12, maxSize: 22, baseValue: 12, fight: 1, biteMin: 1200, biteMax: 3200 },
  { id: 'arctic_char', name: 'Arctic Char', habitat: 'ice', rarity: 'uncommon', template: 'standard',
    palette: { body: '#7a8fa0', fin: '#e0743c', tail: '#e0743c', dark: '#3d4a55' }, minSize: 30, maxSize: 90, baseValue: 30, fight: 5, biteMin: 1600, biteMax: 4200 },
  { id: 'greenland_halibut', name: 'Greenland Halibut', habitat: 'ice', rarity: 'uncommon', template: 'flat',
    palette: { body: '#5c5248', fin: '#3a342c', tail: '#3a342c', dark: '#211d17' }, minSize: 40, maxSize: 110, baseValue: 34, fight: 5, biteMin: 1700, biteMax: 4400 },
  { id: 'wolffish', name: 'Atlantic Wolffish', habitat: 'ice', rarity: 'rare', template: 'long',
    palette: { body: '#4c5866', fin: '#303a45', tail: '#303a45', dark: '#1a2027' }, minSize: 60, maxSize: 150, baseValue: 70, fight: 7, biteMin: 2100, biteMax: 5200 },
  { id: 'icefish', name: 'Crocodile Icefish', habitat: 'ice', rarity: 'rare', template: 'long',
    palette: { body: '#b8ccd8', fin: '#8aa2b0', tail: '#8aa2b0', dark: '#5c7280' }, minSize: 25, maxSize: 55, baseValue: 80, fight: 4, biteMin: 2100, biteMax: 5200 },
  { id: 'arctic_skate', name: 'Arctic Skate', habitat: 'ice', rarity: 'epic', template: 'ray',
    palette: { body: '#6b6058', fin: '#463e38', tail: '#463e38', dark: '#262220' }, minSize: 60, maxSize: 180, baseValue: 210, fight: 6, biteMin: 2600, biteMax: 6200 },
  { id: 'greenland_shark', name: 'Greenland Shark', habitat: 'ice', rarity: 'legendary', template: 'shark',
    palette: { body: '#5c6660', fin: '#3a423d', tail: '#3a423d', dark: '#202522' }, minSize: 250, maxSize: 640, baseValue: 620, fight: 10, biteMin: 3200, biteMax: 7500 },

  // ---------- DEEP SEA (round 3) ----------
  { id: 'lanternfish', name: 'Lanternfish', habitat: 'deepsea', rarity: 'common', template: 'standard',
    palette: { body: '#3c4a5c', fin: '#5fd3ff', tail: '#28323e', dark: '#161d26' }, minSize: 5, maxSize: 15, baseValue: 30, fight: 2, biteMin: 1600, biteMax: 4200 },
  { id: 'bristlemouth', name: 'Bristlemouth', habitat: 'deepsea', rarity: 'common', template: 'long',
    palette: { body: '#2e3440', fin: '#1c2029', tail: '#1c2029', dark: '#10131a' }, minSize: 4, maxSize: 8, baseValue: 28, fight: 1, biteMin: 1600, biteMax: 4200 },
  { id: 'snailfish', name: 'Hadal Snailfish', habitat: 'deepsea', rarity: 'uncommon', template: 'round',
    palette: { body: '#c8b8d0', fin: '#9686a0', tail: '#9686a0', dark: '#5c5064' }, minSize: 15, maxSize: 30, baseValue: 70, fight: 2, biteMin: 2000, biteMax: 5000 },
  { id: 'vampire_squid', name: 'Vampire Squid', habitat: 'deepsea', rarity: 'rare', template: 'jelly',
    palette: { body: '#6b2c3c', fin: '#c0392b', tail: '#42101c', dark: '#2a0a12' }, minSize: 15, maxSize: 30, baseValue: 140, fight: 5, biteMin: 2400, biteMax: 5600 },
  { id: 'dumbo_octopus', name: 'Dumbo Octopus', habitat: 'deepsea', rarity: 'epic', template: 'jelly',
    palette: { body: '#c88aa0', fin: '#a05c78', tail: '#8a4a64', dark: '#54283a' }, minSize: 20, maxSize: 45, baseValue: 280, fight: 5, biteMin: 2800, biteMax: 6400 },
  { id: 'giant_squid', name: 'Giant Squid', habitat: 'deepsea', rarity: 'legendary', template: 'jelly',
    palette: { body: '#a04a3c', fin: '#c86a52', tail: '#7a3028', dark: '#461a14' }, minSize: 300, maxSize: 1200, baseValue: 800, fight: 10, biteMin: 3400, biteMax: 8000 },

  // ---------- SUNKEN WRECK ----------
  { id: 'wreckfish', name: 'Wreckfish', habitat: 'wreck', rarity: 'common', template: 'standard',
    palette: { body: '#5c5a6b', fin: '#3a3846', tail: '#3a3846', dark: '#201f28' }, minSize: 40, maxSize: 100, baseValue: 35, fight: 5, biteMin: 1800, biteMax: 4600 },
  { id: 'conger_eel', name: 'Conger Eel', habitat: 'wreck', rarity: 'uncommon', template: 'eel',
    palette: { body: '#5c6670', fin: '#3a424a', tail: '#3a424a', dark: '#20262b' }, minSize: 80, maxSize: 220, baseValue: 60, fight: 7, biteMin: 2000, biteMax: 5000 },
  { id: 'spider_crab', name: 'Giant Spider Crab', habitat: 'wreck', rarity: 'uncommon', template: 'crab',
    palette: { body: '#b0603c', fin: '#8a4426', tail: '#8a4426', dark: '#4c2412' }, minSize: 30, maxSize: 90, baseValue: 65, fight: 4, biteMin: 2000, biteMax: 5000 },
  { id: 'john_dory', name: 'John Dory', habitat: 'wreck', rarity: 'rare', template: 'round',
    palette: { body: '#8a8262', fin: '#5c563e', tail: '#5c563e', dark: '#2e2b1f' }, minSize: 25, maxSize: 65, baseValue: 90, fight: 4, biteMin: 2200, biteMax: 5400 },
  { id: 'giant_octopus', name: 'Giant Pacific Octopus', habitat: 'wreck', rarity: 'rare', template: 'jelly',
    palette: { body: '#a8503c', fin: '#7a3428', tail: '#642a20', dark: '#3a1610' }, minSize: 60, maxSize: 250, baseValue: 110, fight: 7, biteMin: 2400, biteMax: 5600 },
  { id: 'giant_isopod', name: 'Giant Isopod', habitat: 'wreck', rarity: 'epic', template: 'crab',
    palette: { body: '#8a7f8a', fin: '#5c545c', tail: '#5c545c', dark: '#332f33' }, minSize: 20, maxSize: 50, baseValue: 240, fight: 3, biteMin: 2800, biteMax: 6400 },
  { id: 'chimaera', name: 'Ghost Shark', habitat: 'wreck', rarity: 'epic', template: 'shark',
    palette: { body: '#7a8a96', fin: '#52616b', tail: '#52616b', dark: '#2c363d' }, minSize: 60, maxSize: 150, baseValue: 300, fight: 8, biteMin: 2900, biteMax: 6800 },
  { id: 'sixgill_shark', name: 'Bluntnose Sixgill', habitat: 'wreck', rarity: 'legendary', template: 'shark',
    palette: { body: '#46505c', fin: '#2c343d', tail: '#2c343d', dark: '#181d22' }, minSize: 300, maxSize: 550, baseValue: 750, fight: 10, biteMin: 3400, biteMax: 8000 },
]

// Hand-authored species plus the FishGen procedural pack.
export const FISH = [...BASE_FISH, ...GENFISH]

// Swimming behavior, DERIVED from existing stats rather than hand-tagged on
// all 127 species. Keeps the roster a pure data table and means generated
// FishGen fish get sensible behavior for free.
//   school  — small, low-rarity fish that move in loose shoals
//   predator— big fighters that hunt smaller swimmers
//   bottom  — flat/benthic body plans that hug the seabed
//   drift   — everything else (the original behavior)
const BOTTOM_TEMPLATES = new Set(['flat', 'ray', 'crab'])

export function behaviorOf(f) {
  if (BOTTOM_TEMPLATES.has(f.template)) return 'bottom'
  if (f.fight >= 8 && f.maxSize >= 150) return 'predator'
  if (f.maxSize <= 55 && (f.rarity === 'common' || f.rarity === 'uncommon')) return 'school'
  return 'drift'
}

// How a species behaves ON THE HOOK. Derived, like behaviorOf.
//   runner — long fast bursts across the track (predators)
//   sounder— dives hard for the bottom of the track (big deep fish)
//   hugger — stays low, rarely rises (benthic)
//   darter — many small twitchy hops (small schooling fish)
//   steady — the original random darting
export function fightStyleOf(f) {
  const b = behaviorOf(f)
  if (b === 'bottom') return 'hugger'
  if (b === 'predator') return 'runner'
  if ((f.habitat === 'deepsea' || f.habitat === 'wreck') && f.maxSize >= 90) return 'sounder'
  if (b === 'school') return 'darter'
  return 'steady'
}

// Spawn weight multiplier from time of day and weather. 1 = neutral.
// daylight is 0..1 (0 = deep night). Keeps atmosphere mechanically meaningful
// without tagging 127 species by hand.
export function activityMul(f, daylight, weather) {
  let m = 1
  const night = daylight < 0.35
  const rare = f.rarity === 'epic' || f.rarity === 'legendary'
  if (rare) m *= night ? 1.8 : 0.7                    // trophies prefer the dark
  if (behaviorOf(f) === 'school') m *= night ? 0.6 : 1.4   // shoals feed by day
  if (behaviorOf(f) === 'predator' && (weather === 'storm' || weather === 'blizzard')) m *= 1.9
  if (f.template === 'angler' || f.palette.lure) m *= night ? 2.2 : 0.8
  return m
}

// Bottom-dwellers can only be reached by a deep cast.
export function needsDeepCast(f) {
  return behaviorOf(f) === 'bottom'
}

export const BOSS_FISH = {
  id: 'leviathan', name: 'Leviathan (Boss)', habitat: 'deepsea', rarity: 'legendary', template: 'shark',
  palette: { body: '#1a1c23', fin: '#c0392b', tail: '#c0392b', dark: '#0a0a0d', lure: '#ff3b3b' },
  minSize: 1000, maxSize: 3000, baseValue: 10000, fight: 18, biteMin: 1000, biteMax: 2000,
  phases: [
    { at: 0,  fight: 10, markerMul: 1.0, barMul: 1.0 },
    { at: 33, fight: 14, markerMul: 1.4, barMul: 0.8 },
    { at: 66, fight: 18, markerMul: 1.8, barMul: 0.6 }
  ]
}

export function fishByZone(zoneId) {
  return FISH.filter((f) => f.habitat === zoneId)
}
