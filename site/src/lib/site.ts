import index from '../../../public/data/index.json'

export const APP_URL = '/app/'
export const SELF_HOST_URL = '/docs/self-hosting/'
export const REPO_URL = 'https://github.com/3stacks/catechize'
export const KOFI_URL = 'https://ko-fi.com/lukeboyle'

export type Tradition = 'common' | 'reformed' | 'lutheran'

export interface DocSummary {
  id: string
  title: string
  short: string
  kind: string
  tradition: Tradition
  year?: string
  unitCount: number
}

export const docs = index.docs as DocSummary[]

const unitWord: Record<string, [string, string]> = {
  catechism: ['question', 'questions'],
  confession: ['section', 'sections'],
  creed: ['part', 'parts'],
  law: ['text', 'texts'],
}

export function countLabel(d: DocSummary) {
  // The Large Catechism and Luther's Small Catechism are not question-by-question.
  if (d.id === 'llc') return `${d.unitCount} paragraphs`
  if (d.id === 'lsc') return `${d.unitCount} parts`
  const [one, many] = unitWord[d.kind] ?? ['part', 'parts']
  return `${d.unitCount} ${d.unitCount === 1 ? one : many}`
}
