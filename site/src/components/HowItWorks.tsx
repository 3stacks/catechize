import Image, { type StaticImageData } from 'next/image'

import { Container } from '@/components/Container'
import { SectionHeading } from '@/components/SectionHeading'
import readImage from '@/images/screens/read.png'
import traceImage from '@/images/screens/trace.png'
import fadeImage from '@/images/screens/fade.png'
import recallImage from '@/images/screens/recall.png'

const stages: { title: string; description: string; image: StaticImageData; alt: string }[] = [
  {
    title: 'Read',
    description:
      'Read the whole answer. Tints show where each clause starts. Tap Listen to hear it.',
    image: readImage,
    alt: 'The read stage, with the clauses of the answer tinted',
  },
  {
    title: 'Trace',
    description:
      'Type through the answer with the words shown faintly. One key for each word.',
    image: traceImage,
    alt: 'The trace stage, with faint words and the current word outlined',
  },
  {
    title: 'Fade',
    description:
      'Half the words go. Type the answer again, and fill the gaps from memory.',
    image: fadeImage,
    alt: 'The fade stage, with every other word hidden',
  },
  {
    title: 'Recall',
    description:
      'Every word goes. Type the answer or say it aloud. Each clause gets its own grade.',
    image: recallImage,
    alt: 'The recall stage, with the answer hidden and two clauses graded',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="2" id="how-it-works-title">
          How it works
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          Four steps take a new answer from the page into your memory.
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          A review starts at the last step. It hides only the clauses that are
          due, and it shows the rest as context.
        </p>
      </Container>
      <Container size="lg" className="mt-16">
        <ol
          role="list"
          className="grid grid-cols-1 gap-x-8 gap-y-10 [counter-reset:stage] sm:grid-cols-2 lg:grid-cols-4"
        >
          {stages.map((stage) => (
            <li key={stage.title} className="[counter-increment:stage]">
              <div className="relative flex h-56 items-start justify-center overflow-hidden rounded-2xl bg-brand-600 px-6 pt-6 shadow-lg">
                <Image
                  src={stage.image}
                  alt={stage.alt}
                  className="w-full rounded-t-lg shadow-md"
                  sizes="(min-width: 1024px) 18rem, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <h3 className="mt-8 text-base font-medium tracking-tight text-slate-900 before:mb-2 before:block before:font-mono before:text-sm before:text-slate-500 before:content-[counter(stage,decimal-leading-zero)]">
                {stage.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{stage.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
