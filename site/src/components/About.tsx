import Link from 'next/link'

import { GridPattern } from '@/components/GridPattern'
import { SectionHeading } from '@/components/SectionHeading'
import { KOFI_URL, REPO_URL } from '@/lib/site'

function CupIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2" />
    </svg>
  )
}

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="relative scroll-mt-14 pt-8 pb-3 sm:scroll-mt-32 sm:pt-10 sm:pb-16 lg:pt-16"
    >
      <div className="absolute inset-x-0 top-1/2 bottom-0 mask-[linear-gradient(transparent,white)] text-slate-900/10">
        <GridPattern x="50%" y="100%" />
      </div>
      <div className="relative mx-auto max-w-5xl sm:px-6">
        <div className="bg-slate-50 sm:rounded-6xl">
          <div className="px-4 py-10 sm:px-10 sm:py-16 md:py-20 lg:px-20 lg:py-32">
            <SectionHeading number="5" id="about-title">
              About
            </SectionHeading>
            <p className="mt-8 font-display text-4xl font-extrabold tracking-tight text-pretty text-slate-900 sm:text-6xl">
              <span className="block text-brand-600">Free, and it stays free.</span>{' '}
              No advertisements, no accounts, no tracking.
            </p>
            <p className="mt-4 text-lg tracking-tight text-slate-700">
              Luke Boyle makes Catechize. It is free for anyone to use. The
              source code becomes open source soon, at{' '}
              <Link href={REPO_URL} className="font-medium text-brand-600 hover:text-brand-800">
                github.com/3stacks/catechize
              </Link>
              .
            </p>
            <p className="mt-4 text-lg tracking-tight text-slate-700">
              If Catechize helps you, you can support it on Ko-fi. The support
              pays for the server and for the time to add more texts.
            </p>
            <p className="mt-8">
              <Link
                href={KOFI_URL}
                className="inline-flex items-center text-base font-medium tracking-tight text-slate-900"
              >
                <CupIcon className="h-10 w-10" />
                <span className="ml-4">Support Catechize on Ko-fi</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
