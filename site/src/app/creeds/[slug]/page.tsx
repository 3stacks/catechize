import { notFound } from 'next/navigation'

import { DocContent, docMetadata } from '@/components/DocContent'
import { DOC_PAGES, docPage } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return DOC_PAGES.filter((d) => d.section === 'creeds').map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = docPage('creeds', (await params).slug)
  return d ? docMetadata(d) : {}
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const d = docPage('creeds', (await params).slug)
  if (!d) notFound()
  return <DocContent d={d} />
}
