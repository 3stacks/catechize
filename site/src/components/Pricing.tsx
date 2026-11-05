import clsx from 'clsx'

import { Button } from '@/components/Button'
import { CheckIcon } from '@/components/CheckIcon'
import { Container } from '@/components/Container'
import { GridPattern } from '@/components/GridPattern'
import { SectionHeading } from '@/components/SectionHeading'
import { APP_URL, SELF_HOST_URL } from '@/lib/site'

function Plan({
  name,
  description,
  features,
  href,
  action,
  featured = false,
}: {
  name: string
  description: string
  features: Array<string>
  href: string
  action: string
  featured?: boolean
}) {
  return (
    <div
      className={clsx(
        'relative px-4 py-16 sm:rounded-5xl sm:px-10 md:py-12 lg:px-12',
        featured && 'bg-brand-600 sm:shadow-lg',
      )}
    >
      {featured && (
        <div className="absolute inset-0 mask-[linear-gradient(white,transparent)] text-white/10">
          <GridPattern x="50%" y="50%" />
        </div>
      )}
      <div className="relative flex flex-col">
        <h3
          className={clsx(
            'mt-7 text-lg font-semibold tracking-tight',
            featured ? 'text-white' : 'text-slate-900',
          )}
        >
          {name}
        </h3>
        <p
          className={clsx(
            'mt-2 text-lg tracking-tight',
            featured ? 'text-white' : 'text-slate-600',
          )}
        >
          {description}
        </p>
        <p
          className={clsx(
            'order-first font-display text-7xl font-bold tracking-tight',
            featured ? 'text-white' : 'text-slate-900',
          )}
        >
          Free
        </p>
        <div className="order-last mt-8">
          <ul
            role="list"
            className={clsx(
              '-my-2 divide-y text-base tracking-tight',
              featured
                ? 'divide-white/10 text-white'
                : 'divide-slate-200 text-slate-900',
            )}
          >
            {features.map((feature) => (
              <li key={feature} className="flex py-2">
                <CheckIcon
                  className={clsx(
                    'h-8 w-8 flex-none',
                    featured ? 'fill-white' : 'fill-slate-600',
                  )}
                />
                <span className="ml-4">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          href={href}
          color={featured ? 'white' : 'slate'}
          className="mt-8"
        >
          {action}
        </Button>
      </div>
    </div>
  )
}

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-14 pt-16 pb-8 sm:scroll-mt-32 sm:pt-20 sm:pb-10 lg:pt-32 lg:pb-16"
    >
      <Container>
        <SectionHeading number="4" id="pricing-title">
          Free
        </SectionHeading>
        <p className="mt-8 font-display text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          Free, two ways
        </p>
        <p className="mt-4 max-w-xl text-lg tracking-tight text-slate-600">
          Every feature is in both. The difference is where your progress
          lives.
        </p>
      </Container>
      <div className="mx-auto mt-16 max-w-5xl lg:px-6">
        <div className="grid bg-slate-50 sm:px-6 sm:pb-16 md:grid-cols-2 md:rounded-6xl md:px-8 md:pt-16 lg:p-20">
          <Plan
            featured
            name="In your browser"
            description="Open the app and start. Nothing to install, and no account."
            href={APP_URL}
            action="Open the app"
            features={[
              'Every document and every feature',
              'Progress stays in this browser',
              'Works offline after the first visit',
              'Export a backup, and import it on another device',
            ]}
          />
          <Plan
            name="Self-hosted"
            description="Run Catechize on your own server, and keep every device in step."
            href={SELF_HOST_URL}
            action="Read the guide"
            features={[
              'One Docker container, no other services',
              'Your server keeps your progress in SQLite',
              'Your phone and your computer sync',
              'Still works offline. When you reconnect, changes sync',
            ]}
          />
        </div>
      </div>
    </section>
  )
}
