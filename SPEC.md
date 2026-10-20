# Catechize: spec

An offline-first app for memorising and studying the Reformed confessions,
catechisms, creeds and Scripture.

## The problem it solves

Flashcards that test a whole catechism answer fail as the answers get
longer: one missed phrase fails the card, so the schedule is always wrong
and long answers never stick. Catechize schedules **chunks** (clauses of
about 4–12 words) independently and only asks for the whole answer once
every chunk is stable.

## Data model

```
Document  (WSC, WLC, WCF, HC, BC, Dort, creeds, Decalogue, My verses)
 ├─ groups[]      sections for browsing (WCF chapters, HC Lord's Days, …)
 └─ units[]       one memorisable text
     ├─ ref, prompt     "Q. 33", "What is justification?"
     ├─ text
     ├─ chunks[]        [start, end) offsets into text
     ├─ proofs[]        { span, refs[] }: each footnote attached to its phrase
     └─ notes[]         { span, refs[], hymn?, parallel? }: annotations
Harmony   side-by-side table of phrases or units across documents
```

Every span is a character range in the unit's text, so chunks, proof texts
and annotations all address the same string. Scripture references are
normalised to compact OSIS-style ids (`Rom.8.28-30`) and checked against
the KJV at build time; the build fails loudly (as warnings) on anything
that does not resolve.

Generated files live in `public/data/`:
`index.json`, `docs/<id>.json`, `harmonies/<id>.json`, `kjv/<Book>.json`.

## Chunking

`src/lib/chunk.ts` picks cut points by shortest path over word boundaries:

- chunk cost rises with distance from 8 words, steeply past 14;
- a cut after `. ; : ? !` is free, after `,` cheap, before a conjunction
  dearer, mid-phrase dearest;
- footnote positions and annotated-phrase boundaries get a small discount,
  since they mark the authors' own clause breaks.

Chunking is deterministic, so card ids (`<unitId>#<chunkIndex>`) are
stable across builds unless a text or the algorithm changes.

## Drill

| Stage  | What the learner sees | Graded |
|--------|-----------------------|--------|
| Read   | Whole text, chunk boundaries tinted; "Listen" uses device TTS | no |
| Trace  | Words shown faintly; type through | no |
| Recall | Tested chunks blank; others shown dimmed as context | yes, per chunk |

Input modes: **first letters** (default; one key per word) or **whole
words** (checked on space). Three wrong keys on a word, or "Show word",
reveal it.

Grading is automatic: per chunk, 0 errors = Good, 1 error (or ≤10%) = Hard,
more or any reveal = Again. No self-rating.

## Scheduling

FSRS (`ts-fsrs`), target retention 90% (configurable to 85/95%).

- Learning a unit creates one card per chunk and records the first recall.
- Reviews hide only the due chunks of a unit.
- When every chunk has stability ≥ 14 days, a **whole** card unlocks:
  recite the full text with nothing showing. Chunks that fail during a
  whole recitation are sent back through their own reviews.
- Courses: work through a document in order at N new units/day.
- Optional: no new material on the Lord's Day, reviews only.

All learner state is in IndexedDB on the device; Settings exports and
imports a JSON backup.

## Content (built)

| Doc | Units | Proof texts | Source |
|-----|-------|-------------|--------|
| Westminster Shorter Catechism | 107 | OPC footnotes, aligned onto the 1647 text | Creeds.json + hubot-wsc |
| Westminster Larger Catechism | 196 | yes | Creeds.json |
| Westminster Confession (1646) | 172 sections | yes | Creeds.json |
| Ten Commandments | 16 | Deut. 5 parallels | KJV Exod. 20, Reformed numbering, short + full forms |
| Apostles' Creed | 3 articles | phrase-level, with hymns | Luke's annotated harmony |
| Nicene Creed | 3 articles | phrase-level, with hymns | Luke's annotated harmony |
| Athanasian Creed | 22 sections | – | Creeds.json |
| Chalcedonian Definition | 1 | – | Creeds.json |
| Heidelberg Catechism | 129, by Lord's Day | yes | Creeds.json |
| Belgic Confession | 37 | – | Creeds.json |
| Canons of Dort | 93 articles + rejections | inline in text | Creeds.json |
| My verses | learner-added | – | KJV, from any proof text |

Harmonies: Apostles' ↔ Nicene phrase by phrase (Scripture + hymn per row);
each commandment ↔ WSC / WLC / Heidelberg questions.

### Licensing

Private use only for now. Before any public release:

- **Heidelberg**: upstream text appears to be the Canadian Reformed *Book of
  Praise* translation (copyright). Swap for Schaff (1877).
- **Belgic**: upstream text appears to be the CRC 1985 translation
  (copyright). Swap for a public-domain translation.
- **WSC proof texts**: the OPC's footnote selection. References are facts,
  but confirm before publishing or switch to the 1648 Assembly proofs.
- **Nicene wording**: from the annotated docx (LSB-style); confirm the
  source and its terms.
- Hymn references are titles and numbers only (Rejoice!, LSB).

## Roadmap

**Next**

1. **Reading plans**: Bible in a year (M'Cheyne, cover to cover,
   chronological) and in 2–3 years via a pace setting on the same plan.
   Catch-up options: shift the schedule, spread missed days over a week, or
   skip. Today's reading marks verses that are proof texts ("WSC 33,
   WCF 11.1") and long-press adds a verse to My verses.
2. **Lord's Prayer** (Matt. 6:9–13 KJV) with WSC 98–107 and HC LD 45–52,
   completing Creed / Commandments / Prayer.
3. **Spoken recitation**: on-device speech-to-text, scored with the
   existing word diff (`diffWords`).
4. **More drill modes**: cloze by phrase; chain recall (given chunk *n*,
   produce *n*+1).

**Later**

- Topical harmony across WSC / WLC / WCF / HC / BC / Dort (e.g.
  justification: WSC 33, WLC 70–71, WCF 11, HC 59–64, BC 22–23).
- Public-domain commentary per unit: Watson's *Body of Divinity* and
  Fisher's *Catechism* (WSC), Ursinus (HC), Shaw and A. A. Hodge (WCF).
- WCF 1646 vs American revision (chapters 20, 23, 31) side by side.
- Children's / First Catechism; metrical psalms (1650 Scottish Psalter).
- Polity: Form of Presbyterial Church Government, Directory for Public
  Worship, a denomination's Book of Church Order.
- Sync between devices (currently export/import).

Out of scope by decision: household and congregation features.
