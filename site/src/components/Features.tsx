import Image, { type StaticImageData } from 'next/image'

import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import proofsImage from '@/images/screens/proofs.png'
import progressImage from '@/images/screens/progress.png'
import troubleImage from '@/images/screens/trouble.png'

const features: { title: string; description: string; image: StaticImageData; alt: string }[] = [
  {
    title: 'Proof texts in place',
    description:
      'Catechize attaches each proof text to the phrase that it supports. Tap the phrase to read the passage. Add any verse to your own list.',
    image: proofsImage,
    alt: 'A phrase of an answer with its proof texts open below it',
  },
  {
    title: 'Progress you can see',
    description:
      'A streak, a grid of your review days, and a forecast of the answers due in the next two weeks.',
    image: progressImage,
    alt: 'The progress page with a streak, an activity grid and a forecast',
  },
  {
    title: 'Help where you slip',
    description:
      'Catechize finds the clauses that you forget again and again. Practise them on their own, and add a memory aid to the answer.',
    image: troubleImage,
    alt: 'An answer with a memory aid and a trouble spot',
  },
]

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-14 overflow-x-clip py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="3" id="features-title">
          Features
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Memorise the words, and know where they come from.
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          The Shorter Catechism is 107 answers. That is a long road. These
          tools keep you on it.
        </p>
      </Container>
      <Container size="lg" className="mt-16">
        <ol
          role="list"
          className="-mx-3 grid grid-cols-1 gap-y-10 lg:grid-cols-3 lg:text-center xl:-mx-12 xl:divide-x xl:divide-slate-400/20"
        >
          {features.map((feature) => (
            <li
              key={feature.title}
              className="grid auto-rows-min grid-cols-1 items-center gap-8 px-3 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-1 xl:px-12"
            >
              <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-100 shadow-lg sm:h-60 lg:h-56">
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  sizes="(min-width: 1280px) 21rem, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div>
                <h3 className="text-base font-medium tracking-tight text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
