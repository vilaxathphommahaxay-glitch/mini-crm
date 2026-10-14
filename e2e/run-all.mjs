// Runs every spec in order (they build on the seeded demo data) and prints a summary.
// Needs a freshly seeded app:  docker compose down -v && docker compose up -d
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./specs/', import.meta.url))
const only = process.argv[2]
const specs = readdirSync(dir)
  .filter((f) => f.endsWith('.mjs') && (!only || f.includes(only)))
  .sort()

let failed = 0
for (const spec of specs) {
  console.log(`\n▶ ${spec}`)
  const { status } = spawnSync(process.execPath, [`${dir}${spec}`], { stdio: 'inherit' })
  if (status !== 0) failed++
}
console.log(`\n${specs.length - failed}/${specs.length} specs passed`)
process.exit(failed ? 1 : 0)
