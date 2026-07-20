// FishGen procedural species (Mode 1 — static pack import).
//
// genfish-pack.json is the COMMITTED SOURCE OF TRUTH for these fish. Do not
// regenerate it casually: fish identity = seed + FishGen GENERATOR_VERSION, and
// the player's dex is keyed by fish id. Re-fetching with a different prefix/n —
// or against a bumped generator — produces DIFFERENT fish and orphans saved
// dex entries. Adding fish is save-safe; removing or renaming them is not.
//
// Pack provenance: GET /api/pack?n=24&prefix=reef  (fishgen v1.1-service, generator 1)
// Verified: canonical SHA-256 a69875bb8591185f7da66f731b7ded2ae927a53c7ba42b3110f6fe2a6d55367f
import pack from './genfish-pack.json'
import grids from './genfish-grids.json'
import { TEMPLATES, registerGrids } from '../pixel/sprites.js'

// Register generated char-grids so drawFish can resolve them by name.
// This must run before anything calls drawFish with a generated fish; importing
// this module from fish.js (which every consumer imports) guarantees that.
Object.assign(TEMPLATES, pack.templates)

// Exact-pixel grids, keyed by SEED in the fetched file, remapped to fish id.
// genfish-grids.json is optional: an empty {} simply means every generated fish
// falls back to its flat char template, so a missing/partial file degrades
// gracefully instead of breaking the build.
const byId = {}
for (const f of pack.fish) {
  const g = grids[f.seed]
  if (Array.isArray(g) && g.length) byId[f.id] = g
}
registerGrids(byId)

export const GRID_COUNT = Object.keys(byId).length
export const GENFISH = pack.fish
export const GEN_META = { generator: pack.generator, prefix: pack.prefix, count: pack.count }
