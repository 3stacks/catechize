import type { Tradition } from '../data/types.ts'

export type TraditionChoice = 'reformed' | 'lutheran' | 'both'

/**
 * Creeds and Scripture show for everyone; the rest follows the learner's
 * tradition. Before the learner chooses, everything shows.
 */
export const inTradition = (t: Tradition, choice: TraditionChoice | undefined) =>
  t === 'common' || !choice || choice === 'both' || t === choice
