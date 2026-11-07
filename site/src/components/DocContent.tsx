import { type Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Container'
import { Cta, Faq, H2, JsonLd, Method, P, PageFrame, PageHeader, breadcrumbLd, faqLd, type Crumb } from '@/components/ContentPage'
import { DOC_PAGES, SECTIONS, pagePath, type DocPage, type Section } from '@/lib/content'
import { loadDoc, parseRef, refLabel, refSlug, type Unit } from '@/lib/library'
import { SITE_URL, appDoc } from '@/lib/site'
import { VERSES } from '@/lib/verses'

export const crumbsFor = (section: Section, page?: { name: string; href: string }): Crumb[] => [
  { name: 'Catechize', href: '/?home' },
  { name: SECTIONS[section].heading, href: `/${section}/` },
  ...(page ? [page] : []),
]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function docMetadata(d: DocPage): Metadata {
  const url = pagePath(d)
  return {
    title: d.title,
    description: d.description,
    alternates: { canonical: url },
    openGraph: { title: d.title, description: d.description, url, type: 'article', siteName: 'Catechize' },
  }
}

/** Long documents show each group folded, with the first group open. */
const FOLD_AFTER = 40

function UnitText({ docId, kind, u }: { docId: string; kind: string; u: Unit }) {
  const question = kind === 'catechism' && u.prompt.endsWith('?')
  return (
    <div id={u.id} className="scroll-mt-8 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-semibold text-slate-900">
          <span className="mr-2 font-mono text-sm text-brand-600">{u.ref}</span>
          {question ? u.prompt : null}
        </p>
        <a href={appDoc(docId, u.id)} className="flex-none text-sm font-medium text-brand-600 hover:text-brand-800">
          Learn this <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
      <p className="mt-1 text-lg tracking-tight text-slate-700">{u.text}</p>
    </div>
  )
}

function FullText({ d }: { d: DocPage }) {
  const doc = loadDoc(d.docId)
  const kind = doc.kind
  const units = new Map(doc.units.map((u) => [u.id, u]))
  const fold = doc.units.length > FOLD_AFTER
  return (
    <div className="mt-6 space-y-6">
      {doc.groups.slice(0, d.groupsShown).map((g, i) => {
        const body = (
          <div className="divide-y divide-slate-200">
            {g.units.map((id) => (
              <UnitText key={id} docId={d.docId} kind={kind} u={units.get(id)!} />
            ))}
          </div>
        )
        return fold ? (
          <details key={g.title} open={i === 0} className="group rounded-2xl px-6 py-2 ring-1 ring-slate-200">
            <summary className="cursor-pointer py-3 font-display text-xl font-bold text-slate-900">{g.title}</summary>
            {body}
          </details>
        ) : (
          <section key={g.title}>
            {doc.groups.length > 1 && <h3 className="font-display text-xl font-bold text-slate-900">{g.title}</h3>}
            {body}
          </section>
        )
      })}
      {d.groupsShown && d.groupsShown < doc.groups.length && (
        <div className="rounded-2xl bg-slate-50 px-6 py-5 ring-1 ring-slate-200">
          <p className="text-base tracking-tight text-slate-700">The page shows the first {d.groupsShown} parts. The app has all {doc.units.length} paragraphs:</p>
          <ul role="list" className="mt-3 columns-1 gap-8 text-base text-slate-600 sm:columns-2">
            {doc.groups.slice(d.groupsShown).map((g) => (
              <li key={g.title}>
                <a href={appDoc(d.docId, g.units[0])} className="hover:text-brand-600">
                  {g.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-slate-500">
        Source: {doc.source.url ? <a href={doc.source.url} className="underline">{doc.source.name}</a> : doc.source.name} ({doc.source.license}).
      </p>
    </div>
  )
}

export function DocContent({ d }: { d: DocPage }) {
  const crumbs = crumbsFor(d.section, { name: cap(d.name), href: pagePath(d) })
  const label = `Memorise ${d.short ?? d.name}`
  const related = DOC_PAGES.filter((o) => o.section === d.section && o.docId !== d.docId)
  return (
    <PageFrame>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'Article', headline: d.title, description: d.description, url: SITE_URL + pagePath(d), publisher: { '@type': 'Organization', name: 'Catechize' } },
            breadcrumbLd(crumbs),
            faqLd(d.faq),
          ],
        }}
      />
      <PageHeader crumbs={crumbs} title={cap(d.name)} lede={<p>{d.lede}</p>} />
      <main className="py-12">
        <Container>
          <Cta href={appDoc(d.docId)} label={label} compact />

          <dl className="mt-12 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {d.facts.map(([k, v]) => (
              <div key={k} className="border-l-2 border-brand-200 pl-4">
                <dt className="text-sm font-medium text-slate-500">{k}</dt>
                <dd className="text-base font-medium tracking-tight text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          <H2 id="about">What is {d.name}?</H2>
          {d.about.map((t) => (
            <P key={t}>{t}</P>
          ))}

          <H2 id="history">History</H2>
          {d.history.map((t) => (
            <P key={t}>{t}</P>
          ))}

          <H2 id="outline">What it teaches</H2>
          <ul role="list" className="mt-6 space-y-4">
            {d.outline.map(([t, x]) => (
              <li key={t} className="rounded-2xl bg-slate-50 px-6 py-5 ring-1 ring-slate-200">
                <p className="font-display text-xl font-bold text-slate-900">{t}</p>
                <p className="mt-1 text-base tracking-tight text-slate-600">{x}</p>
              </li>
            ))}
          </ul>

          <H2 id="memorise">How to memorise {d.short ?? d.name}</H2>
          <P>Catechize breaks each answer into clauses and teaches each clause in four steps.</P>
          <Method name="the text" />

          <H2 id="text">The full text</H2>
          <FullText d={d} />

          <H2 id="faq">Questions</H2>
          <Faq items={d.faq} />

          <div className="mt-16">
            <Cta href={appDoc(d.docId)} label={label} />
          </div>

          {related.length > 0 && (
            <>
              <H2 id="more">More from {SECTIONS[d.section].heading === 'Scripture' ? 'Scripture' : `the ${SECTIONS[d.section].heading.toLowerCase()}`}</H2>
              <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2">
                {related.map((o) => (
                  <li key={o.docId}>
                    <Link href={pagePath(o)} className="block rounded-2xl px-6 py-4 font-medium text-slate-900 ring-1 ring-slate-200 hover:ring-brand-300">
                      {cap(o.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Container>
      </main>
    </PageFrame>
  )
}

export function sectionMetadata(section: Section): Metadata {
  const s = SECTIONS[section]
  return { title: s.title, description: s.description, alternates: { canonical: `/${section}/` }, openGraph: { title: s.title, description: s.description, url: `/${section}/` } }
}

export function SectionIndex({ section }: { section: Section }) {
  const s = SECTIONS[section]
  const crumbs = crumbsFor(section)
  const pages = DOC_PAGES.filter((d) => d.section === section)
  return (
    <PageFrame>
      <JsonLd data={{ '@context': 'https://schema.org', ...breadcrumbLd(crumbs) }} />
      <PageHeader crumbs={crumbs} title={s.title} lede={<p>{s.intro}</p>} />
      <main className="py-12">
        <Container>
          <ul role="list" className="space-y-4">
            {pages.map((d) => (
              <li key={d.docId}>
                <Link href={pagePath(d)} className="block rounded-2xl px-6 py-5 ring-1 ring-slate-200 hover:ring-brand-300">
                  <p className="font-display text-2xl font-bold text-slate-900">{cap(d.name)}</p>
                  <p className="mt-1 text-base tracking-tight text-slate-600">{d.description}</p>
                </Link>
              </li>
            ))}
          </ul>
          {section === 'scripture' && (
            <>
              <H2 id="verses">Verses to memorise</H2>
              <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {VERSES.map((v) => {
                  const r = parseRef(v.id)
                  return (
                    <li key={v.id}>
                      <Link href={`/scripture/${refSlug(r)}/`} className="block rounded-2xl px-5 py-4 font-medium text-slate-900 ring-1 ring-slate-200 hover:ring-brand-300">
                        {refLabel(r)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <div className="mt-16">
            <Cta href="/app/" label="Open the app" />
          </div>
        </Container>
      </main>
    </PageFrame>
  )
}
