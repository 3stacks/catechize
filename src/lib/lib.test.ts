import { describe, expect, it } from 'vitest'
import { chunk, MAX_WORDS } from './chunk.ts'
import { diffWords, errorCount, gradeChunk, scoreSpoken, soundsLike, tokenize, AGAIN, GOOD, HARD } from './grade.ts'
import { formatPassage, parseOsis, parseRefs, passageFromId, passageId } from './refs.ts'

const ids = (s: string) => parseRefs(s).passages.map(passageId)

describe('parseRefs', () => {
  it('carries book and chapter forward', () => {
    expect(ids('Job 4:17, 35:10, Is. 17:7, 54:5')).toEqual(['Job.4.17', 'Job.35.10', 'Isa.17.7', 'Isa.54.5'])
    expect(ids('II Pet.1:20-21; 3:2, 15-16')).toEqual(['2Pet.1.20-21', '2Pet.3.2', '2Pet.3.15-16'])
  })
  it('handles roman numerals without eating Isaiah', () => {
    expect(ids('I Cor. 6:20; 10:31')).toEqual(['1Cor.6.20', '1Cor.10.31'])
    expect(ids('Isa. 60:21')).toEqual(['Isa.60.21'])
  })
  it('reads a bare number after ";" as a chapter', () => {
    expect(ids('Ps. 103:1-5; 136')).toEqual(['Ps.103.1-5', 'Ps.136'])
    expect(ids('ICor. 2:10, 12')).toEqual(['1Cor.2.10', '1Cor.2.12'])
  })
  it('reads "with" as a separator', () => {
    expect(ids('Matt. 19:4-5 with Gen. 2:24')).toEqual(['Matt.19.4-5', 'Gen.2.24'])
  })
  it('treats bare numbers in one-chapter books as verses', () => {
    expect(ids('Jude 17, 21')).toEqual(['Jude.1.17', 'Jude.1.21'])
  })
  it('handles cross-chapter ranges and abbreviations', () => {
    expect(ids('Mt. 25:31-46, 1 Thes. 4:16, Jas 2:19, Tit. 3:5')).toEqual([
      'Matt.25.31-46',
      '1Thess.4.16',
      'Jas.2.19',
      'Titus.3.5',
    ])
    expect(ids('Gen. 1:1-2:3')).toEqual(['Gen.1.1-2.3'])
  })
  it('flags impossible chapters instead of guessing', () => {
    const r = parseRefs('Phil. 3, 25')
    expect(r.errors.length).toBeGreaterThan(0)
  })
})

describe('OSIS', () => {
  it('parses Creeds.json ids', () => {
    expect(parseOsis('Rom.11.36').map(passageId)).toEqual(['Rom.11.36'])
    expect(parseOsis('Heb.8-Heb.10').map(passageId)).toEqual(['Heb.8-10'])
    expect(parseOsis('Luke.16.29,Luke.16.31').map(passageId)).toEqual(['Luke.16.29', 'Luke.16.31'])
    expect(parseOsis('Ps.73.24-Ps.73.28').map(passageId)).toEqual(['Ps.73.24-28'])
    expect(parseOsis('Gen.1.1-Gen.2.3').map(passageId)).toEqual(['Gen.1.1-2.3'])
  })
  it('round-trips ids and formats for display', () => {
    for (const id of ['Rom.8.28-30', 'Gen.1.1-2.3', 'Ps.23', 'Jude.1.3'])
      expect(passageId(passageFromId(id)!)).toBe(id)
    expect(formatPassage(passageFromId('Jude.1.3')!)).toBe('Jude 3')
    expect(formatPassage(passageFromId('Rom.8.28-30')!)).toBe('Romans 8:28–30')
  })
})

describe('chunk', () => {
  const wsc33 =
    "Justification is an act of God's free grace, wherein he pardoneth all our sins, and accepteth us as righteous in his sight, only for the righteousness of Christ imputed to us, and received by faith alone."
  it('splits at clause punctuation and keeps chunks within bounds', () => {
    const spans = chunk(wsc33)
    const parts = spans.map(([s, e]) => wsc33.slice(s, e))
    expect(parts[0]).toBe("Justification is an act of God's free grace,")
    for (const p of parts) expect(p.split(' ').length).toBeLessThanOrEqual(MAX_WORDS)
    expect(parts.join(' ')).toBe(wsc33)
  })
  it('merges tiny fragments', () => {
    const t = 'Thou shalt not kill.'
    expect(chunk(t)).toEqual([[0, t.length]])
  })
  it('honours preferred cuts', () => {
    const t = "Man's chief end is to glorify God, and to enjoy him for ever."
    const parts = chunk(t, [t.indexOf(', and') + 1]).map(([s, e]) => t.slice(s, e))
    expect(parts).toEqual(["Man's chief end is to glorify God,", 'and to enjoy him for ever.'])
  })
})

describe('grading', () => {
  it('tokenises with offsets and folds punctuation', () => {
    const t = tokenize('neighbour’s house, thou')
    expect(t.map((x) => x.norm)).toEqual(["neighbour's", 'house', 'thou'])
    expect(t[1].start).toBe(12)
  })
  it('diffs words and counts errors', () => {
    const ops = diffWords('to glorify God and to enjoy him'.split(' '), 'to glorify God and enjoy him forever'.split(' '))
    expect(ops.filter((o) => o.kind === 'missing').map((o) => (o as { expected: string }).expected)).toEqual(['to'])
    expect(errorCount(ops)).toBe(2)
  })
  it('maps errors to ratings', () => {
    expect(gradeChunk(0, 8, false)).toBe(GOOD)
    expect(gradeChunk(1, 8, false)).toBe(HARD)
    expect(gradeChunk(3, 8, false)).toBe(AGAIN)
    expect(gradeChunk(0, 8, true)).toBe(AGAIN)
  })
})

describe('spoken recall', () => {
  it('forgives spelling the recogniser chooses', () => {
    expect(soundsLike('Saviour', 'savior')).toBe(true)
    expect(soundsLike('baptised', 'baptized')).toBe(true)
    expect(soundsLike("God's", 'gods')).toBe(true)
    expect(soundsLike('righteousness', 'rightiousness')).toBe(true)
    expect(soundsLike('man', 'men')).toBe(false) // short words must match
  })
  it('marks the words that were said, ignoring filler', () => {
    const expected = "Man's chief end is to glorify God".split(' ')
    expect(scoreSpoken(expected, 'mans chief um end is to glorify god')).toEqual([true, true, true, true, true, true, true])
    expect(scoreSpoken(expected, 'mans chief end is glorify god')).toEqual([true, true, true, true, false, true, true])
  })
})
