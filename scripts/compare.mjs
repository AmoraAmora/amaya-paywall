// Pixel diff of browser screenshots vs Figma exports.
// Usage: node scripts/compare.mjs [figmaDir=figma-screens/Paywall] [webDir=.screens]
// Writes <webDir>/compare-<name>.png as [Figma | Web | Diff] and prints the match %.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const [figmaDir = 'figma-screens/Paywall', webDir = '.screens'] = process.argv.slice(2)
const names = ['Default', 'Loading', 'Error', 'Purchasing', 'Success']

for (const name of names) {
  const fPath = `${figmaDir}/${name}.png`
  const wPath = `${webDir}/${name}.png`
  if (!existsSync(fPath) || !existsSync(wPath)) continue
  const a = PNG.sync.read(readFileSync(fPath))
  const b = PNG.sync.read(readFileSync(wPath))
  const { width, height } = a
  if (b.width !== width || b.height !== height) {
    console.log(`${name}: size mismatch figma ${width}x${height} vs web ${b.width}x${b.height}`)
    continue
  }
  const diff = new PNG({ width, height })
  const bad = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 })
  const pct = (100 - (bad / (width * height)) * 100).toFixed(2)
  console.log(`${name.padEnd(11)} match ${pct}%  (${bad} px differ)`)

  const out = new PNG({ width: width * 3 + 16, height })
  out.data.fill(255)
  PNG.bitblt(a, out, 0, 0, width, height, 0, 0)
  PNG.bitblt(b, out, 0, 0, width, height, width + 8, 0)
  PNG.bitblt(diff, out, 0, 0, width, height, width * 2 + 16, 0)
  writeFileSync(`${webDir}/compare-${name}.png`, PNG.sync.write(out))
}
