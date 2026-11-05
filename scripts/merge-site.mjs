// Put the built app (dist/) under the built homepage (site/out/app/), so one
// folder holds the public site. Run by `npm run site`.
import { cpSync, existsSync, rmSync } from 'node:fs'

if (!existsSync('dist/index.html')) throw new Error('dist/ is missing: run `npm run build` first')
if (!existsSync('site/out/index.html')) throw new Error('site/out/ is missing: run `npm --prefix site run build` first')
rmSync('site/out/app', { recursive: true, force: true })
cpSync('dist', 'site/out/app', { recursive: true })
console.log('site/out/ holds the homepage, and site/out/app/ holds the app')
