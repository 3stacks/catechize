import fs from 'node:fs'
import path from 'node:path'

import { type Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Container'
import { Cta, H2, JsonLd, Method, P, PageFrame, PageHeader, breadcrumbLd } from '@/components/ContentPage'
import { crumbsFor } from '@/components/DocContent'
import { pageForDoc, pagePath } from '@/lib/content'
import { BOOKS, chapter, citedIn, findUnit, parseRef, refLabel, refSlug, verses, type Ref } from '@/lib/library'
import { SITE_URL, appAddVerse, appDoc } from '@/lib/site'
import { VERSES, type VersePage } from '@/lib/verses'

export const verseBySlug = (slug: string) => VERSES.find((v) => refSlug(parseRef(v.id)) === slug)

const plain = (r: Ref) =>
  verses(r)
    .map((v) => v.text)
    .join(' ')

export function verseMetadata(v: VersePage): Metadata {
  const r = parseRef(v.id)
  const label = refLabel(r)
  const text = plain(r)
  const url = `/scripture/${refSlug(r)}/`
  const title = `${label} (KJV): meaning and how to memorise it`
  const quote = text.length > 110 ? `${text.slice(0, 107).replace(/\s+\S*$/, '')}…` : text
  const description = `${label} KJV: “${quote}” Read it in context, and learn it by heart, free.`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', siteName: 'Catechize' } }
}

/** The Self-Interpreting Bible chapter page, when that chapter is online. */
function sibChapter(r: Ref): string | undefined {
  try {
    const sib = JSON.parse(fs.readFileSync(path.join(process.cwd(), '..', 'public', 'sib.json'), 'utf8')) as { base: string; books: Record<string, [string, number[]]> }
    const b = sib.books[r.book]
    return b && b[1].includes(r.c) ? `${sib.base}/${b[0]}-${r.c}.html#v${r.c}-${r.v1}` : undefined
  } catch {
    return undefined
  }
}

export function VerseContent({ v }: { v: VersePage }) {
  const r = parseRef(v.id)
  const label = refLabel(r)
  const url = `/scripture/${refSlug(r)}/`
  const crumbs = crumbsFor('scripture', { name: label, href: url })
  const lines = verses(r)
  const ch = chapter(r.book, r.c)
  const from = Math.max(1, r.v1 - 3)
  const to = Math.min(ch.length, r.v2 + 3)
  const cites = citedIn(r)
  const sib = sibChapter(r)
  const others = VERSES.filter((o) => o.id !== v.id)
  const start = VERSES.indexOf(v)
  const more = [...others.slice(start), ...others.slice(0, start)].slice(0, 6)
  const cta = `Memorise ${lines.length > 1 ? 'this passage' : 'this verse'}`

  return (
    <PageFrame>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              headline: `${label} (KJV)`,
              url: SITE_URL + url,
              about: { '@type': 'CreativeWork', name: `${label}, King James Version`, text: plain(r) },
              publisher: { '@type': 'Organization', name: 'Catechize' },
            },
            breadcrumbLd(crumbs),
          ],
        }}
      />
      <PageHeader
        crumbs={crumbs}
        title={label}
        lede={
          <blockquote className="mt-2 font-display text-2xl font-medium text-slate-900 sm:text-3xl">
            {lines.map((l) => (
              <span key={l.v}>
                {lines.length > 1 && <sup className="mr-1 font-sans text-sm text-brand-600">{l.v}</sup>}
                {l.text}{' '}
              </span>
            ))}
            <footer className="mt-3 font-sans text-base font-semibold text-brand-600">{label}, King James Version</footer>
          </blockquote>
        }
      />
      <main className="py-12">
        <Container>
          <Cta href={appAddVerse(v.id)} label={cta} compact />

          <H2 id="meaning">What {label} says</H2>
          <P>{v.note}</P>

          <H2 id="context">{label} in context</H2>
          <div className="mt-6 rounded-2xl bg-slate-50 px-6 py-5 text-lg tracking-tight ring-1 ring-slate-200">
            {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => {
              const inside = n >= r.v1 && n <= r.v2
              return (
                <span key={n} className={inside ? 'font-medium text-slate-900' : 'text-slate-500'}>
                  <sup className="mr-1 text-xs text-slate-400">{n}</sup>
                  {ch[n - 1]}{' '}
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-base text-slate-600">
            {BOOKS[r.book].name} {r.c}, verses {from}–{to}.
            {sib && (
              <>
                {' '}
                Read the whole chapter with John Brown’s notes in the{' '}
                <a href={sib} className="font-medium text-brand-600 underline">
                  Self-Interpreting Bible
                </a>
                .
              </>
            )}
          </p>

          {cites.length > 0 && (
            <>
              <H2 id="catechisms">{label} in the catechisms</H2>
              <P>
                The Reformation catechisms and confessions cite {label} {cites.length === 1 ? 'once' : `${cites.length} times`} as a proof text.
              </P>
              <ul role="list" className="mt-6 divide-y divide-slate-200 rounded-2xl ring-1 ring-slate-200">
                {cites.map((c) => {
                  const u = findUnit(c.docId, c.unitId)
                  const page = pageForDoc(c.docId)
                  const href = page ? `${pagePath(page)}#${c.unitId}` : appDoc(c.docId, c.unitId)
                  return (
                    <li key={c.unitId} className="px-6 py-4">
                      <Link href={href} className="font-semibold text-brand-600 hover:text-brand-800">
                        {c.label}
                      </Link>
                      {u && <p className="mt-1 text-base tracking-tight text-slate-700">{u.prompt.endsWith('?') ? u.prompt : u.text.length > 180 ? `${u.text.slice(0, 177).replace(/\s+\S*$/, '')}…` : u.text}</p>}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <H2 id="memorise">How to memorise {label}</H2>
          <P>Catechize breaks the verse into clauses and teaches each clause in four steps. Then it brings each clause back just before you forget it.</P>
          <Method name="the verse" />

          <div className="mt-16">
            <Cta href={appAddVerse(v.id)} label={cta} />
          </div>

          <H2 id="more">More verses to memorise</H2>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((o) => {
              const or = parseRef(o.id)
              return (
                <li key={o.id}>
                  <Link href={`/scripture/${refSlug(or)}/`} className="block rounded-2xl px-5 py-4 font-medium text-slate-900 ring-1 ring-slate-200 hover:ring-brand-300">
                    {refLabel(or)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </Container>
      </main>
    </PageFrame>
  )
}
