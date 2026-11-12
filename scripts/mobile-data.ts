// Copy the static data into the mobile app, so that the app works with no
// connection:
//
//   public/data/**  →  apps/mobile/data/**   (not cited.json: only the Self-Interpreting Bible reads it)
//   public/sib.json →  apps/mobile/data/sib.json
//
// apps/mobile/data/files.ts maps each path to a require(). Metro puts a file in
// the bundle only when a require() names it. Git does not keep apps/mobile/data.
// The mobile app runs this script after each install on Expo Build
// (eas-build-post-install), and `npm run mobile` runs it before Expo starts.
//
// Node 24 runs this TypeScript file directly. It uses only node: modules,
// because Expo Build installs the mobile app and not the root package.
//
//   node scripts/mobile-data.ts

import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const from = join(root, 'public/data')
const to = join(root, 'apps/mobile/data')

const walk = (dir: string): string[] =>
  readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? walk(path) : name.endsWith('.json') && path !== join(from, 'cited.json') ? [path] : []
    })

rmSync(to, { recursive: true, force: true })
const paths: string[] = []
for (const file of walk(from)) {
  const path = relative(from, file).split('\\').join('/')
  mkdirSync(join(to, path, '..'), { recursive: true })
  copyFileSync(file, join(to, path))
  paths.push(path)
}
copyFileSync(join(root, 'public/sib.json'), join(to, 'sib.json'))
paths.push('sib.json')

const requires = paths.map((path) => `  '${path}': () => require('./${path}'),`).join('\n')
writeFileSync(
  join(to, 'files.ts'),
  `// Written by scripts/mobile-data.ts. Do not edit.\n/* eslint-disable */\nexport const files: Record<string, () => unknown> = {\n${requires}\n}\n`,
)

console.log(`Mobile data: ${paths.length} files in apps/mobile/data/.`)
