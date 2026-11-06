import { Container } from '@/components/Container'
import {
  Expandable,
  ExpandableButton,
  ExpandableItems,
} from '@/components/Expandable'
import { SectionHeading } from '@/components/SectionHeading'
import { countLabel, docs, type Tradition } from '@/lib/site'

const groups: { tradition: Tradition; title: string; note: string }[] = [
  {
    tradition: 'common',
    title: 'The creeds',
    note: 'For every tradition. The Apostles’ and Nicene Creeds come phrase by phrase, with proof texts and hymns.',
  },
  {
    tradition: 'reformed',
    title: 'Reformed',
    note: 'The Westminster Standards and the Three Forms of Unity, with the proof texts of the Assembly.',
  },
  {
    tradition: 'lutheran',
    title: 'Lutheran',
    note: 'Luther’s catechisms in the Triglot Concordia translation (1921).',
  },
]

export function Contents() {
  return (
    <section
      id="contents"
      aria-labelledby="contents-title"
      className="scroll-mt-14 py-16 sm:scroll-mt-32 sm:py-20 lg:py-32"
    >
      <Container>
        <SectionHeading number="1" id="contents-title">
          Contents
        </SectionHeading>
        <p className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900">
          The confession of your church, and the creeds that every church
          shares.
        </p>
        <p className="mt-4 text-lg tracking-tight text-slate-700">
          Choose Reformed or Lutheran when you start, or show both. The creeds
          and Scripture are always there. You can change your choice at any
          time.
        </p>
        <Expandable>
          <ol role="list" className="mt-16 space-y-10 sm:space-y-16">
            <ExpandableItems limit={2}>
              {[
                ...groups.map((g) => (
                  <li key={g.title}>
                    <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                      {g.title}
                    </h3>
                    <p className="mt-2 text-base tracking-tight text-slate-600">
                      {g.note}
                    </p>
                    <ol
                      role="list"
                      className="mt-6 divide-y divide-slate-300/30 rounded-2xl bg-slate-50 px-6 py-3 text-base tracking-tight sm:px-8 sm:py-7"
                    >
                      {docs
                        .filter((d) => d.tradition === g.tradition)
                        .map((d) => (
                          <li
                            key={d.id}
                            className="flex justify-between gap-4 py-3"
                          >
                            <span className="font-medium text-slate-900">
                              {d.title}
                              {d.year && (
                                <span className="ml-2 font-normal text-slate-500">
                                  {d.year}
                                </span>
                              )}
                            </span>
                            <span className="flex-none font-mono text-slate-400">
                              {countLabel(d)}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </li>
                )),
                <li key="scripture">
                  <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                    Scripture
                  </h3>
                  <p className="mt-2 text-base tracking-tight text-slate-600">
                    Add any verse or passage from a proof text, and learn it
                    with the same method. The text is the King James Version.
                  </p>
                </li>,
              ]}
            </ExpandableItems>
          </ol>
          <ExpandableButton>See all</ExpandableButton>
        </Expandable>
      </Container>
    </section>
  )
}
