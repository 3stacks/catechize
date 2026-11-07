import { CheckIcon } from '@/components/CheckIcon'
import { Container } from '@/components/Container'
import { APP_URL } from '@/lib/site'

export function Introduction() {
  return (
    <section
      id="introduction"
      aria-label="Introduction"
      className="pt-20 pb-16 sm:pb-20 md:pt-36 lg:py-32"
    >
      <Container className="text-lg tracking-tight text-slate-700">
        <p className="font-display text-4xl font-bold tracking-tight text-slate-900">
          Flashcards fail on long answers. Hearers learns them in parts, and
          then puts the parts back together.
        </p>
        <p className="mt-4">
          A flashcard tests a whole answer. In a long answer, one missed phrase
          fails the card. The schedule is then always wrong, and the answer
          never sticks.
        </p>
        <p className="mt-4">
          Hearers splits each answer into clauses of about eight words. Each
          clause has its own schedule. When every clause is stable, you recite
          the whole answer with nothing on the screen.
        </p>
        <ul role="list" className="mt-8 space-y-3">
          {[
            'Type the first letter of each word, or say the answer aloud',
            'Tap a phrase to read its proof texts in the King James Version',
            'Reformed and Lutheran catechisms, with the creeds of the early church',
            'Works offline, and installs on your phone like an app',
            'No account, no advertisements, no cookies',
          ].map((feature) => (
            <li key={feature} className="flex">
              <CheckIcon className="h-8 w-8 flex-none fill-brand-500" />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          The schedule uses FSRS, a modern spaced-repetition algorithm. You do
          not grade yourself. Hearers grades each clause from the words you
          get right.
        </p>
        <p className="mt-10">
          <a
            href={APP_URL}
            className="text-base font-medium text-brand-600 hover:text-brand-800"
          >
            Start with the first question{' '}
            <span aria-hidden="true">&rarr;</span>
          </a>
        </p>
      </Container>
    </section>
  )
}
