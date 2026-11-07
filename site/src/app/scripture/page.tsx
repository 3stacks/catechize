import { SectionIndex, sectionMetadata } from '@/components/DocContent'

export const metadata = sectionMetadata('scripture')

export default function Page() {
  return <SectionIndex section="scripture" />
}
