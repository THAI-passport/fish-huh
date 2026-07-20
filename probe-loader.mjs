// Dev-only. Lets `node probe.mjs` resolve bare `import x from './y.json'`,
// which Vite supports natively but Node requires an import attribute for.
// Used as: node --import ./probe-loader.mjs probe.mjs
// This exists so the probe can load the REAL module graph (fish.js →
// genfish.js → sprites.js) and thus actually verify template-registration
// order, rather than simulating it.
import { register } from 'node:module'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      import { readFile } from 'node:fs/promises'
      export async function load(url, context, next) {
        if (url.startsWith('file:') && url.endsWith('.json')) {
          const src = await readFile(new URL(url), 'utf8')
          return { format: 'module', shortCircuit: true, source: 'export default ' + src }
        }
        return next(url, context)
      }
    `)
)
