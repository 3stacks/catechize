import Link from 'next/link'

import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Footer } from '@/components/Footer'
import { GridPattern } from '@/components/GridPattern'
import { SITE_URL } from '@/lib/site'

export interface Crumb {
  name: string
  href: string
}

/** The header of a content page: breadcrumbs, title and lede. */
export function PageHeader({ crumbs, title, lede }: { crumbs: Crumb[]; title: string; lede?: React.ReactNode }) {
  return (
    <header className="bg-slate-100 pt-16 pb-12 sm:pt-20">
      <Container>
        <nav aria-label="Breadcrumb">
          <ol role="list" className="flex flex-wrap gap-x-2 text-base font-medium text-slate-500">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex gap-x-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                <Link href={c.href} className="hover:text-slate-900">
                  {c.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">{title}</h1>
        {lede && <div className="mt-4 text-xl tracking-tight text-slate-600">{lede}</div>}
      </Container>
    </header>
  )
}

/**
 * The call to action, at the start and at the end of each page: the brand
 * panel with the grid, as in the homepage hero.
 */
export function Cta({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
  return (
    <aside className="relative overflow-hidden rounded-3xl rounded-br-6xl bg-brand-600 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
      <div className="absolute inset-0 text-white/10">
        <GridPattern x="100%" y="100%" patternTransform="translate(112 64)" />
      </div>
      <div className="relative">
        <p className={compact ? 'font-display text-2xl font-bold' : 'font-display text-3xl font-extrabold sm:text-4xl'}>Use the most effective tool to remember it.</p>
        {!compact && (
          <p className="mt-3 max-w-2xl text-lg tracking-tight text-white/85">
            Hearers teaches one clause at a time. You read it, trace it and recall it from the first letters. Each clause comes back just before you forget it.
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button href={href} color="white" data-event="Memorise CTA" data-event-label={compact ? 'start' : 'end'}>
            {label}
          </Button>
          <span className="text-base tracking-tight text-white/80">Free. No account. Works offline.</span>
        </div>
      </div>
    </aside>
  )
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-14 scroll-mt-8 font-display text-3xl font-bold tracking-tight text-slate-900">
      {children}
    </h2>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg tracking-tight text-slate-700">{children}</p>
}

/** The four steps of the method, for the "how to memorise" section. */
export function Method({ name }: { name: string }) {
  const steps: [string, string][] = [
    ['Read', `Read ${name} with the clauses marked. Listen to it read aloud.`],
    ['Trace', 'Type the first letter of each word, with the words shown faintly.'],
    ['Fade', 'Half of the words go. Type the text again, and fill the gaps from memory.'],
    ['Recall', 'All the words go. Type it or say it aloud. Each clause gets its own grade and its own review date.'],
  ]
  return (
    <ol role="list" className="mt-6 grid gap-4 sm:grid-cols-2">
      {steps.map(([title, text], i) => (
        <li key={title} className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
          <p className="font-mono text-sm text-slate-500">0{i + 1}</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-900">{title}</p>
          <p className="mt-2 text-base tracking-tight text-slate-600">{text}</p>
        </li>
      ))}
    </ol>
  )
}

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-6 divide-y divide-slate-200 rounded-2xl ring-1 ring-slate-200">
      {items.map(([q, a]) => (
        <div key={q} className="px-6 py-5">
          <dt className="font-display text-xl font-bold text-slate-900">{q}</dt>
          <dd className="mt-2 text-base tracking-tight text-slate-700">{a}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Structured data for search engines. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE_URL + c.href })),
  }
}

export function faqLd(items: [string, string][]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
