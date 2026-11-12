import type { Settings } from './db.ts'
import { dueUnits, type DueUnit } from './srs.ts'
import { unitsReviewedToday } from './stats.ts'

/** Units to review now, within the daily limit. */
export async function reviewQueue(settings: Settings): Promise<{ due: DueUnit[]; held: number }> {
  const all = await dueUnits()
  if (!settings.dailyReviewLimit) return { due: all, held: 0 }
  const left = Math.max(0, settings.dailyReviewLimit - (await unitsReviewedToday()))
  return { due: all.slice(0, left), held: Math.max(0, all.length - left) }
}
