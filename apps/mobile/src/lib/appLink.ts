// Links between the apps of the suite. A link to the website of a sibling app
// opens that app when it is on the device. The same file is in each app:
// Precentor, Hearers, Covenant Household and Haddington Bible.

/** The URL scheme of each app, by the host of its website. */
const SCHEMES: Record<string, string> = {
  'hearers.app': 'hearers',
  'precentor.app': 'precentor',
  'haddingtonbible.org': 'haddingtonbible',
  'covenanthousehold.app': 'covenanthousehold',
}

/**
 * The paths that each app can open. A link to any other page (for example a
 * privacy page) stays a web link. Version 1.0 of each app opens these paths.
 */
const PATHS: Record<string, RegExp> = {
  hearers: /^(|add\/[^/]+|unit\/[^/]+\/[^/]+)$/,
  precentor: /^(|psalm\/\d{3}b?)$/,
  haddingtonbible: /^(|[a-z0-9-]+-\d+)$/,
  covenanthousehold: /^$/,
}

/**
 * The URL that opens a sibling app at the same place as `url`, or undefined
 * when `url` is not a link into a sibling app. `self` is the scheme of the
 * app that asks, so that an app does not open itself.
 *
 * "https://hearers.app/app/#/add/Ps.23" → "hearers://add/Ps.23"
 * "https://precentor.app/psalm/023?tune=dundee" → "precentor://psalm/023?tune=dundee"
 * "https://haddingtonbible.org/psalms-23#v23-1" → "haddingtonbible://psalms-23#v23-1"
 */
export function appLink(url: string, self: string): string | undefined {
  const m = /^https:\/\/(?:www\.)?([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url)
  if (!m) return undefined
  const scheme = SCHEMES[m[1]]
  if (!scheme || scheme === self) return undefined
  // The web app of Hearers is at /app/.
  let path = m[2].replace(/^\/app(?=\/|$)/, '')
  let query = m[3] ?? ''
  let hash = m[4] ?? ''
  // A hash route ("#/add/Ps.23", "#/psalm/023?tune=dundee") is the path in the app.
  if (hash.startsWith('#/')) {
    const route = hash.slice(1)
    const q = route.indexOf('?')
    path = q < 0 ? route : route.slice(0, q)
    query = q < 0 ? query : route.slice(q)
    hash = ''
  }
  path = path.replace(/^\/+|\/+$/g, '')
  if (!PATHS[scheme].test(path)) return undefined
  return `${scheme}://${path}${query}${hash}`
}
