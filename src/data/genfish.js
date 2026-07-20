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
// Pack 2 provenance: GET /api/pack?n=28&habitats=river,reef,ice,wreck
//   &seed_prefix=v2&include=grids   (fishgen v2, generator 1)
//   Fills the four zones the original pack could not reach.
import pack from './genfish-pack.json'
import grids from './genfish-grids.json'
import pack2 from './genfish-pack2.json'
import { TEMPLATES, registerGrids } from '../pixel/sprites.js'

// Register generated char-grids so drawFish can resolve them by name.
// This must run before anything calls drawFish with a generated fish; importing
// this module from fish.js (which every consumer imports) guarantees that.
Object.assign(TEMPLATES, pack.templates)
Object.assign(TEMPLATES, pack2.templates)

// Exact-pixel grids, remapped onto fish id so sprites.js can look them up.
// The two packs key their grids DIFFERENTLY:
//   pack 1 — separate file, keyed by fish SEED
//   pack 2 — inline `grids`, keyed by TEMPLATE id
// Both are optional; a missing or partial grid just falls back to the flat
// char template rather than breaking the build.
const byId = {}
for (const f of pack.fish) {
  const g = grids[f.seed]
  if (Array.isArray(g) && g.length) byId[f.id] = g
}
for (const f of pack2.fish) {
  const g = (pack2.grids || {})[f.template]
  if (Array.isArray(g) && g.length) byId[f.id] = g
}
registerGrids(byId)

// Guard against an id collision between packs silently overwriting a species.
const seen = new Set()
export const GENFISH = [...pack.fish, ...pack2.fish].filter((f) => {
  if (seen.has(f.id)) return false
  seen.add(f.id)
  return true
})

export const GRID_COUNT = Object.keys(byId).length
export const GEN_META = { generator: pack.generator, prefix: pack.prefix, count: GENFISH.length }
