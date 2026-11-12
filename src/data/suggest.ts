import { loadUnit } from './load.ts'
import { passageFromId, type Passage } from '../lib/refs.ts'
import { db, getSettings } from '../store/db.ts'

export interface Suggestion {
  id: string // passage id
  passage: Passage
  /** Where the proof text comes from, for example "WSC Q. 1". */
  from: string
}

const SHORT: Record<string, string> = { wsc: 'WSC', wlc: 'WLC', hc: 'Heidelberg', wcf: 'WCF', lsc: 'Small Catechism', llc: 'Large Catechism', bc: 'Belgic', dort: 'Dort' }

/**
 * Proof texts of the answers the learner has learned, newest first. Before the
 * learner learns anything, the proof texts of the first catechism questions.
 */
export async function suggestions(have: Set<string>, max = 6): Promise<Suggestion[]> {
  const learned = await db.learned.orderBy('at').reverse().limit(30).toArray()
  let from = learned.filter((l) => l.docId !== 'verses').map((l) => ({ docId: l.docId, unitId: l.unitId }))
  if (!from.length) {
    const lutheran = (await getSettings()).tradition === 'lutheran'
    from = lutheran ? [{ docId: 'lsc', unitId: 'lsc-1' }] : [1, 2, 3].map((n) => ({ docId: 'wsc', unitId: `wsc-${n}` }))
  }
  // Up to two proof texts from each answer, so the list covers several answers.
  const out: Suggestion[] = []
  const seen = new Set<string>()
  for (const { docId, unitId } of from) {
    const unit = await loadUnit(docId, unitId).catch(() => undefined)
    if (!unit) continue
    let taken = 0
    for (const id of unit.proofs.flatMap((p) => p.refs)) {
      const passage = passageFromId(id)
      // Whole chapters are too long to memorise as one passage.
      if (!passage || passage.v1 === 0 || seen.has(id) || have.has(`kjv-${id}`)) continue
      seen.add(id)
      out.push({ id, passage, from: `${SHORT[docId] ?? docId.toUpperCase()} ${unit.ref}` })
      if (out.length >= max) return out
      if (++taken === 2) break
    }
  }
  return out
}
