import { notFound } from 'next/navigation'

import { DocContent, docMetadata } from '@/components/DocContent'
import { VerseContent, verseBySlug, verseMetadata } from '@/components/VerseContent'
import { DOC_PAGES, docPage } from '@/lib/content'
import { parseRef, refSlug } from '@/lib/library'
import { VERSES } from '@/lib/verses'

// The Ten Commandments page, and one page for each verse in lib/verses.ts.
export const dynamicParams = false

export function generateStaticParams() {
  return [...DOC_PAGES.filter((d) => d.section === 'scripture').map((d) => d.slug), ...VERSES.map((v) => refSlug(parseRef(v.id)))].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = docPage('scripture', slug)
  if (d) return docMetadata(d)
  const v = verseBySlug(slug)
  return v ? verseMetadata(v) : {}
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = docPage('scripture', slug)
  if (d) return <DocContent d={d} />
  const v = verseBySlug(slug)
  if (!v) notFound()
  return <VerseContent v={v} />
}
