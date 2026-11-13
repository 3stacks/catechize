import { type MetadataRoute } from 'next'

import { DOC_PAGES, SECTIONS, pagePath, type Section } from '@/lib/content'
import { parseRef, refSlug } from '@/lib/library'
import { SITE_URL } from '@/lib/site'
import { VERSES } from '@/lib/verses'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    '/docs/self-hosting/',
    '/privacy/',
    ...(Object.keys(SECTIONS) as Section[]).map((s) => `/${s}/`),
    ...DOC_PAGES.map(pagePath),
    ...VERSES.map((v) => `/scripture/${refSlug(parseRef(v.id))}/`),
  ]
  return paths.map((p) => ({ url: SITE_URL + p, changeFrequency: 'monthly', priority: p === '/' ? 1 : 0.7 }))
}
