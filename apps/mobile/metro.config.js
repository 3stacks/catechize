// The app shares its logic with the web app: the data model, Scripture
// references, chunking, grading, FSRS scheduling, stats, sync and backups are
// in ../../src and ../../shared. Metro must watch those folders.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const config = getDefaultConfig(__dirname)
config.watchFolders = [path.join(root, 'src'), path.join(root, 'shared')]

// Two web modules touch the browser. The app has its own copy of each.
const swaps = new Map([
  [path.join(root, 'src/data/files.ts'), path.join(__dirname, 'src/shims/data-files.ts')],
  [path.join(root, 'src/store/host.ts'), path.join(__dirname, 'src/shims/sync-host.ts')],
])

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // A package that the shared code imports (react, dexie, ts-fsrs) comes from
  // this app's node_modules, so there is one copy of each.
  const shared = !context.originModulePath.startsWith(__dirname + path.sep)
  const bare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName)
  const from = shared && bare ? { ...context, originModulePath: path.join(__dirname, 'index.ts') } : context
  const result = from.resolveRequest(from, moduleName, platform)
  if (result.type === 'sourceFile' && swaps.has(result.filePath)) return { type: 'sourceFile', filePath: swaps.get(result.filePath) }
  return result
}

module.exports = config
